import { expect, test, type Page } from "playwright/test";

const phoneProjects = new Set(["compact-phone", "phone-portrait"]);

const surfaces = [
  {
    name: "Trace decision",
    path: "/dev/trace-chronicle?phase=decision&method=expose_all_routes&run=primary&prepared=0&motion=full",
    landmark: '[aria-label="Crownfall guidance decision"]',
  },
  {
    name: "Recurrence decision",
    path: "/dev/recurrence-chronicle?phase=decision&method=establish_dual_custody&run=primary&prepared=0&motion=full",
    landmark: '[aria-label="Deep Index custody decision"]',
  },
  {
    name: "Triangulation alignment",
    path: "/dev/triangulation-chronicle?phase=alignment&architecture=establish_unowned_measure&reference=deme&run=primary&prepared=0&memory=on&motion=full",
    landmark: '[aria-label="Three-Bearing Alignment"]',
  },
  {
    name: "Lumii threshold",
    path: "/dev/lumii-vault-encounter?phase=approach&route=inquiry&attempt=first&cipher=inert&covenant=intact&viewport=mobile&audio=off&motion=full&mode=inspect",
    landmark: '[aria-label="Lumii Vault encounter"]',
  },
  {
    name: "Opened Vault hub",
    path: "/dev/blueprint-vault?state=opened",
    landmark: '[aria-label="Opened Vault status"]',
  },
  {
    name: "Civilization portrait",
    path: "/dev/civilization-scene?tier=planetary&scan=0&preset=balanced",
    landmark: '[data-testid="civilization-scene-panel"]',
  },
  {
    name: "Civilization scan",
    path: "/dev/civilization-scene?tier=stellar&scan=1&preset=foundry",
    landmark: '[data-testid="civilization-scene-panel"]',
  },
  {
    name: "Foundry manifestation",
    path: "/dev/blueprint-presentation?blueprint=foundry&motion=full",
    landmark: '[data-testid="foundry-manifestation"]',
  },
  {
    name: "Worldshield manifestation",
    path: "/dev/blueprint-presentation?blueprint=worldshield&motion=reduced",
    landmark: '[data-testid="worldshield-manifestation"]',
  },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content, `document width ${dimensions.content}px exceeds ${dimensions.viewport}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function expectVisibleLandmarkInsideViewport(page: Page, selector: string) {
  const landmark = page.locator(selector);
  await expect(landmark).toBeVisible({ timeout: 20_000 });
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect.poll(async () => {
    const box = await landmark.boundingBox();
    if (!box) return null;
    return {
      left: Math.max(0, -box.x),
      right: Math.max(0, box.x + box.width - viewport!.width),
    };
  }, {
    message: `${selector} did not settle within the viewport`,
    timeout: 5_000,
  }).toEqual({ left: 0, right: 0 });
}

for (const surface of surfaces) {
  test(`${surface.name} stays legible and within the viewport`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(surface.path, { waitUntil: "domcontentloaded" });
    // The Chronicle and manifestation layers intentionally settle from a
    // shallow entrance transform. Measure their final composition, not the
    // transient overscan hidden by the full-screen stage.
    await page.waitForTimeout(900);
    await expectVisibleLandmarkInsideViewport(page, surface.landmark);
    await expectNoHorizontalOverflow(page);
    await expect(page.getByText("0 / 0", { exact: true })).toHaveCount(0);
    await expect(page.getByText("0 / 1", { exact: true })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
}

test("opened Vault exposes a compact mobile section switch", async ({ page }, testInfo) => {
  test.skip(!phoneProjects.has(testInfo.project.name), "Mobile navigation contract");
  await page.goto("/dev/blueprint-vault?state=opened", { waitUntil: "domcontentloaded" });
  const recovered = page.getByRole("button", { name: "Recovered", exact: true });
  const sealed = page.getByRole("button", { name: "Sealed Records", exact: true });
  await expect(recovered).toBeVisible();
  await expect(recovered).toHaveAttribute("aria-pressed", "true");
  await sealed.click();
  await expect(sealed).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[aria-label="Sealed Campaign Records"]')).toBeVisible();
  await expect(page.locator('[aria-label="Recovered Blueprint"]')).toBeHidden();
});

test("first Civilization guidance preserves the mobile portrait", async ({ page }, testInfo) => {
  test.skip(!phoneProjects.has(testInfo.project.name), "Mobile composition contract");
  await page.goto("/dev/civilization-scene?tier=planetary&scan=0&preset=balanced", {
    waitUntil: "domcontentloaded",
  });
  const portrait = page.locator('[aria-label^="Civilization portrait where"]');
  const guide = page.locator('[data-testid="civilization-portrait-guide"]');
  await expect(portrait).toBeVisible();
  await expect(guide).toBeVisible();
  const portraitBox = await portrait.boundingBox();
  const guideBox = await guide.boundingBox();
  expect(portraitBox).not.toBeNull();
  expect(guideBox).not.toBeNull();
  expect(guideBox!.height).toBeLessThanOrEqual(portraitBox!.height * 0.32);
});

test("Civilization scan exposes its compact mobile site rail", async ({ page }, testInfo) => {
  test.skip(!phoneProjects.has(testInfo.project.name), "Mobile scan contract");
  await page.goto("/dev/civilization-scene?tier=stellar&scan=1&preset=foundry", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('[data-testid="civilization-mobile-scan-rail"]')).toBeVisible();
});

for (const reducedMotion of [false, true]) {
  test(`first Forge teaches payment return with ${reducedMotion ? "reduced" : "full"} motion`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
    await page.goto("/tutorial?beatId=b9_first_forge&tutorialDebug=1", {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", {
      name: "Replication Spore, Tier 1 Artifact",
      exact: true,
    }).click();
    await page.getByRole("button", {
      name: "FORGE — Forge Artifact —",
      exact: true,
    }).click();
    await page.getByRole("button", {
      name: "CONFIRM — Confirming… —",
      exact: true,
    }).click();

    const affinityReturn = page.locator(
      '[aria-label="Forged Affinities returning to the Well"]',
    );
    await expect(affinityReturn).toBeVisible({ timeout: 2_500 });
    await expect(page.getByText(
      "The Affinities return to the Well after the Artifact is Forged.",
      { exact: true },
    )).toBeVisible();
    await expect(page.getByRole("button", {
      name: "Flare Flare 0 Reservoir 7 of 7",
      exact: true,
    })).toBeVisible();
    await expect(page.getByRole("button", {
      name: "Continuum Continuum 0 Reservoir 7 of 7",
      exact: true,
    })).toBeVisible();
    await expect(page.getByRole("button", {
      name: "Radiance Radiance 0 Reservoir 7 of 7",
      exact: true,
    })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });
}

for (const covenant of ["intact", "broken"] as const) {
  for (const motion of ["full", "reduced"] as const) {
    test(`Foundry ${covenant} aftermath separates exceptional storage with ${motion} motion`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.emulateMedia({ reducedMotion: motion === "reduced" ? "reduce" : "no-preference" });
      await page.goto(`/dev/foundry-storage?covenant=${covenant}&motion=${motion}`, {
        waitUntil: "domcontentloaded",
      });

      const preview = page.locator('[data-foundry-storage-preview="true"]');
      const ordinaryGroup = page.locator('[data-encrypted-artifacts-group="true"]');
      const foundryGroup = page.locator('[data-foundry-components-group="true"]');
      await expect(preview).toHaveAttribute("data-covenant", covenant);
      await expect(preview).toHaveAttribute("data-motion", motion);
      await expect(page.locator('[aria-label="Blueprint assembly and manifested devices"]')).toBeVisible();
      await expect(ordinaryGroup).toBeVisible();
      await expect(ordinaryGroup).toContainText("Encrypted");
      await expect(ordinaryGroup).toContainText("(3/3)");
      await expect(foundryGroup).toBeVisible();
      await expect(foundryGroup).toContainText("Foundry Components");
      await expect(foundryGroup).toContainText("(3)");
      await expect(page.getByText("(6/3)", { exact: true })).toHaveCount(0);

      if (covenant === "broken") {
        await expect(page.getByRole("button", { name: "Recover", exact: true })).toHaveCount(3);
        await page.getByRole("button", { name: "Recover", exact: true }).first().click();
        await expect(foundryGroup).toContainText("(2)");
        await expect(page.getByText("2 components awaiting recovery", { exact: true })).toBeVisible();
      } else {
        await expect(page.getByText("Paid re-Forge", { exact: true })).toHaveCount(3);
        await expect(page.getByRole("button", { name: "Recover", exact: true })).toHaveCount(0);
        await expect(page.getByText("3 components in Cipher storage", { exact: true })).toBeVisible();
      }

      await expectNoHorizontalOverflow(page);
      expect(pageErrors).toEqual([]);
    });
  }
}
