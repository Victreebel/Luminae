/**
 * WebSocket Connection Stability — smoke test
 *
 * Verifies that neither the Vite HMR WebSocket nor the game WebSocket
 * drop and reconnect during a 60-second idle session.
 *
 * Two independent failure signals are detected:
 *
 *  1. HMR socket — browser console "[vite] connecting" after page load.
 *     Vite's client logs this every time the HMR socket re-establishes.
 *     The keepalive plugin (hmrPongReply + hmr.timeout:10000 in vite.config.ts)
 *     prevents the Replit proxy from closing the HMR socket after 30 s idle.
 *
 *  2. Game socket — Playwright's page.on('websocket') intercepts every /ws
 *     WebSocket open at the browser level.  If the game socket closes and
 *     reconnects during the idle period, a second open will be detected even
 *     for clean proxy-idle drops that trigger onclose (not onerror), without
 *     requiring any console.log in the application code.
 *
 * Both failures indicate a proxy-idle timeout regression: Replit's reverse
 * proxy drops WebSocket connections after ~30 s of bidirectional silence.
 * The keepalive mechanisms (10-second bidirectional ping/pong on both sockets)
 * prevent this.  If either breaks, this test will catch it within 30–90 s.
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

  // 2. Game socket: no /ws reconnect detected via WebSocket lifecycle events.
  expect(
    gameWsReconnectsDuringIdle,
    [
      `Game socket: detected ${gameWsReconnectsDuringIdle} /ws reconnect(s) during the ${IDLE_MS / 1000}s idle period.`,
      'This indicates the game WebSocket keepalive (10-second ping/pong) failed',
      'and the Replit proxy dropped the connection after its idle timeout.',
      '',
      'Check the ping interval in artifacts/luminae/src/hooks/use-game-websocket.ts',
      'and the pong handler in artifacts/api-server/src/lib/websocket.ts.',
    ].join('\n'),
  ).toBe(0);
});
