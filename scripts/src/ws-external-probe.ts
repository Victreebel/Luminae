#!/usr/bin/env tsx
/**
 * ws-external-probe.ts
 *
 * Connects to the Luminae game's WebSocket endpoint via an external HTTPS/WSS
 * domain and verifies the connection remains stable for a configurable probe
 * duration (default 60 s).
 *
 * This script is designed to run from OUTSIDE the Replit container — e.g. a
 * GitHub Actions runner that can reach the deployed app at its public domain.
 * Running it from inside the container only exercises localhost:80 (the local
 * nginx proxy), NOT the external janeway.replit.dev proxy whose idle/lease
 * behaviour this probe is intended to catch.
 *
 * What it does:
 *   1. Creates a temporary 2-player room (host + 1 easy AI) via the REST API.
 *   2. Starts the game so the server opens a live WS session for the host.
 *   3. Connects to /ws as the host player via the external WSS URL.
 *   4. Idles for PROBE_DURATION_MS, watching for unexpected closes.
 *   5. Cleans up and reports PASS / FAIL with a clear exit code.
 *
 * Detection signals:
 *   - Unexpected `close` event before the probe duration elapses (any code).
 *   - `error` event on the socket.
 *   - Connection never opened (handshake timeout).
 *
 * Usage:
 *   WS_PROBE_TARGET=https://myapp.replit.dev \
 *     pnpm --filter @workspace/scripts run probe:ws-external
 *
 *   # Or directly with tsx:
 *   WS_PROBE_TARGET=https://myapp.replit.dev tsx scripts/src/ws-external-probe.ts
 *
 *   # Override probe duration (milliseconds):
 *   WS_PROBE_TARGET=https://myapp.replit.dev PROBE_DURATION_MS=90000 tsx scripts/src/ws-external-probe.ts
 *
 * Environment variables:
 *   WS_PROBE_TARGET    Required. Base HTTPS URL of the deployed app, e.g.
 *                      https://myapp.replit.dev  (no trailing slash).
 *   PROBE_DURATION_MS  Optional. How long to hold the connection open (ms).
 *                      Default: 60000 (60 s).
 *
 * Exit codes:
 *   0 — connection remained open for the full probe duration. PASS.
 *   1 — connection dropped unexpectedly, errored, or timed out. FAIL.
 *   2 — configuration error (missing WS_PROBE_TARGET). Usage error.
 */

// ── Config ────────────────────────────────────────────────────────────────────

const TARGET = (process.env['WS_PROBE_TARGET'] ?? '').replace(/\/$/, '');
const PROBE_DURATION_MS = Number(process.env['PROBE_DURATION_MS'] ?? 60_000);

/** WebSocket handshake must complete within this many ms or the probe fails. */
const CONNECT_TIMEOUT_MS = 15_000;

// ── Validation ────────────────────────────────────────────────────────────────

if (!TARGET) {
  console.error(
    '[ws-probe] ERROR: WS_PROBE_TARGET environment variable is required.\n' +
    '  Set it to the base HTTPS URL of the deployed app, e.g.:\n' +
    '    WS_PROBE_TARGET=https://myapp.replit.dev tsx scripts/src/ws-external-probe.ts',
  );
  process.exit(2);
}

// Derive WSS URL from the HTTPS target (wss:// for https://, ws:// for http://)
const WSS_BASE = TARGET.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiPost(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = `${TARGET}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)');
    throw new Error(`POST ${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}

// ── Probe ─────────────────────────────────────────────────────────────────────

async function runProbe(): Promise<void> {
  console.info(`[ws-probe] Target:          ${TARGET}`);
  console.info(`[ws-probe] Probe duration:  ${formatDuration(PROBE_DURATION_MS)}`);
  console.info(`[ws-probe] Connect timeout: ${formatDuration(CONNECT_TIMEOUT_MS)}`);
  console.info('');

  // ── Step 1: Create a temporary game room ──────────────────────────────────
  console.info('[ws-probe] Creating temporary game room …');

  const { room, player, sessionToken } = (await apiPost('/api/rooms', {
    hostName: 'ws-external-probe',
    maxPlayers: 2,
    turnTimerSeconds: null,
  })) as {
    room: { id: string; inviteCode: string };
    player: { id: string };
    sessionToken: string;
  };

  console.info(`[ws-probe] Room created:  ${room.id}`);
  console.info(`[ws-probe] Player ID:     ${player.id}`);

  // ── Step 2: Add AI + start game so the server accepts a WS connection ─────
  console.info('[ws-probe] Adding AI player and starting game …');
  await apiPost(`/api/rooms/${room.id}/ai-players`, { sessionToken, difficulty: 'easy' });
  await apiPost(`/api/rooms/${room.id}/start`, { sessionToken });
  console.info('[ws-probe] Game started.');

  // ── Step 3: Connect via WSS ────────────────────────────────────────────────
  const wsUrl = `${WSS_BASE}/ws?roomId=${encodeURIComponent(room.id)}&sessionToken=${encodeURIComponent(sessionToken)}`;
  console.info(`[ws-probe] Connecting to: ${wsUrl.replace(sessionToken, '<token>')}`);

  const probeResult = await new Promise<{ ok: boolean; reason: string }>((resolve) => {
    // Use the Node 24 native WebSocket global (no external dep needed).
    // If somehow running on an older Node, this will throw and the error will
    // surface clearly rather than silently failing.
    const ws = new WebSocket(wsUrl);

    let connected = false;
    let connectedAt = 0;
    let probeTimer: ReturnType<typeof setTimeout> | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;
    let statusInterval: ReturnType<typeof setInterval> | null = null;

    function cleanup() {
      if (connectTimer)   { clearTimeout(connectTimer);   connectTimer   = null; }
      if (probeTimer)     { clearTimeout(probeTimer);     probeTimer     = null; }
      if (statusInterval) { clearInterval(statusInterval); statusInterval = null; }
      // Null out event handlers before closing so no spurious events fire.
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'probe complete');
      }
    }

    connectTimer = setTimeout(() => {
      cleanup();
      resolve({ ok: false, reason: `WebSocket handshake did not complete within ${formatDuration(CONNECT_TIMEOUT_MS)}` });
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      connected = true;
      connectedAt = Date.now();
      if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }

      console.info(`[ws-probe] ✓ WebSocket opened. Holding for ${formatDuration(PROBE_DURATION_MS)} …`);

      // Emit periodic status so CI logs show the probe is alive.
      statusInterval = setInterval(() => {
        const elapsed = Date.now() - connectedAt;
        const remaining = Math.max(0, PROBE_DURATION_MS - elapsed);
        console.info(`[ws-probe]   … ${formatDuration(elapsed)} elapsed, ${formatDuration(remaining)} remaining`);
      }, 10_000);

      probeTimer = setTimeout(() => {
        cleanup();
        resolve({ ok: true, reason: `Connection stayed open for ${formatDuration(PROBE_DURATION_MS)}` });
      }, PROBE_DURATION_MS);
    };

    ws.onclose = (ev) => {
      const wasConnected = connected;
      const elapsedMs = wasConnected ? Date.now() - connectedAt : 0;
      cleanup();
      resolve({
        ok: false,
        reason: wasConnected
          ? `WebSocket closed unexpectedly after ${formatDuration(elapsedMs)} (code ${ev.code}, reason: "${ev.reason || 'none'}") — expected to stay open for ${formatDuration(PROBE_DURATION_MS)}`
          : `WebSocket closed before handshake completed (code ${ev.code}, reason: "${ev.reason || 'none'}")`,
      });
    };

    ws.onerror = (ev) => {
      cleanup();
      const msg = (ev as unknown as { message?: string }).message ?? 'unknown error';
      resolve({ ok: false, reason: `WebSocket error: ${msg}` });
    };

    // Absorb incoming messages — we do not need to validate game state,
    // only that the socket stays open.
    ws.onmessage = () => { /* intentionally empty */ };
  });

  // ── Step 4: Report result ────────────────────────────────────────────────
  // Note: the temporary room and AI player created above are not explicitly
  // deleted.  The room/player records persist in the database after the probe
  // completes.  This is acceptable for a periodic probe (one small record per
  // run, a few times per day), but operators running the probe very frequently
  // may want to add a DELETE /api/rooms/:id call here if the API supports it.
  console.info('');
  if (probeResult.ok) {
    console.info(`[ws-probe] ✅ PASS — ${probeResult.reason}`);
    console.info(`[ws-probe] Target: ${TARGET}`);
    console.info('[ws-probe] The external proxy path kept the WebSocket alive for the full probe duration.');
  } else {
    console.error(`[ws-probe] ❌ FAIL — ${probeResult.reason}`);
    console.error(`[ws-probe] Target: ${TARGET}`);
    console.error('[ws-probe] The WebSocket was dropped before the probe duration elapsed.');
    console.error('[ws-probe] Possible causes:');
    console.error('[ws-probe]   • The external proxy (janeway.replit.dev) hit its idle lease timeout.');
    console.error('[ws-probe]   • The server-side ws.ping() interval in websocket.ts is not firing.');
    console.error('[ws-probe]   • The deployed app is down or unreachable.');
    console.error('[ws-probe] Check artifacts/api-server/src/lib/websocket.ts (pingInterval).');
    process.exit(1);
  }
}

runProbe().catch((err: unknown) => {
  console.error('[ws-probe] ❌ FAIL — Probe threw an unexpected error:');
  console.error(err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
