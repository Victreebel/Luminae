import { expect, test } from 'playwright/test';

test.setTimeout(30_000);

const roomId = 'event-settings-browser-test';
const host = { id: 'event-host', name: 'Event Host', isHost: true, isConnected: true, orderIndex: 0, isAi: false };
const guest = { id: 'event-guest', name: 'Event Guest', isHost: false, isConnected: true, orderIndex: 1, isAi: false };
const baseRoom = {
  id: roomId, inviteCode: 'EVENTQA1', status: 'lobby', maxPlayers: 2,
  victoryRequirement: 20, cinematicMode: 'standard', turnTimerSeconds: null,
  gameMode: 'standard', scenarioId: null, blueprintPolicy: 'none',
  eventFrequency: 'standard', players: [host, guest],
};

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`create choice persists and host can change Events at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let room = { ...baseRoom };
    const createBodies: Record<string, unknown>[] = [];
    const updateBodies: Record<string, unknown>[] = [];
    await page.route('**/api/rooms', async route => {
      const body = route.request().postDataJSON();
      createBodies.push(body);
      room = { ...room, eventFrequency: body.eventFrequency };
      await route.fulfill({ json: { room, player: host, sessionToken: 'event-test-session' } });
    });
    await page.route(`**/api/rooms/${baseRoom.inviteCode}`, route => route.fulfill({ json: room }));
    await page.route(`**/api/rooms/${roomId}/settings`, async route => {
      const body = route.request().postDataJSON();
      updateBodies.push(body);
      room = { ...room, eventFrequency: body.eventFrequency };
      await route.fulfill({ json: room });
    });
    await page.goto('/?menu=1');
    await page.getByRole('button', { name: 'New Match', exact: true }).click();
    await page.getByLabel('Your name', { exact: true }).fill(host.name);
    await expect(page.getByRole('radio', { name: 'Standard', exact: true })).toBeChecked();
    await page.getByRole('radio', { name: 'Standard', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Frequent', exact: true })).toBeChecked();
    await page.locator('label').filter({ has: page.getByRole('radio', { name: 'Off', exact: true }) }).click();
    await page.getByRole('group', { name: 'Events', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`create-events-off-${viewport.width}.png`), animations: 'disabled' });
    await page.getByRole('button', { name: 'Create Lobby', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/lobby/${roomId}$`));
    await expect(page.getByRole('radio', { name: 'Off', exact: true })).toBeChecked();
    expect(createBodies[0].eventFrequency).toBe('off');
    expect(createBodies[0].gameMode).toBe('standard');
    await page.locator('label').filter({ has: page.getByRole('radio', { name: 'Frequent', exact: true }) }).click();
    await expect(page.getByRole('radio', { name: 'Frequent', exact: true })).toBeChecked();
    await expect(page.getByText(/6 random Events: 2 per tier in a separate Event deck/)).toBeVisible();
    expect(updateBodies).toEqual([{ sessionToken: 'event-test-session', eventFrequency: 'frequent' }]);
    const bounds = await page.getByRole('group', { name: 'Events', exact: true }).boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`lobby-events-frequent-${viewport.width}.png`), animations: 'disabled' });
  });

  test(`joiners see Event frequency without host controls at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(({ roomId, inviteCode, guest }) => {
      localStorage.setItem('luminae_session', JSON.stringify({
        roomId, inviteCode, playerId: guest.id, sessionToken: 'event-guest-session', playerName: guest.name, isHost: false,
      }));
    }, { roomId, inviteCode: baseRoom.inviteCode, guest });
    await page.route(`**/api/rooms/${baseRoom.inviteCode}`, route => route.fulfill({ json: { ...baseRoom, eventFrequency: 'frequent' } }));
    await page.goto(`/lobby/${roomId}`);
    const setting = page.getByRole('group', { name: 'Events: Frequent', exact: true });
    await setting.scrollIntoViewIfNeeded();
    await expect(setting).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByText(/6 random Events: 2 per tier in a separate Event deck/)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`joiner-events-${viewport.width}.png`), animations: 'disabled' });
  });
}
