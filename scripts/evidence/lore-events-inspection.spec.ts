import { expect, test } from 'playwright/test';

for (const profile of ['signal_clarity', 'synchronization_shear']) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`${profile} exposes its cause after activation at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`/dev/events?event=${profile}`);
      const presentation = page.getByTestId('cosmic-event-presentation');
      await expect(presentation).toHaveAttribute('data-profile', profile);
      await expect(page.getByTestId('cosmic-event-explanation')).toHaveCount(0);
      await expect(presentation).toHaveAttribute('data-phase', 'effect', { timeout: 10_000 });
      await page.getByRole('button', { name: 'Pause Event to read' }).click();
      const explanation = page.getByTestId('cosmic-event-explanation');
      await expect(explanation).toBeVisible();
      await expect(explanation).toHaveCSS('opacity', '1');
      await expect(explanation.getByRole('list', { name: 'Why these Artifacts were affected' }).first()).toBeVisible();
      const bounds = await explanation.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(errors).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${profile}-${viewport.width}.png`) });
    });
  }
}

test('Artifact targeting properties are inspectable without starting a match', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/card-browser?id=t1s04');
  await page.getByText('Event interactions', { exact: true }).click();
  await expect(page.getByText('Distributed synchronization.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Damaged Artifacts retain Affinity bonuses/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('artifact-event-inspector-mobile.png'), fullPage: true });
});

for (const width of [1440, 390]) {
  test(`Artifact properties remain visible below lore before expansion at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/dev/card-browser?id=t2e04');
    const lore = page.getByText(/This living spindle translates signals among ships, soil, machines, and flesh/);
    await expect(lore).toBeVisible();
    const properties = page.getByTestId('artifact-event-facts');
    const capabilities = properties.getByRole('list', { name: 'Artifact capabilities' });
    await expect(capabilities.getByText('Signal interpretation', { exact: true })).toBeVisible();
    await expect(properties.getByRole('list', { name: 'Artifact dependencies' })).toHaveCount(0);
    const details = properties.locator('details').first();
    await expect(details).not.toHaveAttribute('open');
    const loreBounds = await lore.boundingBox();
    const propertyBounds = await properties.boundingBox();
    expect(propertyBounds!.y).toBeGreaterThanOrEqual(loreBounds!.y + loreBounds!.height);
    expect(propertyBounds!.x).toBeGreaterThanOrEqual(0);
    expect(propertyBounds!.x + propertyBounds!.width).toBeLessThanOrEqual(width);
    await properties.getByText('Event interactions', { exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('open');
    await expect(properties.getByText(/Translating signals among biological and machine participants/)).toBeVisible();
    await properties.locator('..').screenshot({ path: testInfo.outputPath(`spindle-properties-${width}.png`) });
  });
}
