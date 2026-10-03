import { expect, test, type Page } from 'playwright/test';

const BASE = process.env.LUMINAE_E2E_BASE_URL ?? 'http://127.0.0.1:5191';

interface RoomFixture {
  room: { id: string; inviteCode: string };
  player: { id: string };
  sessionToken: string;
}

interface RuntimeSnapshot {
  cameraControlled: boolean;
  presentationActive: boolean;
  queuedStateCount: number;
  transientAudio: {
    voices: number;
    buses: number;
    arrivalBuses: number;
    activationBuses: number;
    antimatterBuses: number;
  };
  activeAnimations: number;
  domNodes: number;
  heapBytes: number;
}

interface GameStateSummary {
  status: string;
  currentPlayerIndex: number;
  players: Array<{ playerId: string }>;
}

async function apiPost(path: string, body: unknown) {
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<unknown>;
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function createGame(): Promise<RoomFixture> {
  const fixture = await apiPost('/api/rooms', {
    hostName: 'Lifecycle-Test',
    maxPlayers: 2,
    turnTimerSeconds: null,
  }) as RoomFixture;
  await apiPost(`/api/rooms/${fixture.room.id}/ai-players`, {
    sessionToken: fixture.sessionToken,
    difficulty: 'easy',
  });
  await apiPost(`/api/rooms/${fixture.room.id}/start`, {
    sessionToken: fixture.sessionToken,
  });
  return fixture;
}

async function enterGame(page: Page, fixture: RoomFixture) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ room, player, sessionToken }) => {
    localStorage.setItem('luminae_session', JSON.stringify({
      roomId: room.id,
      inviteCode: room.inviteCode,
      playerId: player.id,
      sessionToken,
      playerName: 'Lifecycle-Test',
      isHost: true,
      avatarId: 'avatar_1',
    }));
  }, fixture);
  await page.goto(`/game/${fixture.room.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('game-board')).toBeVisible({ timeout: 20_000 });
}

async function dismissSkippableCinematics(page: Page) {
  const skippable = page.locator('[aria-label*="skip" i]:visible').last();
  for (let attempts = 0; attempts < 4; attempts += 1) {
    if (await skippable.count() === 0) break;
    await skippable.click({ position: { x: 12, y: 12 } }).catch(() => undefined);
    await page.waitForTimeout(180);
  }
}

async function waitForPlayerTurn(page: Page, fixture: RoomFixture) {
  await dismissSkippableCinematics(page);
  await expect.poll(async () => {
    const state = await apiGet<GameStateSummary>(
      `/api/rooms/${fixture.room.id}/state?sessionToken=${encodeURIComponent(fixture.sessionToken)}`,
    );
    return state.status === 'playing'
      ? state.players[state.currentPlayerIndex]?.playerId
      : state.status;
  }, { timeout: 30_000 }).toBe(fixture.player.id);
}

async function finishCurrentGame(page: Page, fixture: RoomFixture) {
  await waitForPlayerTurn(page, fixture);
  await apiPost(`/api/rooms/${fixture.room.id}/actions`, {
    type: 'surrender',
    sessionToken: fixture.sessionToken,
  });

  const victoryCinematic = page.getByTestId('victory-cinematic');
  await expect(victoryCinematic).toBeVisible({ timeout: 15_000 });
  await victoryCinematic.click({ position: { x: 12, y: 12 } });
  const results = page.locator('[role="dialog"][aria-modal="true"]').filter({
    has: page.getByRole('button', { name: /^home$/i }),
  });
  await expect(results).toBeVisible({ timeout: 15_000 });

  // Exercise the real post-match trophy path before returning to rematch.
  await results.getByRole('button', { name: /^view board$/i }).click();
  await expect(results).not.toBeVisible({ timeout: 10_000 });
  const actionHistory = page.getByRole('button', { name: /^collapse action history$/i });
  if (await actionHistory.isVisible().catch(() => false)) await actionHistory.click();
  await page.getByRole('button', { name: /^civilization(?:,.*)?$/i }).click();
  await expect(page.getByTestId('civilization-scene-panel')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /^return to results$/i }).click();
  await expect(results).toBeVisible({ timeout: 10_000 });
  return results;
}

async function readRuntimeSnapshot(page: Page): Promise<RuntimeSnapshot> {
  const client = await page.context().newCDPSession(page);
  await client.send('HeapProfiler.collectGarbage');
  await client.send('Performance.enable');
  const metrics = await client.send('Performance.getMetrics') as {
    metrics: Array<{ name: string; value: number }>;
  };
  await client.detach();
  const heapBytes = metrics.metrics.find(metric => metric.name === 'JSHeapUsedSize')?.value ?? 0;
  return page.evaluate((heap) => {
    const diagnostics = (window as Window & {
      __LUMINAE_RUNTIME_DIAGNOSTICS__?: () => Omit<RuntimeSnapshot, 'heapBytes'>;
    }).__LUMINAE_RUNTIME_DIAGNOSTICS__;
    if (!diagnostics) throw new Error('Luminae runtime diagnostics are unavailable');
    return { ...diagnostics(), heapBytes: heap };
  }, heapBytes);
}

test('three rematches release presentation resources without progressive degradation', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const fixture = await createGame();
  await enterGame(page, fixture);

  const snapshots: RuntimeSnapshot[] = [];
  for (let completedGames = 0; completedGames < 4; completedGames += 1) {
    const results = await finishCurrentGame(page, fixture);
    if (completedGames === 3) break;

    await results.getByRole('button', { name: /^play again$/i }).click();
    await expect(results).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('game-board')).toBeVisible();
    await dismissSkippableCinematics(page);
    await expect.poll(async () => {
      const snapshot = await readRuntimeSnapshot(page);
      return {
        cameraControlled: snapshot.cameraControlled,
        presentationActive: snapshot.presentationActive,
        queuedStateCount: snapshot.queuedStateCount,
      };
    }, { timeout: 20_000 }).toEqual({
      cameraControlled: false,
      presentationActive: false,
      queuedStateCount: 0,
    });
    snapshots.push(await readRuntimeSnapshot(page));
  }

  expect(snapshots).toHaveLength(3);
  const baseline = snapshots[0];
  const final = snapshots.at(-1)!;
  const report = {
    project: testInfo.project.name,
    baseline,
    final,
    delta: {
      domNodes: final.domNodes - baseline.domNodes,
      activeAnimations: final.activeAnimations - baseline.activeAnimations,
      transientVoices: final.transientAudio.voices - baseline.transientAudio.voices,
      transientBuses: final.transientAudio.buses - baseline.transientAudio.buses,
      heapBytes: final.heapBytes - baseline.heapBytes,
    },
  };
  console.log(`[rematch-lifecycle] ${JSON.stringify(report)}`);
  await testInfo.attach('rematch-runtime-snapshots', {
    body: Buffer.from(JSON.stringify({ snapshots, report }, null, 2)),
    contentType: 'application/json',
  });
  expect(final.domNodes).toBeLessThanOrEqual(baseline.domNodes + 80);
  expect(final.activeAnimations).toBeLessThanOrEqual(baseline.activeAnimations + 8);
  expect(final.transientAudio.voices).toBeLessThanOrEqual(baseline.transientAudio.voices + 2);
  expect(final.transientAudio.buses).toBeLessThanOrEqual(baseline.transientAudio.buses + 2);
  expect(final.transientAudio.arrivalBuses).toBe(0);
  expect(final.transientAudio.activationBuses).toBe(0);
  expect(final.transientAudio.antimatterBuses).toBe(0);
  expect(final.heapBytes).toBeLessThanOrEqual(Math.max(baseline.heapBytes * 1.35, baseline.heapBytes + 24_000_000));
  expect(pageErrors).toEqual([]);
});
