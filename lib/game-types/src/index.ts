/**
 * @workspace/game-types
 *
 * Shared game constants and types used by both the frontend (luminae) and the
 * backend (api-server).  Keeping them here ensures a single source of truth:
 * adding a new aura style in this file immediately produces TypeScript errors
 * in both packages if the LUMINARIES array or LUMINARY_VISUALS map does not
 * include a matching value.
 */

/** Duration of the opening first-player selector shared by client and server. */
export const OPENING_TURN_ORDER_PRESENTATION_MS = 3400;

/**
 * Canonical set of Luminary ID string literals.  This is the authoritative
 * list — both the backend LuminaryDef interface and the frontend
 * LUMINARY_VISUALS map type their `id` field (and map key) as `LuminaryId`, so
 * an ID that is not in this list is a compile-time error in both packages.
 *
 * When adding a new Luminary:
 *   1. Add its ID here.
 *   2. Add a matching entry to LUMINARIES in gameEngine.ts.
 *   3. Add a matching entry to LUMINARY_VISUALS in luminaryAssets.tsx.
 *   4. TypeScript will flag every incomplete usage automatically.
 *
 * The lint:summon-colors script remains a secondary safety net that checks
 * summonColor / summonSecondaryColor / auraStyle values match at runtime; the
 * primary guard for ID correctness is this compile-time union type.
 */
export const LUMINARY_IDS = [
  'lum_ember',
  'lum_tide',
  'lum_verdant',
  'lum_void',
  'lum_radiant',
  'lum_astral',
  'lum_bloom',
  'lum_forge',
  'lum_compass',
  'lum_seed',
  'lum_orchard',
  'lum_pale',
  'lum_hunger',
  'lum_moth',
  'lum_null',
  'lum_oracle',
  'lum_scholar',
] as const;

export type LuminaryId = (typeof LUMINARY_IDS)[number];

/**
 * Canonical set of aura animation style keys recognised by the frontend aura
 * renderer.  This is the authoritative list — both the backend LuminaryDef
 * interface and the frontend LUMINARY_VISUALS map type their `auraStyle` field
 * as `AuraStyle`, so an unknown value is a compile-time error in both packages.
 *
 * When adding a new animation variant:
 *   1. Add its key here.
 *   2. Add a matching case to the aura renderer in luminaryAssets.tsx
 *      (AURA_VARIANTS record).
 *   3. TypeScript will flag every incomplete usage automatically.
 */
export const KNOWN_AURA_STYLES = [
  'fire',
  'tide',
  'verdant',
  'void',
  'radiant',
  'astral',
  'storm',
  'pale',
  'bloom',
  'compass',
  'oracle',
  'null',
  'distorted',
] as const;

export type AuraStyle = (typeof KNOWN_AURA_STYLES)[number];

/**
 * Canonical Luminae affinity vocabulary.
 *
 * The string values are stable transport/storage identifiers used by existing
 * games and clients. Application code should treat them as opaque keys and use
 * AFFINITY_NAMES whenever a player-facing name is needed.
 */
export const AFFINITY_KEYS = [
  'flare',
  'radiance',
  'verdance',
  'continuum',
  'abyss',
  'singularity',
] as const;

export type AffinityKey = (typeof AFFINITY_KEYS)[number];

export const STANDARD_AFFINITY_KEYS = [
  'flare',
  'radiance',
  'verdance',
  'continuum',
  'abyss',
] as const satisfies readonly AffinityKey[];

export type StandardAffinityKey = (typeof STANDARD_AFFINITY_KEYS)[number];

export type AffinityCounts = Record<AffinityKey, number>;

export const AFFINITY_NAMES: Record<AffinityKey, string> = {
  flare: 'Flare',
  radiance: 'Radiance',
  verdance: 'Verdance',
  continuum: 'Continuum',
  abyss: 'Abyss',
  singularity: 'Singularity',
};

export interface VictoryArtifactSummary {
  tier: number;
  bonusAffinity: string;
}

export interface VictoryStandingSummary {
  eminence: number;
  reservedArtifactCount: number;
  forgedArtifacts: ReadonlyArray<VictoryArtifactSummary>;
}

/** Tier counts ordered from the strongest tie-break value to the weakest. */
export type ArtifactTierCounts = [
  tier3: number,
  tier2: number,
  tier1: number,
];

export function getArtifactTierCounts(
  artifacts: ReadonlyArray<VictoryArtifactSummary>,
): ArtifactTierCounts {
  const counts: ArtifactTierCounts = [0, 0, 0];
  for (const artifact of artifacts) {
    if (artifact.tier === 3) counts[0]++;
    else if (artifact.tier === 2) counts[1]++;
    else if (artifact.tier === 1) counts[2]++;
  }
  return counts;
}

function compareArtifactTierCounts(
  a: ArtifactTierCounts,
  b: ArtifactTierCounts,
): number {
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return b[index] - a[index];
  }
  return 0;
}

export function getStrongestAffinityTierCounts(
  artifacts: ReadonlyArray<VictoryArtifactSummary>,
): ArtifactTierCounts {
  const byAffinity = new Map<string, VictoryArtifactSummary[]>();
  for (const artifact of artifacts) {
    const affinityArtifacts = byAffinity.get(artifact.bonusAffinity) ?? [];
    affinityArtifacts.push(artifact);
    byAffinity.set(artifact.bonusAffinity, affinityArtifacts);
  }

  let strongest: ArtifactTierCounts = [0, 0, 0];
  for (const affinityArtifacts of byAffinity.values()) {
    const counts = getArtifactTierCounts(affinityArtifacts);
    if (compareArtifactTierCounts(counts, strongest) < 0) strongest = counts;
  }
  return strongest;
}

/**
 * Sort comparator for final standings. A negative result means `a` ranks ahead
 * of `b`. Exact ties retain the game's existing stable player order.
 */
export function compareVictoryStandings(
  a: VictoryStandingSummary,
  b: VictoryStandingSummary,
): number {
  if (a.eminence !== b.eminence) return b.eminence - a.eminence;
  if (a.reservedArtifactCount !== b.reservedArtifactCount) {
    return a.reservedArtifactCount - b.reservedArtifactCount;
  }

  const overallTierComparison = compareArtifactTierCounts(
    getArtifactTierCounts(a.forgedArtifacts),
    getArtifactTierCounts(b.forgedArtifacts),
  );
  if (overallTierComparison !== 0) return overallTierComparison;

  return compareArtifactTierCounts(
    getStrongestAffinityTierCounts(a.forgedArtifacts),
    getStrongestAffinityTierCounts(b.forgedArtifacts),
  );
}
