/**
 * WebSocket Connection Stability — smoke test
 *
 * Verifies that neither the Vite HMR WebSocket nor the game WebSocket
 * drop and reconnect during a 60-second idle session.
 *
 * Three independent failure signals are detected:
 *
 *  1. HMR socket — browser console "[vite] connecting" after page load.
 *     Vite's client logs this every time the HMR socket re-establishes.
 *     The keepalive plugin (hmrPongReply + hmr.timeout:10000 in vite.config.ts)
 *     prevents the Replit proxy from closing the HMR socket after 30 s idle.
 *
 *  2. Game socket (immediate) — use-game-websocket.ts emits a
 *     console.warn("[luminae] game WebSocket closed unexpectedly …") inside
 *     onclose.  This fires as soon as the socket drops — before the reconnect
 *     attempt opens a new WebSocket — giving the earliest possible signal.
 *     Because intentional cleanup nullifies ws.onclose before calling
 *     ws.close(), this handler only fires for unexpected drops.
 *
 *  3. Game socket (CDP) — Playwright's page.on('websocket') intercepts every
 *     /ws WebSocket open at the browser level.  If the game socket closes and
 *     reconnects during the idle period, a second open will be detected even
 *     for clean proxy-idle drops that trigger onclose (not onerror).
 *
 * All three signals indicate a proxy-idle timeout regression: Replit's reverse
 * proxy drops WebSocket connections after ~30 s of bidirectional silence.
 * The keepalive mechanisms (10-second bidirectional ping/pong on both sockets)
 * prevent this.  If either breaks, this test will catch it within 30–90 s.
 *
 * ── Proxy path coverage ───────────────────────────────────────────────────────
 *
 * This test connects via localhost:80 (the local nginx reverse proxy).  That
 * path validates the keepalive works through the local proxy and is sufficient
 * for CI and developer machines.
 *
 * The Replit workspace preview iframe uses an ADDITIONAL external proxy at
 * janeway.replit.dev.  That path has historically had a shorter (~25-30 s)
 * fixed WS lease than the local proxy.  This test CANNOT reach the external
 * proxy from inside the container (Playwright's browser also connects via
 * localhost:80 when run headless inside the Repl).  When REPLIT_DEV_DOMAIN is
 * set, a console.info note is emitted at test end so developers know the
 * external path was not verified by this run.  The server-side ws.ping()
 * protocol PING frames (added in websocket.ts) are the keepalive mechanism
 * that targets the external proxy; the localhost:80 test validates the frame
 * interval is firing.
 *
 * To verify the EXTERNAL proxy path, use the standalone probe script:
 *
 *   WS_PROBE_TARGET=https://<your-domain> \
 *     pnpm --filter @workspace/scripts run probe:ws-external
 *
 * The probe connects from outside the container (e.g. a GitHub Actions runner)
 * and exercises the actual janeway.replit.dev / deployment proxy lease.  A
 * scheduled GitHub Actions workflow at .github/workflows/ws-external-probe.yml
 * runs this check every 6 hours against the deployed app and opens a GitHub
 * issue automatically if the connection drops before 60 s.
 *
 * Run:
 *   pnpm --filter @workspace/scripts run test:ws-keepalive
 */

import { test, expect, type Page } from 'playwright/test';
import { mkdirSync } from 'node:fs';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = 'http://localhost:80';
const OUT  = '/tmp/ws-keepalive';

/** How long to idle and monitor after the game loads (ms). */
const IDLE_MS = 60_000;

/**
 * HMR console patterns that indicate the Vite HMR socket dropped and
 * re-established.  "[vite] connecting" is emitted by Vite's client on every
 * initial page load AND on each reconnect, so the test only starts capturing
 * console messages AFTER the game page is fully loaded — by then the initial
 * "[vite] connecting" / "[vite] connected." sequence has already fired.
 */
const HMR_BAD_PATTERNS: ReadonlyArray<RegExp> = [
  /\[vite\] connecting/i,
];

/**
 * Game WS console patterns emitted by use-game-websocket.ts whenever
 * the game socket closes unexpectedly (i.e. via onclose, not via the
 * intentional cleanup path that nullifies the handler first).
 *
 * This gives an IMMEDIATE signal — logged as soon as onclose fires, before
 * the reconnect attempt opens a new WebSocket.  Together with the CDP
 * page.on('websocket') reconnect counter it provides two independent
 * detection paths for unexpected game socket drops.
 */
const GAME_WS_BAD_PATTERNS: ReadonlyArray<RegExp> = [
  /\[luminae\] game WebSocket closed unexpectedly/i,
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Create a 2-player room (host + 1 easy AI), start the game, and return
 * the session details needed to join as the human host.
 */
async function createAndStartGame() {
  const { room, player, sessionToken } = (await apiPost('/api/rooms', {
    hostName: 'WsStability-Test',
    maxPlayers: 2,
    turnTimerSeconds: null,
  })) as {
    room: { id: string; inviteCode: string };
    player: { id: string };
    sessionToken: string;
  };

  await apiPost(`/api/rooms/${room.id}/ai-players`, { sessionToken, difficulty: 'easy' });
  await apiPost(`/api/rooms/${room.id}/start`, { sessionToken });

  return { room, player, sessionToken };
}

/**
 * Navigate to the game page as the human host player.
 * Injects the session into localStorage before loading the route so the
 * app authenticates immediately and opens the /ws WebSocket connection.
 */
async function navigateToGame(
  page: Page,
  room: { id: string; inviteCode: string },
  player: { id: string },
  sessionToken: string,
): Promise<void> {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ roomId, inviteCode, playerId, token }) => {
      localStorage.setItem(
        'luminae_session',
        JSON.stringify({
          roomId,
          inviteCode,
          playerId,
          sessionToken: token,
          playerName: 'WsStability-Test',
          isHost: true,
          avatarId: 'avatar_1',
        }),
      );
    },
    { roomId: room.id, inviteCode: room.inviteCode, playerId: player.id, token: sessionToken },
  );

  await page.goto(`${BASE}/game/${room.id}`, { waitUntil: 'domcontentloaded' });
  // Wait for the game board to be visible — confirms both the React app and
  // the /ws socket are connected before the idle countdown begins.
  await expect(page.locator('text=AFFINITY WELL').first()).toBeVisible({ timeout: 20_000 });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

// ── Test ──────────────────────────────────────────────────────────────────────

test('game and HMR WebSockets stay connected for 60 s with no idle reconnect', async ({ page }) => {
  const { room, player, sessionToken } = await createAndStartGame();

  // ── Game-socket reconnect monitor ─────────────────────────────────────────
  // page.on('websocket') intercepts WebSocket open events at the Playwright
  // (CDP) level — no console.log required in the application.  A clean
  // proxy-idle drop triggers onclose (not onerror) and causes the game hook
  // to reconnect; that reconnect opens a NEW WebSocket and triggers a second
  // 'websocket' event here.
  //
  // We track whether the game WS opened at all (for the baseline assertion)
  // and count any ADDITIONAL opens during the idle period as reconnects.
  let gameWsInitiallyConnected = false;
  let gameWsReconnectsDuringIdle = 0;
  let idleMonitoringActive = false;

  page.on('websocket', (ws) => {
    // Only care about the game WS at /ws — ignore HMR or other sockets.
    if (!ws.url().includes('/ws?')) return;

    if (!idleMonitoringActive) {
      // This is the initial /ws connection during page load — expected.
      gameWsInitiallyConnected = true;
    } else {
      // A new /ws connection opened AFTER idle monitoring started — reconnect.
      gameWsReconnectsDuringIdle++;
    }
  });

  // Navigate and wait for the game board to render (initial WS connects here).
  await navigateToGame(page, room, player, sessionToken);

  // Brief settle: let the HMR "[vite] connected." and startup console noise
  // finish.  Also ensures the initial /ws open has been seen before we flip
  // the idle-monitoring flag.
  await page.waitForTimeout(2_000);

  // Verify the initial /ws connection happened.
  expect(gameWsInitiallyConnected, 'game WebSocket should connect on page load').toBe(true);

  // Take a baseline screenshot.
  await page.screenshot({ path: `${OUT}/01-game-loaded.png` });

  // ── Begin idle monitoring ─────────────────────────────────────────────────
  // Activate the reconnect counter.  Any /ws WebSocket opened after this
  // point is an unexpected reconnect.
  idleMonitoringActive = true;

  // Capture console messages during the idle period.  The listener is
  // registered AFTER navigation so the initial "[vite] connecting..." from
  // page load is NOT included; only idle-period messages are captured.
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    consoleMessages.push(msg.text());
  });

  // ── Idle period ───────────────────────────────────────────────────────────
  // Do nothing for IDLE_MS.  Both the Vite HMR socket (10 s ping/pong via
  // hmrPongReply plugin) and the game /ws socket (10 s ping/pong in
  // websocket.ts) must keep firing to prevent the Replit proxy from closing
  // the connections.  Any reconnect will surface as a bad console message or
  // an additional WebSocket open event.
  await page.waitForTimeout(IDLE_MS);

  // Take a post-idle screenshot to confirm the game is still rendered.
  await page.screenshot({ path: `${OUT}/02-after-idle.png` });

  // ── Assertions ────────────────────────────────────────────────────────────

  // 1. HMR socket: no "[vite] connecting" after page-load settle.
  const hmrBadMessages = consoleMessages.filter((msg) =>
    HMR_BAD_PATTERNS.some((pat) => pat.test(msg)),
  );
  expect(
    hmrBadMessages,
    [
      `HMR socket: detected ${hmrBadMessages.length} reconnect(s) during the ${IDLE_MS / 1000}s idle period.`,
      'This indicates the hmrPongReply plugin failed to keep the HMR WebSocket alive.',
      '',
      'Reconnect messages:',
      ...hmrBadMessages.map((m) => `  • ${m}`),
      '',
      'Check the hmrPongReply plugin in artifacts/luminae/vite.config.ts.',
    ].join('\n'),
  ).toHaveLength(0);

  // 2. Game socket (immediate signal): no unexpected onclose warning logged by
  //    use-game-websocket.ts.  This fires as soon as the socket drops — before
  //    the reconnect attempt opens a new WebSocket — giving earlier detection
  //    than the CDP reconnect counter below.
  const gameWsBadMessages = consoleMessages.filter((msg) =>
    GAME_WS_BAD_PATTERNS.some((pat) => pat.test(msg)),
  );
  expect(
    gameWsBadMessages,
    [
      `Game socket (console): detected ${gameWsBadMessages.length} unexpected close(s) during the ${IDLE_MS / 1000}s idle period.`,
      'use-game-websocket.ts emitted a warning immediately on onclose.',
      'This indicates the game WebSocket keepalive (10-second ping/pong) failed',
      'and the Replit proxy dropped the connection after its idle timeout.',
      '',
      'Close messages:',
      ...gameWsBadMessages.map((m) => `  • ${m}`),
      '',
      'Check the ping interval in artifacts/luminae/src/hooks/use-game-websocket.ts',
      'and the pong handler in artifacts/api-server/src/lib/websocket.ts.',
    ].join('\n'),
  ).toHaveLength(0);

  // 3. Game socket (CDP signal): no /ws reconnect detected via WebSocket
  //    lifecycle events.  A new socket opening during the idle period confirms
  //    a drop-and-reconnect cycle completed.
  expect(
    gameWsReconnectsDuringIdle,
    [
      `Game socket (CDP): detected ${gameWsReconnectsDuringIdle} /ws reconnect(s) during the ${IDLE_MS / 1000}s idle period.`,
      'This indicates the game WebSocket keepalive (10-second ping/pong) failed',
      'and the Replit proxy dropped the connection after its idle timeout.',
      '',
      'Check the ping interval in artifacts/luminae/src/hooks/use-game-websocket.ts',
      'and the pong handler in artifacts/api-server/src/lib/websocket.ts.',
    ].join('\n'),
  ).toBe(0);

  // ── External proxy coverage note ──────────────────────────────────────────
  // When running inside the Replit container, REPLIT_DEV_DOMAIN is set but
  // Playwright's headless browser still routes through localhost:80 — it cannot
  // reach the external janeway.replit.dev proxy from inside the container.
  // Emit a runtime note so CI logs and developers know the external path was
  // not verified by this run.  The server-side ws.ping() protocol PINGs target
  // that proxy; this localhost:80 run confirms the keepalive interval is firing.
  if (process.env['REPLIT_DEV_DOMAIN']) {
    console.info(
      '[ws-keepalive] NOTE: REPLIT_DEV_DOMAIN is set, but Playwright connects via localhost:80 ' +
      '(same as CI). The external janeway.replit.dev proxy path was NOT verified by this run. ' +
      'The server-side ws.ping() frames in websocket.ts are the keepalive for that path.',
    );
  }
});
