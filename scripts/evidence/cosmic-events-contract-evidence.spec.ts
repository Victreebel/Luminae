import { expect, test } from 'playwright/test';

const profiles = [
  'affinity_bloom', 'forge_drift', 'containment_cascade',
  'affinity_inversion', 'entropy_storm', 'terminus_tide',
  'system_shock', 'fracture_wave',
];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const profile of profiles) {
    test(`${profile} remains readable at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`/dev/events?event=${profile}`);
      const presentation = page.getByTestId('cosmic-event-presentation');
      await expect(presentation).toHaveAttribute('data-phase', 'tremble');
      await expect(page.getByTestId('cosmic-event-explanation')).toHaveCount(0);
      if (profile === 'affinity_bloom') {
        await page.screenshot({ path: testInfo.outputPath(`forge-tremble-${viewport.width}.png`) });
      }
      await expect(presentation).toHaveAttribute('data-phase', 'activation', { timeout: 8_000 });
      await expect(page.getByTestId('cosmic-event-explanation')).toHaveCount(0);
      await expect(presentation).toHaveAttribute('data-phase', 'effect', { timeout: 5_000 });
      await page.getByRole('button', { name: 'Pause Event to read' }).click();
      await expect(page.getByTestId('cosmic-event-explanation')).toBeVisible();
      const cardArtwork = page.getByTestId('cosmic-event-card').locator('img');
      await expect(cardArtwork).toBeVisible();
      await expect.poll(() => cardArtwork.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      // The Forge and activation must show the same illustrated card face.
      const forgeArtwork = page.locator('[aria-label="Preview Forge"] .cosmic-event-card img');
      await expect(forgeArtwork).toHaveAttribute('src', (await cardArtwork.getAttribute('src'))!);
      await expect(page.locator('.cosmic-event-outcome')).toHaveCount(4);
      if (profile === 'system_shock' || profile === 'fracture_wave') {
        await expect(page.getByRole('list', { name: 'Damaged Artifacts for Architect' }).getByRole('listitem')).toHaveCount(profile === 'system_shock' ? 1 : 2);
        await expect(page.getByText('No operational Artifacts to damage.')).toBeAttached();
        await expect(page.getByText(/queue free repairs/)).toBeAttached();
      }
      const bounds = await page.getByTestId('cosmic-event-explanation').boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(errors).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${profile}-${viewport.width}.png`) });
      await page.getByRole('button', { name: 'Skip animation' }).click();
      await expect(presentation).toHaveAttribute('data-phase', 'receipt');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect(presentation).toHaveCount(0);
    });
  }
}

test('illustrated Event can replay after its previous presentation completes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/dev/events?event=system_shock');
  const presentation = page.getByTestId('cosmic-event-presentation');
  await page.getByRole('button', { name: 'Skip animation' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(presentation).toHaveCount(0);
  await page.getByRole('button', { name: 'Replay System Shock', exact: true }).click();
  await expect(presentation).toHaveAttribute('data-phase', 'tremble');
  await expect(page.getByTestId('cosmic-event-card').locator('img')).toBeVisible();
});

test('long Event explanation fits small screens in reduced motion', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/dev/events?event=affinity_inversion&motion=reduced');
  const presentation = page.getByTestId('cosmic-event-presentation');
  await expect(presentation).toHaveAttribute('data-phase', 'effect', { timeout: 6_000 });
  await page.getByRole('button', { name: 'Pause Event to read' }).click();
  const explanation = page.getByTestId('cosmic-event-explanation');
  await expect(explanation).toBeVisible();
  const bounds = await explanation.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568);
  await page.screenshot({ path: testInfo.outputPath('affinity-inversion-small-reduced.png') });
});

test('damage receipts and repair guidance remain accessible on a small screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/dev/events?event=fracture_wave&motion=reduced');
  const presentation = page.getByTestId('cosmic-event-presentation');
  await expect(presentation).toHaveAttribute('data-phase', 'effect', { timeout: 6_000 });
  await page.getByRole('button', { name: 'Pause Event to read' }).click();
  const explanation = page.getByTestId('cosmic-event-explanation');
  await expect(page.getByRole('list', { name: 'Damaged Artifacts for Architect' }).getByRole('listitem')).toHaveCount(2);
  const guidance = page.getByText(/queue free repairs/);
  await guidance.scrollIntoViewIfNeeded();
  await expect(guidance).toBeVisible();
  const bounds = await explanation.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568);
  await page.screenshot({ path: testInfo.outputPath('fracture-wave-small-reduced.png') });
});

test('Event card lifts from the Forge and fits a landscape phone', async ({ page }, testInfo) => {
  const viewport = { width: 844, height: 390 };
  await page.setViewportSize(viewport);
  await page.goto('/dev/events?event=entropy_storm');
  const presentation = page.getByTestId('cosmic-event-presentation');
  await expect(presentation).toHaveAttribute('data-phase', 'tremble');
  const source = await page.locator('[data-slot-key="3-1"]').boundingBox();
  const tremblingCard = await page.getByTestId('cosmic-event-card').boundingBox();
  expect(Math.abs(tremblingCard!.x + tremblingCard!.width / 2 - source!.x - source!.width / 2)).toBeLessThan(12);
  expect(Math.abs(tremblingCard!.y + tremblingCard!.height / 2 - source!.y - source!.height / 2)).toBeLessThan(12);
  expect(tremblingCard!.y).toBeGreaterThanOrEqual(0);
  expect(tremblingCard!.y + tremblingCard!.height).toBeLessThanOrEqual(viewport.height);
  await page.getByRole('button', { name: 'Pause Event to read' }).click();
  await expect(presentation).toHaveAttribute('data-phase', 'tremble');
  await page.screenshot({ path: testInfo.outputPath('forge-tremble-landscape.png') });
  await page.getByRole('button', { name: 'Resume Event' }).click();
  await expect(presentation).toHaveAttribute('data-phase', 'effect', { timeout: 8_000 });
  await page.waitForTimeout(650);
  await page.getByRole('button', { name: 'Pause Event to read' }).click();
  const card = await page.getByTestId('cosmic-event-card').boundingBox();
  const explanation = await page.getByTestId('cosmic-event-explanation').boundingBox();
  expect(card!.x).toBeGreaterThanOrEqual(0);
  expect(card!.y).toBeGreaterThanOrEqual(0);
  expect(card!.y + card!.height).toBeLessThanOrEqual(viewport.height);
  expect(explanation!.x + explanation!.width).toBeLessThanOrEqual(viewport.width);
  expect(explanation!.y + explanation!.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({ path: testInfo.outputPath('entropy-storm-landscape.png') });
});
