import { expect, test } from 'playwright/test';

test('audited Civilization atlas sprites load at their native scene scales', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const loaded = new Set<string>();
  const renderedArtifacts = new Set<string>();
  for (const scene of ['orbit', 'stellar', 'galaxy']) {
    await page.goto(`/dev/civilization-scene?proof=saturated&tier=galactic&scene=${scene}&dyad=chrysalis&environment=aurora_basin&scan=1`);
    const panel = page.getByTestId('civilization-scene-panel');
    await expect(panel).toBeVisible();
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>('[data-testid="civilization-scene-panel"] img'));
      return images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0);
    });
    const srcs = await panel.locator('img[src*="artifact-atlas-v4"]').evaluateAll(images => images.map(image => (image as HTMLImageElement).currentSrc));
    for (const src of srcs) {
      const id = src.match(/(t[23][rseop])-artifact-atlas-v4/)?.[1];
      if (id) loaded.add(id);
    }
    for (const id of await panel.locator('[data-artifact-unit]').evaluateAll(elements => elements.map(element => element.getAttribute('data-artifact-unit')!))) {
      renderedArtifacts.add(id);
    }
    await panel.screenshot({ path: testInfo.outputPath(`audited-${scene}.png`), animations: 'disabled' });
  }
  expect([...loaded].sort()).toEqual(['t2e', 't2o', 't2p', 't2r', 't2s', 't3e', 't3r']);
  for (const prefix of loaded) {
    const count = prefix.startsWith('t2') ? 6 : 4;
    for (let index = 1; index <= count; index++) expect(renderedArtifacts.has(`${prefix}0${index}`)).toBe(true);
  }
  expect(errors).toEqual([]);
});
