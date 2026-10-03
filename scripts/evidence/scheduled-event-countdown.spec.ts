import { expect, test, type Page, type WebSocketRoute } from 'playwright/test';
import { initializeGame, formatGameState } from '../../artifacts/api-server/src/lib/gameEngine';
import { filterStateForPlayer } from '../../artifacts/api-server/src/lib/stateProjection';

test.setTimeout(45_000);

const roomId = 'scheduled-event-forecast-browser-test';
const humanId = 'forecast-human';
const opponentId = 'forecast-opponent';

async function openForecastGame(page: Page, turns: number) {
  const startupErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') startupErrors.push(message.text()); });
  page.on('pageerror', error => startupErrors.push(error.stack ?? error.message));
  const engine = initializeGame([
    { id: humanId, name: 'Forecast Human' },
    { id: opponentId, name: 'Forecast Opponent' },
  ], 2, 20, 'standard', { eventFrequency: 'standard' });
  engine.currentPlayerIndex = 1;
  engine.turnCount = 19;
  engine.roundNumber = 10;
  engine.version = 10;
  engine.openingTurnOrder = null;
  const forecast = {
    status: turns === 0 ? 'armed' : 'countdown',
    tier: 2,
    roundsRemaining: turns,
    turnsRemainingByPlayerId: { [humanId]: turns, [opponentId]: turns },
  };
  let state = {
    ...filterStateForPlayer(formatGameState(roomId, 'playing', engine, new Set([humanId, opponentId])), humanId),
    openingTurnOrder: null,
    eventDelivery: 'scheduled_forge_v1',
    eventForecast: forecast,
  };
  await page.addInitScript(({ roomId, humanId }) => {
    localStorage.setItem('luminae_session', JSON.stringify({
      roomId, inviteCode: 'FORECASTQA', playerId: humanId,
      sessionToken: 'forecast-test-session', playerName: 'Forecast Human', isHost: true,
    }));
    localStorage.setItem('luminae_muted', 'true');
    localStorage.setItem('luminae_hints_enabled', '0');
  }, { roomId, humanId });
  await page.route(`**/api/rooms/${roomId}/state?*`, route => route.fulfill({ json: state }));
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket('**/ws?*', route => {
    socket = route;
    route.onMessage(message => {
      if (typeof message === 'string' && JSON.parse(message).type === 'ping') {
        route.send(JSON.stringify({ type: 'pong' }));
      }
    });
  });
  await page.goto(`/game/${roomId}`);
  try {
    await expect(page.getByRole('button', { name: 'Civilization', exact: true })).toBeVisible();
  } catch (error) {
    throw new Error(`Game fixture failed to mount:\n${startupErrors.join('\n')}\n${String(error)}`);
  }
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => Boolean(socket)).toBe(true);
  return {
    async takeTurn() {
      state = {
        ...state, version: 11, turnCount: 20, currentPlayerIndex: 0,
        lastAction: { type: 'pass', playerId: opponentId },
      };
      socket!.send(JSON.stringify({ type: 'state_update', state }));
    },
    async repeatUpdate() {
      state = { ...state, version: state.version + 1 };
      socket!.send(JSON.stringify({ type: 'state_update', state }));
    },
  };
}

for (const turns of [3, 2, 1, 0]) {
  test(`own-turn introduction shows ${turns} filled Event dots without the full countdown`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const game = await openForecastGame(page, turns);
    await expect(page.getByTestId('event-turn-warning')).toHaveCount(0);
    await expect(page.getByTestId('civilization-event-forecast')).toHaveCount(0);
    await game.takeTurn();
    const warning = page.getByTestId('event-turn-warning');
    await expect(warning).toBeVisible();
    await expect(warning.locator('[data-event-dot="filled"]')).toHaveCount(turns);
    await expect(warning.locator('[data-event-dot="empty"]')).toHaveCount(3 - turns);
    await expect(page.getByTestId('civilization-event-forecast')).toHaveCount(0);
    await expect(page.getByTestId('turn-announcement')).toHaveCSS('opacity', '1');
    await page.waitForTimeout(1000); // Capture the steady reading phase, after the dot empties.
    await page.screenshot({ path: testInfo.outputPath(`event-warning-${turns}.png`) });
    await expect(warning).toHaveCount(0);
    await game.repeatUpdate();
    await page.waitForTimeout(350);
    await expect(warning).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`full Event forecast stays in Civilization at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const game = await openForecastGame(page, 4);
    await game.takeTurn();
    await expect(page.getByTestId('event-turn-warning')).toHaveCount(0);
    await expect(page.getByTestId('turn-announcement')).toBeVisible();
    await expect(page.getByTestId('turn-announcement')).toHaveCount(0);
    await page.getByRole('button', { name: 'Civilization', exact: true }).click();
    const forecast = page.getByTestId('civilization-event-forecast');
    await expect(forecast).toBeVisible();
    await forecast.scrollIntoViewIfNeeded();
    const bounds = (await forecast.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
    await page.screenshot({ path: testInfo.outputPath(`civilization-forecast-${viewport.width}.png`) });
    await page.getByRole('button', { name: 'Log', exact: true }).click();
    await expect(page.getByTestId('civilization-event-forecast')).toHaveCount(0);
    await expect(page.getByText('Possible Events', { exact: true })).toBeVisible();
  });
}

test('armed forecast explains the Forge trigger and reduced motion retains legible empty dots', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const game = await openForecastGame(page, 0);
  await game.takeTurn();
  const warning = page.getByTestId('event-turn-warning');
  await expect(warning).toBeVisible();
  await expect(warning.locator('[data-event-dot="empty"]')).toHaveCount(3);
  const bounds = (await warning.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await expect(page.getByTestId('turn-announcement')).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('turn-announcement-panel')).toHaveCSS('transform', 'none');
  await page.screenshot({ path: testInfo.outputPath('turn-announcement-reduced-motion-mobile.png') });
  await expect(warning).toHaveCount(0);
  await page.getByRole('button', { name: 'Civilization', exact: true }).click();
  const forecast = page.getByTestId('civilization-event-forecast');
  await expect(forecast).toContainText(/next.*[Ff]org/);
  await forecast.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('civilization-forecast-armed-mobile.png') });
});

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`turn announcement remains readable and fits the viewport at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const game = await openForecastGame(page, 2);
    await game.takeTurn();
    const overlay = page.getByTestId('turn-announcement');
    const panel = page.getByTestId('turn-announcement-panel');
    await expect(overlay).toHaveCSS('opacity', '1');
    const backdrop = overlay.locator('.turn-announcement__backdrop');
    await expect(backdrop).toHaveCSS('background-image', /radial-gradient/);
    await expect(backdrop).toHaveCSS('filter', 'none');
    await expect(backdrop).toHaveCSS('backdrop-filter', 'none');
    await expect(panel).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(panel).toHaveCSS('border-top-width', '0px');
    await expect(panel.locator('.turn-announcement__title')).toHaveCSS('color', 'rgb(242, 238, 229)');
    await page.waitForTimeout(1800);
    await expect(overlay).toHaveCSS('opacity', '1');
    const bounds = (await panel.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    expect(await panel.evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`turn-announcement-${viewport.width}.png`) });
    // Dismissing the longer reading pause still hands control back immediately.
    await panel.click();
    await expect(overlay).toHaveCount(0);
  });
}
