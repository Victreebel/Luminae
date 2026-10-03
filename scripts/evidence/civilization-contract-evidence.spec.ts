import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from 'playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(ROOT, 'artifacts/qa/civilization-contract');

const DYADS = [
  'vortex',
  'flux',
  'bloom',
  'chrysalis',
  'orbit',
  'canopy',
  'eclipse',
  'lineage',
  'echo',
  'spore',
] as const;

const DYAD_COMPOSITIONS: Record<typeof DYADS[number], string> = {
  vortex: 'radial-convergence',
  flux: 'kinetic-helix',
  bloom: 'incandescent-branching',
  chrysalis: 'armored-metamorphosis',
  orbit: 'harmonic-orbits',
  canopy: 'luminous-canopy',
  eclipse: 'occluded-corona',
  lineage: 'braided-lineage',
  echo: 'recursive-echo',
  spore: 'spore-lattice',
};

const SCENES = [
  { id: 'surface', tier: 'planetary' },
  { id: 'orbit', tier: 'planetary' },
  { id: 'stellar', tier: 'stellar' },
  { id: 'galaxy', tier: 'galactic' },
] as const;

const ENVIRONMENTS = [
  'aurora_basin',
  'terminator_reach',
  'oceanic_scar',
  'obsidian_steppe',
] as const;

const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 1000 },
  { id: 'mobile', width: 390, height: 844 },
] as const;

const CONDITIONS = ['damaged', 'isolated', 'quarantined', 'disrupted'] as const;

mkdirSync(OUT, { recursive: true });

type LayoutRecord = {
  key: string;
  style: string;
  anchor: string | null;
  rect: { x: number; y: number; width: number; height: number };
};

function buildProofPath({
  dyad,
  scene,
  tier,
  environment,
  proof = 'saturated',
  condition = 'none',
  scan = false,
  legacy = false,
}: {
  dyad: typeof DYADS[number];
  scene: typeof SCENES[number]['id'];
  tier: typeof SCENES[number]['tier'];
  environment: typeof ENVIRONMENTS[number];
  proof?:
    | 'zero'
    | 'one'
    | 'two'
    | 'developing-three'
    | 'planetary-city'
    | 'stellar-city'
    | 'galactic-city'
    | 'saturated'
    | 'evolution';
  condition?: typeof CONDITIONS[number] | 'none';
  scan?: boolean;
  legacy?: boolean;
}) {
  const params = new URLSearchParams({
    proof,
    dyad,
    tier,
    scene,
    environment,
    stability: condition === 'none' ? 'stable' : 'unstable',
    condition,
  });
  if (scan) params.set('scan', '1');
  if (legacy) params.set('legacy', '1');
  return `/dev/civilization-scene?${params.toString()}`;
}

test('civilization density progresses from wilderness through a saturated metropolis', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const proofs = [
    { proof: 'zero' as const, phase: 'wilderness', artifactCount: 0, substrate: 'natural-world' },
    { proof: 'one' as const, phase: 'nucleus', artifactCount: 1, substrate: 'inhabited-growth' },
    { proof: 'two' as const, phase: 'city', artifactCount: 2, substrate: 'inhabited-growth' },
    { proof: 'saturated' as const, phase: 'metropolis', artifactCount: null, substrate: 'inhabited-growth' },
  ];
  const screenshotHashes: string[] = [];
  const progressionEvidence: Array<{
    proof: string;
    phase: string;
    artifactCount: number;
    densityStage: string | null;
    screenshotHash: string;
  }> = [];

  for (const state of proofs) {
    await page.goto(buildProofPath({
      dyad: 'bloom',
      scene: 'surface',
      tier: 'planetary',
      environment: 'obsidian_steppe',
      proof: state.proof,
    }), { waitUntil: 'networkidle' });
    const panel = await waitForScenePlate(page);
    const artifactStructures = page.getByTestId('civilization-artifact-structure');

    await expect(page.getByTestId('civilization-plate-art'))
      .toHaveAttribute('data-art-substrate', state.substrate);
    if (state.artifactCount === null) {
      expect(await artifactStructures.count()).toBeGreaterThan(2);
    } else {
      await expect(artifactStructures).toHaveCount(state.artifactCount);
    }

    const continuity = page.getByTestId('civilization-identity-continuity');
    if (state.phase === 'wilderness') {
      await expect(page.getByTestId('civilization-active-identity-infrastructure')).toHaveCount(0);
      await expect(continuity).toHaveAttribute('data-active-status', 'plain');
    } else if (state.phase === 'nucleus') {
      const settlement = page.getByTestId('civilization-active-identity-infrastructure');
      await expect(settlement).toHaveAttribute('data-settlement-phase', 'nucleus');
      await expect(settlement).toHaveAttribute('data-settlement-style', 'neutral-forming');
      await expect(settlement).toHaveAttribute('data-settlement-count', '2');
    } else if (state.phase === 'city') {
      const settlement = page.getByTestId('civilization-active-identity-infrastructure');
      await expect(settlement).toHaveAttribute('data-city-development-stage', '2');
      await expect(settlement).toHaveAttribute('data-city-fabric-source', 'physical-district-layer');
      await expect(settlement).toHaveAttribute('data-settlement-count', '4');
      await expect(page.locator('[data-city-settlement-footprint="built-environment"]')).toHaveCount(1);
    } else {
      const settlement = page.getByTestId('civilization-active-identity-infrastructure');
      await expect(settlement).toHaveAttribute('data-settlement-phase', 'metropolis');
      await expect(settlement).toHaveAttribute('data-density-model', 'cumulative-construction');
      await expect(settlement).toHaveAttribute('data-settlement-count', '8');
      expect(await settlement.locator('[data-settlement-structure]').evaluateAll((elements) => (
        elements.every((element) => getComputedStyle(element).opacity === '1')
      ))).toBe(true);
    }

    const screenshot = await panel.screenshot({
      path: resolve(OUT, `settlement-${state.proof}.png`),
      animations: 'disabled',
    });
    const screenshotHash = createHash('sha256').update(screenshot).digest('hex');
    screenshotHashes.push(screenshotHash);
    progressionEvidence.push({
      proof: state.proof,
      phase: state.phase,
      artifactCount: await artifactStructures.count(),
      densityStage: await page.getByTestId('civilization-active-identity-infrastructure').count()
        ? await page.getByTestId('civilization-active-identity-infrastructure').getAttribute('data-density-stage')
        : null,
      screenshotHash,
    });
  }

  expect(new Set(screenshotHashes).size).toBe(proofs.length);
  writeFileSync(
    resolve(OUT, 'settlement-progression-evidence.json'),
    `${JSON.stringify(progressionEvidence, null, 2)}\n`,
    'utf8',
  );
});

test('Chrysalis preserves one recognizable city across all seven development stages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const stages = [
    { proof: 'zero' as const, stage: '0', artifacts: 0, label: 'landscape' },
    { proof: 'one' as const, stage: '1', artifacts: 1, label: 'developing-i' },
    { proof: 'two' as const, stage: '2', artifacts: 2, label: 'developing-ii' },
    { proof: 'developing-three' as const, stage: '3', artifacts: 5, label: 'developing-iii' },
    { proof: 'planetary-city' as const, stage: '4', artifacts: 6, label: 'planetary-city' },
    { proof: 'stellar-city' as const, stage: '5', artifacts: 6, label: 'stellar-city' },
    { proof: 'galactic-city' as const, stage: '6', artifacts: 6, label: 'galactic-city' },
  ];
  const evidence: Array<{
    proof: string;
    stage: string;
    artSlot: string | null;
    artifactCount: number;
    screenshotHash: string;
  }> = [];

  for (const state of stages) {
    await page.goto(buildProofPath({
      dyad: 'chrysalis',
      scene: 'surface',
      tier: state.proof === 'galactic-city'
        ? 'galactic'
        : state.proof === 'stellar-city'
          ? 'stellar'
          : 'planetary',
      environment: 'aurora_basin',
      proof: state.proof,
    }), { waitUntil: 'networkidle' });
    const panel = await waitForScene(page);
    const settlement = page.getByTestId('civilization-active-identity-infrastructure');
    const plate = page.getByTestId('civilization-plate-art');
    const structures = page.getByTestId('civilization-artifact-structure');

    await expect(plate).toHaveAttribute('data-art-substrate', state.stage === '0'
      ? 'natural-world'
      : 'inhabited-growth');
    await expect(plate).toHaveAttribute('data-civilization-maturity', state.proof === 'galactic-city'
      ? 'galactic'
      : state.proof === 'stellar-city'
        ? 'stellar'
        : 'planetary');
    await expect(structures).toHaveCount(state.artifacts);
    if (state.stage === '0') {
      await expect(settlement).toHaveCount(0);
    } else if (Number(state.stage) < 3) {
      await expect(settlement).toHaveAttribute('data-city-development-stage', state.stage);
      await expect(settlement).toHaveAttribute('data-settlement-style', 'neutral-forming');
      await expect(settlement).not.toHaveAttribute('data-city-fabric-layout', /.+/);
      await expect(settlement).toHaveAttribute('data-city-fabric-source', 'authored-growth-plate');
    } else {
      await expect(settlement).toHaveAttribute('data-city-development-stage', state.stage);
      await expect(settlement).toHaveAttribute('data-city-fabric-layout', 'chrysalis');
      await expect(settlement).toHaveAttribute('data-city-fabric-source', 'authored-growth-plate');
    }

    const screenshot = await panel.screenshot({
      path: resolve(OUT, `chrysalis-city-stage-${state.stage}-${state.label}.png`),
      animations: 'disabled',
    });
    evidence.push({
      proof: state.proof,
      stage: state.stage,
      artSlot: await plate.getAttribute('data-art-slot'),
      artifactCount: await structures.count(),
      screenshotHash: createHash('sha256').update(screenshot).digest('hex'),
    });
  }

  expect(new Set(evidence.map((entry) => entry.screenshotHash)).size).toBe(stages.length);
  expect(new Set(evidence.map((entry) => entry.artSlot)).size).toBe(stages.length);
  writeFileSync(
    resolve(OUT, 'chrysalis-seven-stage-evidence.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8',
  );
});

test('the same City, Planet, and home System visibly advance through Kardashev tiers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const tiers = [
    { tier: 'planetary' as const, stage: '1', maturity: 'planetary' },
    { tier: 'stellar' as const, stage: '2', maturity: 'stellar' },
    { tier: 'galactic' as const, stage: '3', maturity: 'galactic' },
  ];
  const expectedScenes = ['surface', 'orbit'] as const;
  const artifactAnchorsByTier = new Map<string, Map<string, string>>();

  for (const scene of expectedScenes) {
    const hashes: string[] = [];
    for (const state of tiers) {
      await page.goto(buildProofPath({
        dyad: 'chrysalis',
        scene,
        tier: state.tier,
        environment: 'oceanic_scar',
      }), { waitUntil: 'networkidle' });
      const panel = await waitForScene(page);
      await expect(panel).toHaveAttribute('data-complexity', state.stage);
      await expect(page.getByTestId('civilization-plate-art'))
        .toHaveAttribute('data-evolution-stage', state.stage);
      await expect(page.getByTestId('civilization-plate-art'))
        .toHaveAttribute('data-civilization-maturity', state.maturity);
      await expect(page.getByTestId('civilization-identity-continuity'))
        .toHaveAttribute('data-active-dyad', 'chrysalis');

      if (scene === 'orbit') {
        await expect(page.locator('[data-planetary-settlement-lights="inhabited-regions"]'))
          .toHaveCount(1);
      }

      const anchors = await panel.locator('[data-testid="civilization-artifact-structure"]').evaluateAll(
        (elements) => Object.fromEntries(elements.map((element) => [
          (element as HTMLElement).dataset.artifactUnit ?? '',
          (element as HTMLElement).dataset.worldAnchor ?? '',
        ])),
      );
      const anchorMap = new Map(Object.entries(anchors));
      const tierKey = `${scene}:${state.tier}`;
      artifactAnchorsByTier.set(tierKey, anchorMap);

      const screenshot = await panel.screenshot({
        path: resolve(OUT, `kardashev-${scene}-${state.tier}.png`),
        animations: 'disabled',
      });
      hashes.push(createHash('sha256').update(screenshot).digest('hex'));
    }
    expect(new Set(hashes).size).toBe(tiers.length);

    const baseline = artifactAnchorsByTier.get(`${scene}:planetary`)!;
    for (const state of tiers.slice(1)) {
      const current = artifactAnchorsByTier.get(`${scene}:${state.tier}`)!;
      for (const [artifactId, anchor] of baseline) {
        expect(current.get(artifactId)).toBe(anchor);
      }
    }
  }

  const systemHashes: string[] = [];
  for (const state of tiers.slice(1)) {
    await page.goto(buildProofPath({
      dyad: 'chrysalis',
      scene: 'stellar',
      tier: state.tier,
      environment: 'oceanic_scar',
    }), { waitUntil: 'networkidle' });
    const panel = await waitForScene(page);
    await expect(panel).toHaveAttribute('data-complexity', state.stage);
    const settlement = page.getByTestId('civilization-active-identity-infrastructure');
    await expect(settlement).toHaveAttribute('data-density-model', 'cumulative-construction');
    await expect(settlement).toHaveAttribute('data-density-stage', state.stage);
    await expect(settlement).toHaveAttribute('data-settlement-count', state.stage);
    await expect(page.locator('[data-megastructure-status="ordinary-infrastructure"]'))
      .toHaveCount(Number(state.stage));
    const screenshot = await panel.screenshot({
      path: resolve(OUT, `kardashev-stellar-${state.tier}.png`),
      animations: 'disabled',
    });
    systemHashes.push(createHash('sha256').update(screenshot).digest('hex'));
  }
  expect(new Set(systemHashes).size).toBe(2);
});

async function waitForScenePlate(page: Page) {
  const panel = page.getByTestId('civilization-scene-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('civilization-plate-art')).toBeVisible();

  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(
      '[data-testid="civilization-scene-panel"] img',
    ));
    return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0);
  });

  const dismissEvolutionNotice = panel.getByRole('button', {
    name: 'Dismiss civilization evolution notice',
  });
  if (await dismissEvolutionNotice.count()) {
    await dismissEvolutionNotice.first().evaluate((button) => (
      (button as HTMLButtonElement).click()
    ));
    await expect(dismissEvolutionNotice).toHaveCount(0, { timeout: 5_000 });
  }
  return panel;
}

async function waitForScene(page: Page) {
  const panel = await waitForScenePlate(page);
  await expect(page.getByTestId('civilization-artifact-manifestation-layer')).toHaveAttribute(
    'data-world-layout',
    'invariant',
  );
  return panel;
}

async function readPhysicalLayout(panel: Locator): Promise<LayoutRecord[]> {
  return panel.evaluate((root) => {
    const camera = root.querySelector<HTMLElement>('[data-testid="civilization-scene-camera"]');
    const cameraRect = camera?.getBoundingClientRect() ?? root.getBoundingClientRect();
    return Array.from(root.querySelectorAll<HTMLElement>([
      '[data-testid="civilization-authored-host"]',
      '[data-testid="civilization-artifact-structure"]',
      '[data-testid^="civilization-blueprint-"][data-blueprint-id]',
      '[data-testid="civilization-nested-city-region"]',
      '[data-testid="civilization-nested-planet"]',
      '[data-testid="civilization-nested-system"]',
    ].join(','))).map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        key: element.dataset.artifactUnit ?? element.dataset.blueprintId ?? String(index),
        style: element.getAttribute('style') ?? '',
        anchor: element.dataset.worldAnchor ?? null,
        rect: {
          x: Math.round((rect.x - cameraRect.x) * 100) / 100,
          y: Math.round((rect.y - cameraRect.y) * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        },
      };
    });
  });
}

for (const dyad of DYADS) {
  test(`${dyad} retains physical identity across every scale and viewport`, async ({ page }) => {
    const evidence: Array<{
      viewport: string;
      scene: string;
      environment: string;
      screenshotHash: string;
      manifestations: number;
    }> = [];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const [sceneIndex, scene] of SCENES.entries()) {
        const environment = ENVIRONMENTS[(DYADS.indexOf(dyad) + sceneIndex) % ENVIRONMENTS.length]!;
        await page.goto(buildProofPath({
          dyad,
          scene: scene.id,
          tier: scene.tier,
          environment,
          legacy: scene.id === 'galaxy',
        }), { waitUntil: 'networkidle' });
        const panel = await waitForScene(page);

        await expect(panel).toHaveAttribute('data-scene', scene.id);
        await expect(page.getByTestId('civilization-project-zones')).toHaveCount(0);
        await expect(page.locator('[data-testid="civilization-morphology-layer"]')).toHaveCount(0);
        await expect(page.locator('[data-composition="network"]')).toHaveCount(0);
        const continuity = page.getByTestId('civilization-identity-continuity');
        const settlement = page.getByTestId('civilization-active-identity-infrastructure');
        await expect(continuity).toHaveAttribute('data-active-status', 'committed');
        await expect(continuity).toHaveAttribute('data-active-dyad', dyad);
        const usesAuthoredScalePlate = await continuity.getAttribute('data-continuity-source') ===
          'authored-scale-plate';
        if (usesAuthoredScalePlate) {
          await expect(settlement).toHaveCount(0);
          await expect(page.getByTestId('civilization-plate-art'))
            .toHaveAttribute('data-art-slot', /chrysalis-mature/);
        } else {
          await expect(settlement).toHaveAttribute('data-identity-dyad', dyad);
          await expect(settlement).toHaveAttribute('data-fabric-composition', DYAD_COMPOSITIONS[dyad]);
          expect(await settlement.locator('[data-settlement-structure]').count()).toBeGreaterThan(0);
        }

        const artifactLayer = page.getByTestId('civilization-artifact-manifestation-layer');
        const physicalLayoutBeforeScan = await readPhysicalLayout(panel);
        expect(physicalLayoutBeforeScan.length).toBeGreaterThan(0);
        const artifactUnits = await panel.locator('[data-testid="civilization-artifact-structure"]')
          .evaluateAll((elements) => elements.map((element) => (
            (element as HTMLElement).dataset.artifactUnit ?? ''
          )));
        const blueprintUnits = await panel.locator('[data-blueprint-id][data-representation-mode]')
          .evaluateAll((elements) => elements.map((element) => (
            (element as HTMLElement).dataset.blueprintId ?? ''
          )));
        expect(new Set(artifactUnits).size).toBe(artifactUnits.length);
        expect(new Set(blueprintUnits).size).toBe(blueprintUnits.length);
        await expect(panel.locator(
          '[data-testid="civilization-artifact-structure"][data-physical-validity="authored"]',
        )).toHaveCount(artifactUnits.length);
        if (scene.id === 'surface') {
          await expect(panel.getByTestId('civilization-artifact-physical-support'))
            .toHaveCount(artifactUnits.length);
          const distribution = await panel.locator(
            '[data-testid="civilization-artifact-structure"]',
          ).evaluateAll((elements) => {
            const points = elements.map((element) => {
              const [x, y] = ((element as HTMLElement).dataset.worldAnchor ?? '0,0')
                .split(',')
                .map(Number);
              return { x, y };
            });
            return {
              xSpan: Math.max(...points.map((point) => point.x)) -
                Math.min(...points.map((point) => point.x)),
              ySpan: Math.max(...points.map((point) => point.y)) -
                Math.min(...points.map((point) => point.y)),
              physicalContractsComplete: elements.every((element) => {
                const data = (element as HTMLElement).dataset;
                return Boolean(
                  data.district && data.substrate && data.requiredSupport &&
                  data.authoredDepth && data.occlusion,
                );
              }),
              depthCounts: elements.reduce((counts, element) => {
                const depth = (element as HTMLElement).dataset.authoredDepth ?? 'unknown';
                counts[depth] = (counts[depth] ?? 0) + 1;
                return counts;
              }, {} as Record<string, number>),
            };
          });
          expect(distribution.xSpan).toBeGreaterThanOrEqual(viewport.id === 'mobile' ? 72 : 76);
          expect(distribution.ySpan).toBeGreaterThanOrEqual(viewport.id === 'mobile' ? 42 : 40);
          expect(distribution.physicalContractsComplete).toBe(true);
          expect(distribution.depthCounts.foreground ?? 0).toBeLessThanOrEqual(2);
          expect(distribution.depthCounts.midground ?? 0)
            .toBeGreaterThanOrEqual(Math.floor(artifactUnits.length * 0.4));
          expect(distribution.depthCounts.distance ?? 0)
            .toBeGreaterThanOrEqual(Math.floor(artifactUnits.length * 0.35));
        }
        await expect(panel.locator('[data-source-quality="placeholder"]')).toHaveCount(0);
        expect(await panel.locator('img').evaluateAll((images) => images.every((image) => (
          !(image as HTMLImageElement).currentSrc.toLowerCase().includes('placeholder')
        )))).toBe(true);
        if (scene.id === 'surface') {
          await expect(settlement).toHaveAttribute('data-city-fabric-layout', dyad);
          await expect(settlement).toHaveAttribute('data-city-fabric-source', /authored-growth-plate|physical-district-layer/);
        } else if (usesAuthoredScalePlate) {
          await expect(continuity).toHaveAttribute('data-continuity-source', 'authored-scale-plate');
        } else {
          const nestedTestId = scene.id === 'orbit'
            ? 'civilization-nested-city-region'
            : scene.id === 'stellar'
              ? 'civilization-nested-planet'
              : 'civilization-nested-system';
          await expect(page.getByTestId(nestedTestId)).toBeVisible();
        }
        if (scene.id === 'galaxy') {
          const colonizedSystems = page.locator('[data-colonized-system="true"]');
          await expect(colonizedSystems).toHaveCount(4);
          if (viewport.id === 'mobile') {
            const outerSystemWidths = await colonizedSystems.evaluateAll((elements) => (
              elements.slice(0, 3).map((element) => element.getBoundingClientRect().width)
            ));
            expect(Math.min(...outerSystemWidths)).toBeGreaterThanOrEqual(50);
          }
        }

        const overflow = await page.evaluate(() => (
          document.documentElement.scrollWidth - document.documentElement.clientWidth
        ));
        expect(overflow).toBeLessThanOrEqual(1);

        const screenshot = await panel.screenshot({
          path: resolve(OUT, `${viewport.id}-${dyad}-${scene.id}.png`),
          animations: 'disabled',
        });
        const screenshotHash = createHash('sha256').update(screenshot).digest('hex');

        const scanButton = panel.getByRole('button', { name: 'Scan' });
        await expect(scanButton).toHaveCount(1);
        await scanButton.click();
        await expect(scanButton).toHaveAttribute('aria-pressed', 'true');
        await expect(artifactLayer).toHaveAttribute('data-render-mode', 'scan-annotation');

        const physicalLayoutAfterScan = await readPhysicalLayout(panel);
        expect(physicalLayoutAfterScan).toEqual(physicalLayoutBeforeScan);
        if (dyad === 'chrysalis') {
          await panel.screenshot({
            path: resolve(OUT, `${viewport.id}-chrysalis-${scene.id}-scan.png`),
            animations: 'disabled',
          });
        }

        evidence.push({
          viewport: viewport.id,
          scene: scene.id,
          environment,
          screenshotHash,
          manifestations: physicalLayoutBeforeScan.length,
        });
      }
    }

    expect(new Set(evidence.map((entry) => entry.screenshotHash)).size).toBe(evidence.length);
    writeFileSync(
      resolve(OUT, `${dyad}-evidence.json`),
      `${JSON.stringify(evidence, null, 2)}\n`,
      'utf8',
    );
  });
}

test('four players receive visibly distinct neutral starting environments', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const hashes: string[] = [];

  for (const [seatIndex, environment] of ENVIRONMENTS.entries()) {
    const params = new URLSearchParams({
      proof: 'base',
      tier: 'planetary',
      scene: 'surface',
      environment,
      stability: 'stable',
      condition: 'none',
    });
    await page.goto(`/dev/civilization-scene?${params.toString()}`, { waitUntil: 'networkidle' });
    const panel = await waitForScenePlate(page);
    await expect(panel).toHaveAttribute('data-scene', 'surface');
    await expect(page.getByTestId('civilization-artifact-manifestation-layer'))
      .toHaveAttribute('data-world-layout', 'invariant');
    await expect(page.getByTestId('civilization-artifact-structure')).toHaveCount(0);
    await expect(page.getByTestId('civilization-identity-continuity'))
      .toHaveAttribute('data-active-status', 'plain');

    const screenshot = await panel.screenshot({
      path: resolve(OUT, `neutral-seat-${seatIndex + 1}-${environment}.png`),
      animations: 'disabled',
    });
    hashes.push(createHash('sha256').update(screenshot).digest('hex'));
  }

  expect(new Set(hashes).size).toBe(ENVIRONMENTS.length);
});

test('Surface manifestations remain distributed and physically supported in every environment', async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const environment of ENVIRONMENTS) {
      await page.goto(buildProofPath({
        dyad: 'chrysalis',
        scene: 'surface',
        tier: 'planetary',
        environment,
      }), { waitUntil: 'networkidle' });
      const panel = await waitForScene(page);
      const structures = panel.getByTestId('civilization-artifact-structure');
      const count = await structures.count();

      await expect(panel.locator(
        '[data-testid="civilization-artifact-structure"][data-physical-validity="authored"]',
      )).toHaveCount(count);
      await expect(panel.getByTestId('civilization-artifact-physical-support')).toHaveCount(count);

      const placementEvidence = await structures.evaluateAll((elements) => elements.map((element) => {
        const htmlElement = element as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();
        return {
          artifactId: htmlElement.dataset.artifactUnit,
          anchor: htmlElement.dataset.worldAnchor,
          district: htmlElement.dataset.district,
          substrate: htmlElement.dataset.substrate,
          support: htmlElement.dataset.requiredSupport,
          depth: htmlElement.dataset.authoredDepth,
          occlusion: htmlElement.dataset.occlusion,
          rect: {
            x: Math.round(rect.x * 100) / 100,
            y: Math.round(rect.y * 100) / 100,
            width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100,
          },
        };
      }));
      expect(new Set(placementEvidence.map((entry) => entry.anchor)).size).toBe(count);
      expect(new Set(placementEvidence.map((entry) => entry.district)).size).toBeGreaterThanOrEqual(8);
      const foregroundCount = placementEvidence.filter((entry) => entry.depth === 'foreground').length;
      const midgroundCount = placementEvidence.filter((entry) => entry.depth === 'midground').length;
      const distanceCount = placementEvidence.filter((entry) => entry.depth === 'distance').length;
      expect(foregroundCount).toBeLessThanOrEqual(2);
      expect(midgroundCount).toBeGreaterThanOrEqual(Math.floor(count * 0.4));
      expect(distanceCount).toBeGreaterThanOrEqual(Math.floor(count * 0.35));
      expect(placementEvidence.every((entry) => entry.occlusion === 'terrain' || entry.occlusion === 'architecture'))
        .toBe(true);

      await panel.screenshot({
        path: resolve(OUT, `grounding-${viewport.id}-${environment}.png`),
        animations: 'disabled',
      });
      writeFileSync(
        resolve(OUT, `grounding-${viewport.id}-${environment}.json`),
        `${JSON.stringify(placementEvidence, null, 2)}\n`,
        'utf8',
      );
    }
  }
});

test('Blueprint Great Works remain physical and scale-correct across native and distant scenes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto(buildProofPath({
    dyad: 'chrysalis',
    scene: 'orbit',
    tier: 'planetary',
    environment: 'oceanic_scar',
  }), { waitUntil: 'networkidle' });
  const orbitPanel = await waitForScene(page);
  await expect(page.getByTestId('civilization-blueprint-manifestations'))
    .toHaveAttribute('data-composition', 'persistent-physical');
  await expect(page.getByTestId('civilization-blueprint-manifestations'))
    .toHaveAttribute('data-visual-authority', 'blueprint-exclusive-projects');
  await expect(page.getByTestId('civilization-blueprint-mantle-native'))
    .toHaveAttribute('data-representation-mode', 'native-manifestation');
  await expect(page.getByTestId('civilization-blueprint-mantle-native'))
    .toHaveAttribute('data-megastructure-authority', 'blueprint-project');
  await orbitPanel.screenshot({
    path: resolve(OUT, 'blueprint-native-orbit.png'),
    animations: 'disabled',
  });

  await page.goto(buildProofPath({
    dyad: 'chrysalis',
    scene: 'stellar',
    tier: 'stellar',
    environment: 'oceanic_scar',
  }), { waitUntil: 'networkidle' });
  const stellarPanel = await waitForScene(page);
  await expect(page.getByTestId('civilization-blueprint-antimatter-native'))
    .toHaveAttribute('data-representation-mode', 'native-manifestation');
  await expect(page.getByTestId('civilization-blueprint-antimatter-native'))
    .toHaveAttribute('data-manifestation-scale', 'satellite');
  await expect(page.getByTestId('civilization-blueprint-mantle-native'))
    .toHaveAttribute('data-representation-mode', 'distant-consequence');
  await stellarPanel.screenshot({
    path: resolve(OUT, 'blueprint-native-stellar.png'),
    animations: 'disabled',
  });
});

test('localized conditions remain physical and do not replace the world plate', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  let stablePlateSource = '';

  for (const condition of CONDITIONS) {
    await page.goto(buildProofPath({
      dyad: 'chrysalis',
      scene: 'surface',
      tier: 'planetary',
      environment: 'aurora_basin',
      condition,
    }), { waitUntil: 'networkidle' });
    const panel = await waitForScene(page);
    const stateLayer = page.getByTestId('civilization-system-state');
    await expect(stateLayer).toHaveAttribute('data-state-composition', 'localized-physical');
    await expect(stateLayer).toHaveAttribute('data-conditions', condition);

    const plateSource = await page.getByTestId('civilization-plate-art').getAttribute('src');
    if (!stablePlateSource) stablePlateSource = plateSource ?? '';
    expect(plateSource).toBe(stablePlateSource);

    const expectedTreatment = condition === 'damaged'
      ? 'structural-damage'
      : condition === 'quarantined'
        ? 'quarantine-beacon'
        : condition === 'disrupted'
          ? 'power-disruption'
          : null;
    if (expectedTreatment) {
      await expect(stateLayer.locator(`[data-state-treatment="${expectedTreatment}"]`).first()).toBeVisible();
    }

    await panel.screenshot({
      path: resolve(OUT, `condition-${condition}.png`),
      animations: 'disabled',
    });
  }
});

test('nested scale identities are rendered as physical continuity, not translucent history', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const expectedDyadByScene = {
    surface: 'bloom',
    orbit: 'echo',
    stellar: 'vortex',
    galaxy: 'lineage',
  } as const;

  for (const scene of SCENES) {
    const params = new URLSearchParams({
      proof: 'evolution',
      tier: scene.tier,
      scene: scene.id,
      environment: 'terminator_reach',
      stability: 'stable',
      legacy: '1',
    });
    await page.goto(`/dev/civilization-scene?${params.toString()}`, { waitUntil: 'networkidle' });
    const panel = await waitForScene(page);
    const continuity = page.getByTestId('civilization-identity-continuity');
    const settlement = page.getByTestId('civilization-active-identity-infrastructure');
    await expect(continuity).toHaveAttribute('data-continuity-mode', 'physical-nesting');
    await expect(continuity).toHaveAttribute('data-active-status', 'committed');
    await expect(continuity).toHaveAttribute('data-active-dyad', expectedDyadByScene[scene.id]);
    if (scene.id === 'surface') {
      await expect(continuity).not.toHaveAttribute('data-continuity-socket', /.+/);
      await expect(continuity).toHaveAttribute('data-active-dyad', 'bloom');
      await expect(page.getByTestId('civilization-plate-art'))
        .toHaveAttribute('data-art-substrate', 'inhabited-growth');
      await expect(settlement).toHaveAttribute('data-fabric-composition', 'incandescent-branching');
      await expect(settlement).toHaveAttribute('data-settlement-anchor-source', 'environment-fabric-sockets');
    } else {
      await expect(continuity).toHaveAttribute('data-continuity-socket', /.+/);
    }
    await expect(settlement).toHaveAttribute('data-visual-role', 'physical-settlement-growth');
    if (scene.id === 'orbit') {
      await expect(page.locator('[data-planetary-settlement-lights="inhabited-regions"]')).toHaveCount(1);
    }
    if (scene.id === 'stellar') {
      await expect(page.getByTestId('civilization-plate-art'))
        .not.toHaveAttribute('data-art-slot', /growth-/);
      await expect(settlement)
        .toHaveAttribute('data-construction-model', 'distributed-system-infrastructure');
      const infrastructureCount = Number(await settlement.getAttribute('data-settlement-count'));
      await expect(page.locator('[data-stellar-development="relay-habitat-network"]'))
        .toHaveCount(infrastructureCount);
      await expect(page.locator('[data-megastructure-status="ordinary-infrastructure"]'))
        .toHaveCount(infrastructureCount);
      await expect(page.locator('[data-canonical-star-visibility="preserved"]'))
        .toHaveCount(1);
      await expect(page.locator('[data-system-field][data-celestial-anchor="home-star"]'))
        .toHaveAttribute('data-host-body-preserved', 'true');
      await expect(page.locator('[data-celestial-anchor="homeworld"]'))
        .toHaveAttribute('data-replaces-background-body', 'true');
    }
    if (scene.id === 'galaxy') {
      await expect(settlement).toHaveAttribute('data-settlement-count', '3');
      await expect(settlement)
        .toHaveAttribute('data-construction-model', 'colonized-stellar-neighborhoods');
      await expect(page.locator('[data-colonized-system="true"]')).toHaveCount(4);
    }
    await expect(page.locator('[data-continuity-medium="translucent-history"]')).toHaveCount(0);
    await panel.screenshot({
      path: resolve(OUT, `continuity-${scene.id}.png`),
      animations: 'disabled',
    });
  }
});

test('the production-shaped Civilization tab uses the authored renderer and exposes concrete victory paths', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dev/civilization-tab?assembly=4', { waitUntil: 'networkidle' });

  await expect(page.locator('[data-dev-civilization-tab="true"]')).toBeVisible();
  const panel = await waitForScene(page);
  await expect(panel).toHaveAttribute('data-render-generation', 'authored-world');
  const skipCinematic = page.getByRole('button', { name: 'Skip cinematic' });
  if (await skipCinematic.count()) await skipCinematic.click();
  await panel.getByRole('button', { name: 'System' }).click();
  await expect(panel).toHaveAttribute('data-scene', 'stellar');
  await expect(page.getByTestId('civilization-blueprint-manifestations')).toBeVisible();
  await expect(page.getByTestId('civilization-command-card')).toBeVisible();
  await expect(page.locator('[data-civilization-legacy-progress]')).toBeVisible();
  await expect(page.locator('[data-testid="civilization-project-zones"]')).toHaveCount(0);
  await expect(page.locator('[data-composition="network"]')).toHaveCount(0);
  await expect(page.locator('[data-continuity-medium="translucent-history"]')).toHaveCount(0);

  await panel.screenshot({
    path: resolve(OUT, 'live-tab-authored-parity.png'),
    animations: 'disabled',
  });
});

test('mobile keeps the civilization legible and suspends ambient motion offscreen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/civilization-tab?assembly=4', { waitUntil: 'networkidle' });

  const panel = await waitForScene(page);
  await expect(panel).toHaveAttribute('data-civilization-performance', 'mobile');
  const overflow = await page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ));
  expect(overflow).toBeLessThanOrEqual(1);
  expect(await panel.locator('.civ-physical-motion').count()).toBeLessThanOrEqual(2);

  const gameMain = page.locator('.game-main');
  await gameMain.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(panel).toHaveAttribute('data-civilization-visibility', 'offscreen');
  const playStates = await panel.locator('.civ-physical-motion').evaluateAll((elements) => (
    elements.map((element) => window.getComputedStyle(element).animationPlayState)
  ));
  expect(playStates.every((state) => state === 'paused')).toBe(true);

  await gameMain.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(panel).toHaveAttribute('data-civilization-visibility', 'visible');
});
