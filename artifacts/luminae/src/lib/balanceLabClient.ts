import {
  ARTIFACT_DEFINITIONS,
  NATURAL_AFFINITY_KEYS,
  type ArtifactId,
  type NaturalAffinityKey,
} from '@workspace/game-types';

export type BalanceLabCandidateId =
  | 'control'
  | 'reach_gate'
  | 'luminary_relationship'
  | 'luminary_artifact_eligibility'
  | 'luminary_nonexclusive_contact'
  | 'focus'
  | 'encrypt_none'
  | 'payment_floor'
  | 'lineage_floor'
  | 'integrated';

type NaturalCounts = Record<NaturalAffinityKey, number>;

type BalanceLabArtifact = {
  id: string;
  tier: number;
};

type BalanceLabPlayer = {
  affinities: Partial<Record<NaturalAffinityKey | 'singularity', number>>;
  forgedArtifactIds: readonly string[];
};

export interface BalanceLabForgeCostResolution {
  cost: NaturalCounts;
  paymentFloorSatisfied: boolean;
  focusApplied: boolean;
  lineageApplied: boolean;
}

export function normalizeBalanceLabCandidate(
  value: string | null | undefined,
): BalanceLabCandidateId | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replaceAll('-', '_');
  const alias = normalized === 'reach' ? 'reach_gate' : normalized;
  return [
    'control',
    'reach_gate',
    'luminary_relationship',
    'luminary_artifact_eligibility',
    'luminary_nonexclusive_contact',
    'focus',
    'encrypt_none',
    'payment_floor',
    'lineage_floor',
    'integrated',
  ].includes(alias)
    ? alias as BalanceLabCandidateId
    : null;
}

export function activeBalanceLabCandidate(): BalanceLabCandidateId | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  return normalizeBalanceLabCandidate(
    new URLSearchParams(window.location.search).get('balanceLab'),
  );
}

export function balanceLabRemovesLuminaryEminence(
  candidate: BalanceLabCandidateId | null,
): boolean {
  return candidate === 'luminary_relationship' ||
    candidate === 'luminary_artifact_eligibility' ||
    candidate === 'luminary_nonexclusive_contact' ||
    candidate === 'integrated';
}

export function balanceLabEncryptAwardsPortableSingularity(
  candidate: BalanceLabCandidateId | null,
): boolean {
  return candidate !== 'focus' && candidate !== 'encrypt_none' && candidate !== 'integrated';
}

/** Remaining printed-natural components the player may satisfy with Focus. */
export function balanceLabFocusOptions(input: {
  candidate: BalanceLabCandidateId | null;
  ordinaryCost: Partial<Record<NaturalAffinityKey, number>>;
  fromReserve: boolean;
}): NaturalAffinityKey[] {
  const { candidate, ordinaryCost, fromReserve } = input;
  if (!fromReserve || (candidate !== 'focus' && candidate !== 'integrated')) return [];
  return NATURAL_AFFINITY_KEYS.filter((affinity) => (ordinaryCost[affinity] ?? 0) > 0);
}

function firstPositive(cost: NaturalCounts): NaturalAffinityKey | null {
  return NATURAL_AFFINITY_KEYS.find((affinity) => cost[affinity] > 0) ?? null;
}

function artifactHasOwnedPredecessor(
  card: BalanceLabArtifact,
  player: BalanceLabPlayer,
): boolean {
  const definition = ARTIFACT_DEFINITIONS[card.id as ArtifactId];
  return definition?.builtOn.some((artifactId) =>
    player.forgedArtifactIds.includes(artifactId),
  ) ?? false;
}

/**
 * Mirror the server's opt-in Focus and advanced-payment candidates so the
 * production board displays the same affordability that the engine enforces.
 * Ordinary rooms return the supplied cost unchanged.
 */
export function resolveBalanceLabForgeCost(input: {
  candidate: BalanceLabCandidateId | null;
  card: BalanceLabArtifact;
  player: BalanceLabPlayer;
  ordinaryCost: Partial<Record<NaturalAffinityKey, number>>;
  fromReserve: boolean;
  focusAffinity?: NaturalAffinityKey | null;
}): BalanceLabForgeCostResolution {
  const { candidate, card, player, ordinaryCost, fromReserve, focusAffinity } = input;
  const cost = Object.fromEntries(
    NATURAL_AFFINITY_KEYS.map((affinity) => [affinity, ordinaryCost[affinity] ?? 0]),
  ) as NaturalCounts;
  const isAdvanced = card.tier === 2 || card.tier === 3;

  const focusAttached = fromReserve && (candidate === 'focus' || candidate === 'integrated');
  const focusOptions = focusAttached
    ? NATURAL_AFFINITY_KEYS.filter((affinity) => cost[affinity] > 0)
    : [];
  const resolvedFocusAffinity = focusAffinity && focusOptions.includes(focusAffinity)
    ? focusAffinity
    : focusOptions.length === 1
      ? focusOptions[0]
      : null;
  const focusApplied = resolvedFocusAffinity !== null;
  if (resolvedFocusAffinity) cost[resolvedFocusAffinity] -= 1;

  const lineageVariant = candidate === 'lineage_floor' || candidate === 'integrated';
  const lineageApplied = isAdvanced && lineageVariant && artifactHasOwnedPredecessor(card, player);
  if (lineageApplied) {
    const affinity = firstPositive(cost);
    if (affinity) cost[affinity] -= 1;
  }

  const paymentFloorVariant = candidate === 'payment_floor' || lineageVariant;
  const naturalCostIsZero = NATURAL_AFFINITY_KEYS.every(
    (affinity) => cost[affinity] === 0,
  );
  const lineageWaivesFloor = lineageApplied;
  if (isAdvanced && paymentFloorVariant && naturalCostIsZero && !lineageWaivesFloor) {
    const heldAffinity = NATURAL_AFFINITY_KEYS.find(
      (affinity) => (player.affinities[affinity] ?? 0) > 0,
    );
    if (!heldAffinity) {
      return {
        cost,
        paymentFloorSatisfied: false,
        focusApplied,
        lineageApplied,
      };
    }
    cost[heldAffinity] = 1;
  }

  return {
    cost,
    paymentFloorSatisfied: true,
    focusApplied,
    lineageApplied,
  };
}
