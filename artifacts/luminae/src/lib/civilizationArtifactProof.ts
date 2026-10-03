import {
  ARTIFACT_CATALOG,
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  CIVILIZATION_DYAD_DEFINITIONS,
  STANDARD_AFFINITY_KEYS,
  createInitialCivilizationState,
  reconcileCivilizationDistrictIdentityState,
} from '@workspace/game-types';
import type { ArtifactId, BlueprintId, CivilizationDyadId } from '@workspace/game-types';

/** Equal-sized, disjoint collections used to verify that Artifact identity survives the portrait layer. */
export const CIVILIZATION_PROOF_LOADOUT_A_IDS = [
  't1r01', 't1r07', 't1s02', 't1e01', 't1o01', 't1p01',
  't2r05', 't2s02', 't2s04', 't2e03', 't2o06', 't2p03',
  't3r04', 't3e01', 't3o04', 't3p03',
] as const satisfies readonly ArtifactId[];

export const CIVILIZATION_PROOF_LOADOUT_B_IDS = [
  't1r03', 't1r08', 't1s01', 't1e02', 't1o03', 't1p06',
  't2r04', 't2s05', 't2s06', 't2e06', 't2o02', 't2p01',
  't3r02', 't3e04', 't3o01', 't3p04',
] as const satisfies readonly ArtifactId[];

/** Live-catalog collection used to prove that no eligible Artifact disappears under saturation. */
export const CIVILIZATION_PROOF_SATURATED_IDS: readonly ArtifactId[] = ARTIFACT_CATALOG.map(
  (artifact) => artifact.id,
);

/** Preview density stays fixed when the complete live-catalog proof grows. */
export const CIVILIZATION_SATURATED_PREVIEW_TIER_BUDGET = Object.freeze({
  1: 40,
  2: 30,
  3: 20,
} as const);

const artifactById = new Map(ARTIFACT_CATALOG.map((artifact) => [artifact.id, artifact]));

function capSaturatedPreviewOrder(ids: readonly ArtifactId[]): ArtifactId[] {
  const counts = { 1: 0, 2: 0, 3: 0 };
  return ids.filter((id) => {
    const { tier } = artifactById.get(id)!;
    if (counts[tier] >= CIVILIZATION_SATURATED_PREVIEW_TIER_BUDGET[tier]) return false;
    counts[tier] += 1;
    return true;
  });
}

function balancedSaturatedPreviewOrder(): ArtifactId[] {
  const counts = new Map<string, number>();
  const balancedIds = CIVILIZATION_PROOF_SATURATED_IDS.filter((id) => {
    const { tier, bonusAffinity } = artifactById.get(id)!;
    const key = `${tier}:${bonusAffinity}`;
    const count = counts.get(key) ?? 0;
    const quota = Math.floor(CIVILIZATION_SATURATED_PREVIEW_TIER_BUDGET[tier] / STANDARD_AFFINITY_KEYS.length);
    if (count >= quota) return false;
    counts.set(key, count + 1);
    return true;
  });
  const balanced = new Set(balancedIds);
  // Keep equal Affinity coverage first; use any remaining budget if a future
  // catalog has fewer candidates in one Affinity, then restore catalog order.
  const selected = new Set(capSaturatedPreviewOrder([
    ...balancedIds,
    ...CIVILIZATION_PROOF_SATURATED_IDS.filter((id) => !balanced.has(id)),
  ]));
  return CIVILIZATION_PROOF_SATURATED_IDS.filter((id) => selected.has(id));
}

const baselineSaturatedPreviewIds = Object.freeze(balancedSaturatedPreviewOrder());
const prioritizedSaturatedPreviewIds = new Map<CivilizationDyadId, readonly ArtifactId[]>();

function shuffledPreviewIds(ids: readonly ArtifactId[], run: number): ArtifactId[] {
  const order = [...ids];
  let seed = (0x9e3779b9 ^ run) >>> 0;
  for (let index = order.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const otherIndex = Math.floor((seed / 4294967296) * (index + 1));
    [order[index], order[otherIndex]] = [order[otherIndex]!, order[index]!];
  }
  return order;
}

function previewDistrictScore(ids: readonly ArtifactId[], dyad: CivilizationDyadId) {
  const state = createInitialCivilizationState();
  ids.forEach((artifactId, index) => {
    if (ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifactId].nativeCameraScale !== 'surface') return;
    state.artifacts[artifactId] = {
      artifactId,
      firstMasteredTurnCount: index + 1,
      masteryCount: 1,
      implementationState: 'operational',
      implementationStateChangedTurnCount: index + 1,
      implementationChangeSource: null,
      historyEvidence: 'recorded',
    };
  });
  const districts = Object.values(
    reconcileCivilizationDistrictIdentityState(state, ids.length).districts,
  ).filter((district) => district.permanentDyad === dyad);
  return { count: districts.length, influence: districts.reduce((sum, district) => sum + district.influence, 0) };
}

/**
 * Returns an acquisition order for the fixed-size developer preview. Priority
 * uses a bounded, deterministic search through real allocator outcomes: prefer
 * more districts of the chosen dyad, then more residents in those districts.
 * The baseline is always eligible, so priority cannot reduce its dyad count.
 * This is a cached preview heuristic, not an exhaustive optimum or match rule.
 */
export function getCivilizationSaturatedPreviewIds(
  dyad: CivilizationDyadId,
  prioritizeDyad: boolean,
): readonly ArtifactId[] {
  if (!prioritizeDyad) return baselineSaturatedPreviewIds;
  const cached = prioritizedSaturatedPreviewIds.get(dyad);
  if (cached) return cached;

  const parents = new Set<string>(CIVILIZATION_DYAD_DEFINITIONS.find(({ id }) => id === dyad)!.affinities);
  const surfaceIds = CIVILIZATION_PROOF_SATURATED_IDS.filter((id) => (
    ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id].nativeCameraScale === 'surface'
  ));
  const parentIds = surfaceIds.filter((id) => parents.has(artifactById.get(id)!.bonusAffinity));
  const otherSurfaceIds = surfaceIds.filter((id) => !parents.has(artifactById.get(id)!.bonusAffinity));
  const higherScaleIds = CIVILIZATION_PROOF_SATURATED_IDS.filter((id) => (
    ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id].nativeCameraScale !== 'surface'
  ));
  let bestIds: readonly ArtifactId[] = baselineSaturatedPreviewIds;
  let bestScore = previewDistrictScore(bestIds, dyad);

  const consider = (surfaceOrder: readonly ArtifactId[]) => {
    const ids = capSaturatedPreviewOrder([...surfaceOrder, ...higherScaleIds]);
    const score = previewDistrictScore(ids, dyad);
    if (score.count > bestScore.count ||
      (score.count === bestScore.count && score.influence > bestScore.influence)) {
      bestIds = ids;
      bestScore = score;
    }
  };

  // Pair-first orders protect the desired founders; mixed orders can use other
  // Affinities to occupy competing placements and open additional districts.
  // Fixed seeds and a fixed bound keep the result reproducible and inexpensive.
  for (let run = 0; run < 256; run += 1) {
    consider([
      ...shuffledPreviewIds(parentIds, run),
      ...shuffledPreviewIds(otherSurfaceIds, run),
    ]);
    consider(shuffledPreviewIds(surfaceIds, run));
  }

  const result = Object.freeze([...bestIds]);
  prioritizedSaturatedPreviewIds.set(dyad, result);
  return result;
}

export const CIVILIZATION_PROOF_BLUEPRINT_IDS = [
  'bp_antimatter_detonator',
  'bp_mantle_to_orbit_foundry',
  'bp_ascension_registry',
  'bp_worldshield_covenant',
] as const satisfies readonly BlueprintId[];

/**
 * Canonical chronological proof for permanent districts and a live city-wide
 * direction: Chrysalis establishes first, then Echo crosses the 15-point gate.
 */
export const CIVILIZATION_DISTRICT_DYAD_PROOF_IDS = [
  't1r01',
  't1r07',
  't1o05',
  't1s04',
  't1s01',
  't1o07',
  't1s03',
  't1s05',
  't1o08',
  't1e02',
  't1o03',
  't1s08',
  't1o06',
  't1o01',
] as const satisfies readonly ArtifactId[];
