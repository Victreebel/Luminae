import { expect, test } from 'playwright/test';
import { ARTIFACT_CANON } from '../../lib/game-types/src/artifact-canon';
import { ARTIFACT_TIER_AUDIT_BY_ID } from '../../lib/game-types/src/artifact-tier-audit';

const representatives = Object.keys(ARTIFACT_CANON) as Array<keyof typeof ARTIFACT_CANON>;

for (const id of representatives) {
  test(`${id} shows its audited artwork, function, and Event properties on mobile`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/dev/card-browser?id=${id}`);
    const canon = ARTIFACT_CANON[id];
    await expect(page.getByText(`${canon.functionalText} ${canon.mystery}`, { exact: true })).toBeVisible();
    const art = page.locator(`[style*="/${id}.webp"]`);
    await expect(art).toBeVisible();
    const url = await art.evaluate(element => getComputedStyle(element).backgroundImage.slice(5, -2));
    expect((await page.request.get(url)).ok()).toBe(true);
    await expect(page.getByTestId('artifact-event-facts')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.getByRole('button', { name: 'Dev Details' }).click();
    await expect(page.getByText(ARTIFACT_TIER_AUDIT_BY_ID[id].confinementTest, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${id}-mobile-inspection.png`), fullPage: true });
  });
}

for (const tier of [1, 2, 3] as const) {
 for (const frame of ['full', 'compact']) {
  const id = `t${tier}s01` as keyof typeof ARTIFACT_CANON;
  test(`${id} remains legible after cosmic refill in mobile ${frame} Forge`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/dev/anim-sandbox?forgeMobilePreview=1&tier=${tier}&affinity=continuum&frame=${frame}&play=1&rate=2&sound=0`);
    await expect(page.locator('.forge-mobile-scene__status')).toContainText(ARTIFACT_CANON[id].name, { timeout: 15_000 });
    await expect(page.locator('[data-forge-density]').first()).toHaveAttribute('data-forge-density', frame);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${id}-mobile-${frame}.png`) });
  });
 }
}
