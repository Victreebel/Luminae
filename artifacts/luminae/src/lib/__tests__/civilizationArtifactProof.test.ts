import { describe, expect, it, vi } from 'vitest';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  CIVILIZATION_DYAD_DEFINITIONS,
  STANDARD_AFFINITY_KEYS,
  createInitialCivilizationState,
  reconcileCivilizationDerivedState,
  reconcileCivilizationDistrictIdentityState,
  type ArtifactId,
  type CivilizationDistrictIdentityState,
  type CivilizationDyadId,
} from '@workspace/game-types';
import {
  CIVILIZATION_PROOF_SATURATED_IDS,
  CIVILIZATION_SATURATED_PREVIEW_TIER_BUDGET,
  getCivilizationSaturatedPreviewIds,
} from '@/lib/civilizationArtifactProof';

function previewDistricts(ids: readonly ArtifactId[], incremental = false) {
  let state = createInitialCivilizationState();
  ids.forEach((artifactId, index) => {
    state.artifacts[artifactId] = {
      artifactId,
      firstMasteredTurnCount: index + 1,
      masteryCount: 1,
      implementationState: 'operational',
      implementationStateChangedTurnCount: index + 1,
      implementationChangeSource: null,
      historyEvidence: 'recorded',
    };
    if (incremental) {
      state = reconcileCivilizationDerivedState(state, [], index + 1, {}, { commitPresentation: true });
    }
  });
  return incremental ? state.districtIdentity : reconcileCivilizationDistrictIdentityState(state, ids.length);
}

function districtCount(state: CivilizationDistrictIdentityState, dyad: CivilizationDyadId) {
  return Object.values(state.districts).filter((district) => district.permanentDyad === dyad).length;
}

function expectPreviewBudget(ids: readonly ArtifactId[]) {
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every((id) => ARTIFACT_CATALOG.some((artifact) => artifact.id === id))).toBe(true);
  for (const tier of [1, 2, 3] as const) {
    const available = ARTIFACT_CATALOG.filter((artifact) => artifact.tier === tier);
    const selected = ids.filter((id) => available.some((artifact) => artifact.id === id));
    expect(selected).toHaveLength(Math.min(available.length, CIVILIZATION_SATURATED_PREVIEW_TIER_BUDGET[tier]));
  }
}

describe('fixed-size saturated civilization preview', () => {
  it('retains the full live catalog proof separately from the capped preview', () => {
    expect(CIVILIZATION_PROOF_SATURATED_IDS).toEqual(ARTIFACT_CATALOG.map(({ id }) => id));
    expect(CIVILIZATION_SATURATED_PREVIEW_TIER_BUDGET).toEqual({ 1: 40, 2: 30, 3: 20 });
    const baseline = getCivilizationSaturatedPreviewIds('chrysalis', false);
    const expectedIds = new Set(([1, 2, 3] as const).flatMap((tier) => STANDARD_AFFINITY_KEYS.flatMap((affinity) => ARTIFACT_CATALOG
      .filter((artifact) => artifact.tier === tier && artifact.bonusAffinity === affinity)
      .slice(0, CIVILIZATION_SATURATED_PREVIEW_TIER_BUDGET[tier] / STANDARD_AFFINITY_KEYS.length)
      .map(({ id }) => id))));
    expect(baseline).toEqual(ARTIFACT_CATALOG.filter(({ id }) => expectedIds.has(id)).map(({ id }) => id));
    expectPreviewBudget(baseline);
    expect(getCivilizationSaturatedPreviewIds('echo', false)).toBe(baseline);
  });

  it('retains equal baseline Affinity coverage and the original 90-artifact collection', () => {
    const baseline = getCivilizationSaturatedPreviewIds('chrysalis', false);
    const selected = ARTIFACT_CATALOG.filter(({ id }) => baseline.includes(id));
    for (const [tier, perAffinity] of [[1, 8], [2, 6], [3, 4]] as const) {
      for (const affinity of STANDARD_AFFINITY_KEYS) {
        expect(selected.filter((artifact) => artifact.tier === tier && artifact.bonusAffinity === affinity), `${affinity} Tier ${tier}`)
          .toHaveLength(perAffinity);
      }
    }
    const originalIds = new Set<string>(([[1, 8], [2, 6], [3, 4]] as const).flatMap(([tier, count]) => (
      ['r', 's', 'e', 'o', 'p'].flatMap((affinityCode) => Array.from({ length: count }, (_, index) => (
        `t${tier}${affinityCode}${String(index + 1).padStart(2, '0')}`
      )))
    )));
    expect(baseline).toEqual(ARTIFACT_CATALOG.filter(({ id }) => originalIds.has(id)).map(({ id }) => id));
  });

  it.each(CIVILIZATION_DYAD_DEFINITIONS)('prioritizes $name through actual chronological district allocation', ({ id: dyad }) => {
    const baselineIds = getCivilizationSaturatedPreviewIds(dyad, false);
    const prioritizedIds = getCivilizationSaturatedPreviewIds(dyad, true);
    const baseline = previewDistricts(baselineIds);
    const prioritized = previewDistricts(prioritizedIds, true);
    const scored = previewDistricts(prioritizedIds);

    expectPreviewBudget(prioritizedIds);
    expect(prioritizedIds).toHaveLength(baselineIds.length);
    expect(districtCount(prioritized, dyad)).toBeGreaterThanOrEqual(districtCount(baseline, dyad));
    expect(districtCount(prioritized, dyad)).toBeGreaterThan(0);
    expect(prioritized.artifactAssignments).toEqual(scored.artifactAssignments);
    expect(prioritized.districts).toEqual(scored.districts);
    expect(Object.keys(prioritized.artifactAssignments).sort()).toEqual(prioritizedIds
      .filter((id) => ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id].nativeCameraScale === 'surface')
      .sort());
    for (const district of Object.values(prioritized.districts)) {
      expect(district.residentArtifactIds.length).toBeLessThanOrEqual(district.hardCapacity);
      for (const artifactId of district.residentArtifactIds) {
        expect(ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifactId as ArtifactId].compatiblePlacementFamilies)
          .toContain(district.family);
      }
    }
  });

  it('produces a meaningful gain over the catalog order', () => {
    const gains = CIVILIZATION_DYAD_DEFINITIONS.map(({ id }) => (
      districtCount(previewDistricts(getCivilizationSaturatedPreviewIds(id, true)), id) -
      districtCount(previewDistricts(getCivilizationSaturatedPreviewIds(id, false)), id)
    ));
    expect(Math.max(...gains)).toBeGreaterThan(0);
  });

  it('caches immutable results without modifying the catalog or using ambient randomness', async () => {
    const catalogBefore = structuredClone(ARTIFACT_CATALOG);
    const original = getCivilizationSaturatedPreviewIds('chrysalis', true);
    expect(Object.isFrozen(original)).toBe(true);
    expect(getCivilizationSaturatedPreviewIds('chrysalis', true)).toBe(original);

    vi.resetModules();
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Preview selection must use deterministic seeds');
    });
    try {
      const freshModule = await import('@/lib/civilizationArtifactProof');
      const regenerated = freshModule.getCivilizationSaturatedPreviewIds('chrysalis', true);
      expect(regenerated).toEqual(original);
      expect(freshModule.getCivilizationSaturatedPreviewIds('chrysalis', true)).toBe(regenerated);
    } finally {
      random.mockRestore();
    }
    expect(ARTIFACT_CATALOG).toEqual(catalogBefore);
  });
});
