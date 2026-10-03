import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(ROOT, 'artifacts/qa/vertical-slice-2026-09-10');
const VIEWPORTS = [
  { name: 'phone-320', width: 320, height: 568 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;
const PROOFS = ['base', 'loadout-a', 'loadout-b'] as const;
const BASE_PATH = '/dev/civilization-scene?tier=galactic&dyad=echo&preset=balanced&stability=stable&condition=none';

mkdirSync(OUT, { recursive: true });

for (const viewport of VIEWPORTS) {
  test(`${viewport.name} preserves the shell and distinguishes civilization histories`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const proof of PROOFS) {
      await page.goto(`${BASE_PATH}&proof=${proof}`, { waitUntil: 'networkidle' });
      const scene = page.getByTestId('civilization-scene-panel');
      await expect(scene).toBeVisible();
      await expect(page.locator('body')).toHaveJSProperty('clientWidth', viewport.width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      if (proof === 'base') {
        await expect(page.getByText(/Zero Artifacts: sparse neutral environment/i)).toBeVisible();
        await expect(page.getByText(/Clean plate: no Artifact manifestations/i)).toBeVisible();
        await expect(scene.getByTestId('civilization-artifact-structure')).toHaveCount(0);
      } else {
        await expect(page.getByText(
          proof === 'loadout-a'
            ? /Loadout A: 16 distinct Artifacts on the shared camera/i
            : /Loadout B: 16 different Artifacts on the shared camera/i,
        )).toBeVisible();
        await expect(page.getByText('16/16')).toBeVisible();
      }

      if (proof === 'base') {
        await page.screenshot({
          path: resolve(OUT, `${viewport.name}-shell.png`),
          animations: 'disabled',
        });
      }
      await scene.screenshot({
        path: resolve(OUT, `${viewport.name}-civilization-${proof}.png`),
        animations: 'disabled',
      });
    }
  });
}
