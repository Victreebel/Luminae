import { expect, test } from 'playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`civilization shockwaves remain readable at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/dev/events?event=containment_cascade&motion=full');
    await expect(page.getByTestId('cosmic-event-worlds')).toHaveCount(0);
    await expect(page.getByTestId('cosmic-event-presentation')).toHaveAttribute('data-phase', 'effect', { timeout: 10000 });
    await page.waitForTimeout(2300);
    await page.getByRole('button', { name: 'Pause Event to read' }).click();
    await expect(page.locator('.cosmic-event-world')).toHaveCount(4);
    await expect(page.locator('.cosmic-event-world__avatar')).toHaveCount(4);
    await expect(page.locator('.cosmic-event-world[data-player-id="myria"]')).toHaveAttribute('data-response', 'strained');
    await expect(page.locator('.cosmic-event-world[data-player-id="architect"]')).toHaveAttribute('data-response', 'shielded');
    const panel = (await page.getByTestId('cosmic-event-explanation').boundingBox())!;
    const card = (await page.getByTestId('cosmic-event-card').boundingBox())!;
    for (const world of await page.locator('.cosmic-event-world').all()) {
      const bounds = (await world.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y).toBeGreaterThan(30);
      // Worlds must not overlap the opaque reading panel or the card.
      expect(bounds.x + bounds.width <= panel.x || bounds.y + bounds.height <= panel.y).toBe(true);
      expect(bounds.x + bounds.width <= card.x || bounds.x >= card.x + card.width || bounds.y >= card.y + card.height).toBe(true);
    }
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`cascade-worlds-${viewport.width}.png`) });
  });
}

test('reduced motion retains meaningful worlds without expanding shockwaves', async ({ page }) => {
  await page.goto('/dev/events?event=system_shock&motion=reduced');
  await expect(page.getByTestId('cosmic-event-presentation')).toHaveAttribute('data-phase', 'effect', { timeout: 6000 });
  await page.getByRole('button', { name: 'Pause Event to read' }).click();
  await expect(page.locator('.cosmic-event-world[data-player-id="architect"]')).toHaveAttribute('data-response', 'damaged');
  await expect(page.locator('.cosmic-event-universal-wave').first()).toBeHidden();
  expect(await page.locator('.cosmic-event-world__infrastructure').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

test('skip exposes static receipt-driven damage without starting a new impact', async ({ page }) => {
  await page.goto('/dev/events?event=system_shock&motion=full');
  await page.getByRole('button', { name: 'Skip animation' }).click();
  await expect(page.getByTestId('cosmic-event-presentation')).toHaveAttribute('data-phase', 'receipt');
  const damaged = page.locator('.cosmic-event-world[data-player-id="architect"]');
  await expect(damaged).toHaveAttribute('data-response', 'damaged');
  const quiet = page.locator('.cosmic-event-world[data-player-id="myria"]');
  await expect(quiet).toHaveAttribute('data-response', 'quiet');
  expect(await damaged.locator('.cosmic-event-world__infrastructure').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.cosmic-event-universal-wave').first().evaluate(element => getComputedStyle(element).opacity)).toBe('0');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByTestId('cosmic-event-presentation')).toHaveCount(0);
});
