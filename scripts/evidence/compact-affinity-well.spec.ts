import { expect, test, type Page, type WebSocketRoute } from 'playwright/test';
import {
  applyAction,
  formatGameState,
  initializeGame,
  type ActionPayload,
} from '../../artifacts/api-server/src/lib/gameEngine';
import { filterStateForPlayer } from '../../artifacts/api-server/src/lib/stateProjection';

test.setTimeout(45_000);

const roomId = 'compact-affinity-well-browser-test';
const humanId = 'compact-well-human';
const opponentId = 'compact-well-opponent';
const standardAffinities = ['flare', 'continuum', 'verdance', 'abyss', 'radiance'] as const;
type Affinity = (typeof standardAffinities)[number] | 'singularity';

async function openCompactGame(page: Page, options: {
  held?: Partial<Record<Affinity, number>>;
  stock?: Partial<Record<Affinity, number>>;
  ownTurn?: boolean;
} = {}) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const engine = initializeGame([
    { id: humanId, name: 'Compact Human' },
    { id: opponentId, name: 'Compact Opponent' },
  ], 2, 20, 'standard', { eventFrequency: 'off' });
  engine.currentPlayerIndex = 1;
  engine.turnCount = 19;
  engine.roundNumber = 10;
  engine.version = 10;
  engine.openingTurnOrder = null;
  engine.players[0].civName = 'Compact Civilization';
  engine.players[1].civName = 'Opponent Civilization';
  Object.assign(engine.players[0].affinities, options.held);
  Object.assign(engine.affinityWell, options.stock);
  const project = () => filterStateForPlayer(
    formatGameState(roomId, 'playing', engine, new Set([humanId, opponentId])), humanId,
  );
  let state = project();
  let socket: WebSocketRoute | undefined;
  const actions: ActionPayload[] = [];
  await page.addInitScript(({ roomId, humanId }) => {
    localStorage.setItem('luminae_session', JSON.stringify({
      roomId, inviteCode: 'COMPACTQA', playerId: humanId,
      sessionToken: 'compact-test-session', playerName: 'Compact Human', isHost: true,
    }));
    localStorage.setItem('luminae_muted', 'true');
    localStorage.setItem('luminae_hints_enabled', '0');
  }, { roomId, humanId });
  await page.route(`**/api/rooms/${roomId}/state?*`, route => route.fulfill({ json: state }));
  await page.route(`**/api/rooms/${roomId}/actions`, async route => {
    const { sessionToken: _sessionToken, ...action } = route.request().postDataJSON();
    // Civilization naming is an automatic connection handshake, not a Well action.
    if (action.type !== 'set_civ_name') actions.push(action as ActionPayload);
    const result = applyAction(engine, humanId, action as ActionPayload);
    if (!result.success) {
      errors.push(result.error ?? 'Action rejected by game engine');
      await route.fulfill({ status: 400, json: { error: result.error } });
      return;
    }
    state = project();
    await route.fulfill({ json: state });
    socket?.send(JSON.stringify({ type: 'state_update', state }));
  });
  await page.routeWebSocket('**/ws?*', route => {
    socket = route;
    route.onMessage(message => {
      if (typeof message === 'string' && JSON.parse(message).type === 'ping') {
        route.send(JSON.stringify({ type: 'pong' }));
      }
    });
  });
  await page.goto(`/game/${roomId}`);
  await expect(page.getByTestId('affinity-well-panel')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => Boolean(socket)).toBe(true);
  if (options.ownTurn !== false) {
    engine.version++;
    engine.turnCount++;
    engine.currentPlayerIndex = 0;
    engine.lastAction = { type: 'pass', playerId: opponentId };
    state = project();
    socket!.send(JSON.stringify({ type: 'state_update', state }));
    await expect(page.getByTestId('turn-announcement')).toBeVisible();
    for (const affinity of standardAffinities) {
      await expect(affinityButton(page, affinity)).toBeDisabled();
    }
    await expect(page.getByTestId('turn-announcement')).toHaveCount(0);
    for (const affinity of standardAffinities) {
      if (engine.affinityWell[affinity] > 0) {
        await expect(affinityButton(page, affinity)).toBeEnabled();
      }
    }
  }
  const startsExpanded = (page.viewportSize()?.height ?? 0) > 650;
  await expect(page.getByTestId('affinity-well-panel')).toHaveAttribute('data-well-expanded', String(startsExpanded));
  const compactLayout = startsExpanded ? null : await snapshotCompactLayout(page);
  return { actions, engine, errors, compactLayout };
}

const affinityButton = (page: Page, affinity: Affinity) => page.getByTestId(`compact-affinity-${affinity}`);

async function setWellExpanded(page: Page, expanded: boolean) {
  await page.getByRole('button', { name: 'More game options', exact: true }).click();
  const option = page.getByRole('menuitem', {
    name: expanded ? 'Expand Affinity Well' : 'Compact Affinity Well', exact: true,
  });
  await expect(option).toBeVisible();
  await expect(option).toBeEnabled();
  await option.click();
  await expect(page.getByTestId('affinity-well-panel')).toHaveAttribute('data-well-expanded', String(expanded));
}

async function snapshotCompactLayout(page: Page) {
  return {
    panel: (await page.getByTestId('affinity-well-panel').boundingBox())!,
    icon: (await affinityButton(page, 'flare').boundingBox())!,
    board: (await page.locator('.game-main').boundingBox())!,
  };
}

async function expectMinimalCompactActions(page: Page, baseline: Awaited<ReturnType<typeof snapshotCompactLayout>> | null) {
  const panel = page.getByTestId('affinity-well-panel');
  await expect(panel).toHaveAttribute('data-well-expanded', 'false');
  await expect(panel.getByRole('button', { name: /^(Expand|Collapse|Compact) Affinity Well$/ })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Undo last affinity', exact: true })).toBeHidden();
  await expect(panel.locator('.affinity-well-harness-summary')).toBeHidden();
  await expect(panel.locator('.affinity-well-harness-actions').getByRole('button').filter({ visible: true })).toHaveCount(2);
  await expect(panel.getByRole('button', { name: 'Clear selected affinities', exact: true })).toBeVisible();
  const layout = await snapshotCompactLayout(page);
  expect(layout.panel.height).toBe(58);
  const cluster = (await panel.locator('.affinity-well-harness-actions').boundingBox())!;
  expect(cluster.width).toBeLessThanOrEqual(160);
  expect(cluster.height).toBeLessThanOrEqual(44);
  expect(cluster.y + cluster.height).toBeLessThanOrEqual(layout.panel.y);
  if (baseline) {
    for (const surface of ['panel', 'icon', 'board'] as const) {
      for (const dimension of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(layout[surface][dimension] - baseline[surface][dimension]), `${surface} ${dimension} must not shift when selecting`).toBeLessThanOrEqual(1);
      }
    }
  }
  const hit = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return {
      belongsToBoard: Boolean(element?.closest('.game-main')),
      interceptedByWell: Boolean(element?.closest('.affinity-well-panel')),
    };
  }, { x: Math.max(layout.panel.x + 8, cluster.x - 20), y: cluster.y + cluster.height / 2 });
  expect(hit).toEqual({ belongsToBoard: true, interceptedByWell: false });
}

async function expectInViewport(page: Page, testId: string) {
  const viewport = page.viewportSize()!;
  const bounds = (await page.getByTestId(testId).boundingBox())!;
  await expect(page.getByTestId(testId)).toBeInViewport({ ratio: 1 });
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
}

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 640 }]) {
  test(`compact Well selects three and submits a real Harness at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const game = await openCompactGame(page);
    for (const affinity of ['flare', 'continuum', 'verdance'] as const) {
      const button = affinityButton(page, affinity);
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toHaveAttribute('data-selected', 'true');
      await expect(page.getByTestId('affinity-well-panel')).toHaveAttribute('data-well-expanded', 'false');
    }
    const harness = page.getByTestId('harness-button');
    await expect(harness).toBeVisible();
    await expect(harness).toBeEnabled();
    expect(await harness.evaluate(element => element.tagName)).toBe('BUTTON');
    await expectMinimalCompactActions(page, game.compactLayout);
    await expectInViewport(page, 'affinity-well-panel');
    await expectInViewport(page, 'harness-button');
    await expect(page.locator('.affinity-well-action-zone > div').first()).toHaveCSS('opacity', '1');
    await page.screenshot({ path: testInfo.outputPath(`compact-selection-${viewport.width}.png`) });
    if (viewport.width === 320) {
      await harness.focus();
      await page.keyboard.press('Enter');
    } else {
      await harness.click();
    }
    await expect.poll(() => game.actions.filter(action => action.type === 'harness_three_affinities').length).toBe(1);
    expect(game.actions[0]).toMatchObject({
      type: 'harness_three_affinities', affinities: { flare: 1, continuum: 1, verdance: 1 },
    });
    expect(game.engine.players[0].affinities).toMatchObject({ flare: 1, continuum: 1, verdance: 1 });
    expect(game.engine.affinityWell).toMatchObject({ flare: 3, continuum: 3, verdance: 3 });
    expect(game.errors).toEqual([]);
  });
}

test('compact selection toggles, clears, and supports full-view undo through the options menu', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const game = await openCompactGame(page, { held: { flare: 2 } });
  const flare = affinityButton(page, 'flare');
  const continuum = affinityButton(page, 'continuum');
  const originalFlareBounds = (await flare.boundingBox())!;
  await flare.click();
  await expect(flare).toHaveAttribute('data-selected', 'true');
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('3');
  await expect.poll(async () => Math.abs((await flare.boundingBox())!.y - originalFlareBounds.y)).toBeLessThanOrEqual(1);
  await page.mouse.click(
    originalFlareBounds.x + originalFlareBounds.width / 2,
    originalFlareBounds.y + originalFlareBounds.height / 2,
  );
  await expect(flare).toHaveAttribute('aria-pressed', 'true');
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('4');
  await flare.click();
  await expect(flare).toHaveAttribute('aria-pressed', 'false');
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('2');
  await flare.click();
  await continuum.click();
  await expectMinimalCompactActions(page, game.compactLayout);
  await setWellExpanded(page, true);
  await page.getByRole('button', { name: 'Undo last affinity', exact: true }).click();
  await expect(continuum).toHaveAttribute('aria-pressed', 'false');
  await expect(flare).toHaveAttribute('data-selected', 'true');
  await setWellExpanded(page, false);
  await expect(flare).toHaveAttribute('data-selected', 'true');
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('3');
  await page.getByRole('button', { name: 'Clear selected affinities', exact: true }).click();
  await expect(flare).toHaveAttribute('aria-pressed', 'false');
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('2');
  expect(game.actions).toHaveLength(0);
  expect(game.errors).toEqual([]);
});

test('clicking twice selects a pair, a third click clears it, and undo restores single or mixed selections', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const game = await openCompactGame(page);
  const flare = affinityButton(page, 'flare');
  const continuum = affinityButton(page, 'continuum');
  const undo = page.getByRole('button', { name: 'Undo last affinity', exact: true });
  await flare.dblclick();
  await expect(page.getByTestId('compact-take-two')).toHaveCount(0);
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('2');
  await expect(page.getByTestId('affinity-well-panel')).toHaveAttribute('data-well-expanded', 'false');
  await flare.click();
  await expect(flare).toHaveAttribute('aria-pressed', 'false');
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('0');
  await flare.dblclick();
  await setWellExpanded(page, true);
  await undo.click();
  await setWellExpanded(page, false);
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('1');
  await continuum.click();
  await flare.click();
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('2');
  await expect(continuum).toHaveAttribute('aria-pressed', 'false');
  await expect(continuum.locator('.affinity-well-compact-count')).toHaveText('0');
  await setWellExpanded(page, true);
  await undo.click();
  await setWellExpanded(page, false);
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('1');
  await expect(continuum).toHaveAttribute('aria-pressed', 'true');
  await expect(continuum.locator('.affinity-well-compact-count')).toHaveText('1');
  await flare.click();
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('2');
  await expect(continuum).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.affinity-well-action-zone > div').first()).toHaveCSS('opacity', '1');
  await expectMinimalCompactActions(page, game.compactLayout);
  await expectInViewport(page, 'harness-button');
  await page.screenshot({ path: testInfo.outputPath('compact-double-click-pair.png') });
  await page.getByTestId('harness-button').click();
  await expect.poll(() => game.actions.length).toBe(1);
  expect(game.actions[0]).toMatchObject({ type: 'harness_two_affinities', affinity: 'flare' });
  expect(game.engine.players[0].affinities.flare).toBe(2);
  expect(game.engine.affinityWell.flare).toBe(2);
  expect(game.errors).toEqual([]);
});

test('low stock prevents a pair and the second click toggles the single affinity off', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  const game = await openCompactGame(page, { stock: { flare: 3, continuum: 0 } });
  const flare = affinityButton(page, 'flare');
  await flare.click();
  await expect(page.getByTestId('compact-take-two')).toHaveCount(0);
  await expect(flare).toHaveAttribute('data-selected', 'true');
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('1');
  await flare.click();
  await expect(flare).toHaveAttribute('aria-pressed', 'false');
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('0');
  await flare.click();
  await expect(flare.locator('.affinity-well-compact-count')).toHaveText('1');
  await expect(affinityButton(page, 'continuum')).toBeDisabled();
  await affinityButton(page, 'verdance').click();
  await affinityButton(page, 'abyss').click();
  await expect(page.getByTestId('harness-button')).toBeEnabled();
  await page.getByTestId('harness-button').click();
  await expect.poll(() => game.actions.length).toBe(1);
  expect(game.actions[0]).toMatchObject({
    type: 'harness_three_affinities', affinities: { flare: 1, verdance: 1, abyss: 1 },
  });
  expect(game.errors).toEqual([]);
});

test('Singularity opens encrypted Artifacts without gathering or discarding a selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  const game = await openCompactGame(page);
  await affinityButton(page, 'flare').click();
  await affinityButton(page, 'singularity').click();
  await expect(page.getByRole('dialog', { name: 'Encrypted Artifacts', exact: true })).toBeVisible();
  expect(game.actions).toHaveLength(0);
  expect(game.engine.players[0].affinities.singularity).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Encrypted Artifacts', exact: true })).toHaveCount(0);
  await expect(affinityButton(page, 'flare')).toHaveAttribute('data-selected', 'true');
  await expect(affinityButton(page, 'singularity')).not.toHaveAttribute('data-selected', 'true');
  expect(game.errors).toEqual([]);
});

test('exceeding capacity opens the return controls and submits the chosen return', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 640 });
  const game = await openCompactGame(page, { held: { flare: 3, continuum: 3, verdance: 3 } });
  for (const affinity of ['flare', 'continuum', 'verdance'] as const) {
    await affinityButton(page, affinity).click();
  }
  await page.getByTestId('harness-button').click();
  const panel = page.getByTestId('affinity-well-panel');
  await expect(panel).toHaveAttribute('data-well-expanded', 'true');
  await expect(panel).toHaveAttribute('data-return-phase', 'true');
  await expect(page.getByText('Return 2 affinity tokens — capacity is 10', { exact: true })).toBeVisible();
  expect(game.actions).toHaveLength(0);
  const returnFlare = panel.locator('.affinity-return-phase__token').filter({ has: page.getByAltText('Flare', { exact: true }) });
  await returnFlare.click();
  await returnFlare.click();
  const confirm = page.getByRole('button', { name: 'Confirm Return & Harness', exact: true });
  await expect(confirm).toBeEnabled();
  await confirm.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('compact-capacity-return.png') });
  await confirm.click();
  await expect.poll(() => game.actions.length).toBe(1);
  expect(game.actions[0]).toMatchObject({
    type: 'harness_three_affinities',
    affinities: { flare: 1, continuum: 1, verdance: 1 },
    returnAffinities: { flare: 2 },
  });
  expect(Object.values(game.engine.players[0].affinities).reduce((sum, count) => sum + count, 0)).toBe(10);
  expect(game.errors).toEqual([]);
});

test('opponent-turn compact selection can queue a Harness plan without taking affinities', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  const game = await openCompactGame(page, { ownTurn: false });
  for (const affinity of ['flare', 'continuum', 'verdance'] as const) {
    await affinityButton(page, affinity).click();
  }
  await expect(page.getByTestId('affinity-well-panel')).toHaveAttribute('data-well-expanded', 'false');
  const plan = page.getByTestId('affinity-well-panel').getByRole('button', { name: /PLAN.*Harness/i });
  await expect(plan).toBeVisible();
  await expectMinimalCompactActions(page, game.compactLayout);
  await plan.click();
  await expect.poll(() => game.actions.length).toBe(1);
  expect(game.actions[0]).toMatchObject({
    type: 'plan_action',
    plannedActionData: { type: 'harness_three_affinities', affinities: { flare: 1, continuum: 1, verdance: 1 } },
  });
  expect(game.engine.players[0].affinities).toMatchObject({ flare: 0, continuum: 0, verdance: 0 });
  expect(game.engine.players[0].plannedAction?.type).toBe('harness_three_affinities');
  expect(game.errors).toEqual([]);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }]) {
  test(`tall mobile options menu exposes Compact mode and preserves a pair across both views at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const game = await openCompactGame(page);
    const panel = page.getByTestId('affinity-well-panel');
    await expect(panel.getByRole('button', { name: /^(Expand|Collapse|Compact) Affinity Well$/ })).toHaveCount(0);
    await expect(panel.locator('.affinity-well-player').getByText('Compact Human', { exact: true })).toBeVisible();
    await expectInViewport(page, 'affinity-well-panel');
    await page.getByRole('button', { name: 'More game options', exact: true }).click();
    const compactOption = page.getByRole('menuitem', { name: 'Compact Affinity Well', exact: true });
    await expect(compactOption).toBeVisible();
    await expect(compactOption).toBeEnabled();
    await expect(page.getByRole('menu')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: testInfo.outputPath(`compact-well-menu-option-${viewport.width}.png`) });

    await compactOption.click();
    await expect(panel).toHaveAttribute('data-well-expanded', 'false');
    const compactLayout = await snapshotCompactLayout(page);
    const flare = affinityButton(page, 'flare');
    await expect(flare).toBeVisible();
    const originalFlareBounds = (await flare.boundingBox())!;
    await flare.dblclick();
    await expect(flare.locator('.affinity-well-compact-count')).toHaveText('2');
    await expect.poll(async () => Math.abs((await flare.boundingBox())!.y - originalFlareBounds.y)).toBeLessThanOrEqual(1);
    await expect(page.getByTestId('compact-take-two')).toHaveCount(0);
    await expect(panel).toHaveAttribute('data-well-expanded', 'false');

    await setWellExpanded(page, true);
    await expect(panel.locator('.affinity-well-player').getByText('Compact Human', { exact: true })).toBeVisible();
    await setWellExpanded(page, false);
    await expect(flare.locator('.affinity-well-compact-count')).toHaveText('2');
    await expect(flare).toHaveAttribute('aria-pressed', 'true');
    await expectMinimalCompactActions(page, compactLayout);
    await expectInViewport(page, 'affinity-well-panel');
    await expectInViewport(page, 'harness-button');
    await expect(page.locator('.affinity-well-action-zone > div').first()).toHaveCSS('opacity', '1');
    await page.screenshot({ path: testInfo.outputPath(`tall-mobile-compact-pair-${viewport.width}.png`) });
    await page.getByTestId('harness-button').click();
    await expect.poll(() => game.actions.length).toBe(1);
    expect(game.actions[0]).toMatchObject({ type: 'harness_two_affinities', affinity: 'flare' });
    expect(game.engine.players[0].affinities.flare).toBe(2);
    expect(game.engine.affinityWell.flare).toBe(2);
    expect(game.errors).toEqual([]);
  });
}
