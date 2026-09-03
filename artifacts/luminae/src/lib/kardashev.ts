import type { AffinityCounts } from '@workspace/api-client-react';
import { computeKardashevType, type KardashevType } from '@workspace/game-types';

export type KardashevTier = KardashevType;

export interface AffinityPalette {
  primary: string;
  secondary: string;
  accent: string;
}

const AFFINITY_PALETTES: Record<string, AffinityPalette> = {
  flare:     { primary: '#ff5a3c', secondary: '#8b1a08', accent: '#ffaa88' },
  continuum: { primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' },
  verdance:  { primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' },
  abyss:     { primary: '#a855f7', secondary: '#2d0a5e', accent: '#d8b4fe' },
  radiance:    { primary: '#f0e6a0', secondary: '#8a6e20', accent: '#fdf6d0' },
  singularity:     { primary: '#c4b5fd', secondary: '#4c1d95', accent: '#ede9fe' },
};

const DEFAULT_PALETTE: AffinityPalette = {
  primary: '#60a5fa',
  secondary: '#1a3a8f',
  accent: '#bfdbfe',
};

const AFFINITY_COST_KEYS = ['flare', 'continuum', 'verdance', 'abyss', 'radiance'] as const;
type AffinityCostKey = typeof AFFINITY_COST_KEYS[number];

type CardRef = {
  tier: number;
  id: string;
  /** Artifact's raw Affinity cost. Present on cards from the API. */
  cost?: AffinityCounts;
  /** Bonus snapshot captured at forge time (added in bonus-snapshot feature).
   *  When present, used to determine whether the card was fully discount-covered.
   *  When absent, falls back to the discountedForgeIds set for backward compat. */
  bonusesAtForge?: AffinityCounts;
};

/**
 * Returns true when the Artifact was forged entirely through permanent bonuses,
 * with zero Affinities spent.
 *
 * Prefers the per-card `bonusesAtForge` snapshot (historically accurate) when
 * available.  Falls back to the legacy `discountedForgeIds` set for cards that
 * were forged before the snapshot feature was added.
 */
function wasDiscountedAtForge(
  card: CardRef,
  discountedSet: Set<string>,
): boolean {
  if (card.bonusesAtForge && card.cost) {
    const bonuses = card.bonusesAtForge;
    const cost = card.cost;
    // Re-derive from the snapshot: all colored (non-singularity) costs must be fully covered.
    return AFFINITY_COST_KEYS.every(
      (affinity: AffinityCostKey) => bonuses[affinity] >= cost[affinity],
    );
  }
  return discountedSet.has(card.id);
}

/**
 * Compute the player's Kardashev tier from their forged Artifacts and the set
 * forged entirely through permanent bonuses with zero Affinities spent.
 *
 * Type I  — first Tier 2 card forged, OR a Tier 1 card forged entirely through
 *            permanent bonuses (cost fully covered, zero Affinities spent).
 * Type II — first Tier 3 card forged, OR a Tier 2 card forged entirely through
 *            permanent bonus discounts.
 * Type III — a Tier 3 card forged entirely through permanent bonus discounts.
 *
 * Tier 0 is the initial night-sky state; forging Tier 1 cards alone does NOT
 * advance the tier — that represents a pre-spacefaring terrestrial civilization.
 *
 * @param forgedArtifacts All forged Artifacts (must include `id`, `tier`, and
 *                         optionally `cost` + `bonusesAtForge` for per-card
 *                         historically-accurate discount detection).
 * @param discountedForgeIds  Legacy fallback: card IDs recorded at forge time
 *                         as fully discount-covered.  Ignored for cards that
 *                         carry a `bonusesAtForge` snapshot.
 */
export function getKardashevTier(
  forgedArtifacts: ReadonlyArray<CardRef>,
  discountedForgeIds: ReadonlyArray<string> = [],
): KardashevTier {
  const discountedSet = new Set(discountedForgeIds);
  const bonusFundedForgeIds = forgedArtifacts
    .filter((card) => wasDiscountedAtForge(card, discountedSet))
    .map((card) => card.id);
  return computeKardashevType(
    forgedArtifacts.map((card) => card.id),
    bonusFundedForgeIds,
  );
}

// ── Civilization name ────────────────────────────────────────────────────────

const PRIMARY_TO_AFFINITY: Record<string, string> = {
  '#ff5a3c': 'flare',
  '#60a5fa': 'continuum',
  '#4ade80': 'verdance',
  '#a855f7': 'abyss',
  '#f0e6a0': 'radiance',
  '#c4b5fd': 'singularity',
};

const CIV_NAMES: Record<string, Record<KardashevTier, string>> = {
  flare: {
    0: 'Ember Settlement',
    1: 'Ember Republic',
    2: 'Flare Sovereignty',
    3: 'Ignition Absolute',
  },
  continuum: {
    0: 'Temporal Enclave',
    1: 'Temporal Domain',
    2: 'Continuum Sovereignty',
    3: 'Causal Infinite',
  },
  verdance: {
    0: 'Verdant Commune',
    1: 'Verdant Conclave',
    2: 'Verdant Dominion',
    3: 'Living Convergence',
  },
  abyss: {
    0: 'Void Enclave',
    1: 'Void Sovereignty',
    2: 'Abyss Dominion',
    3: 'Entropy Absolute',
  },
  radiance: {
    0: 'Radiant Settlement',
    1: 'Radiant Order',
    2: 'Radiant Sovereignty',
    3: 'Coherent Absolute',
  },
  singularity: {
    0: 'Singularity Enclave',
    1: 'Singularity Nexus',
    2: 'Singularity Domain',
    3: 'Singularity Transcendence',
  },
};

/**
 * Adjective form of each affinity — used as the primary modifier in dual-affinity names.
 * e.g. "Verdant" for verdance, "Ember" for flare.
 */
const AFFINITY_ADJECTIVE: Record<string, string> = {
  flare:     'Ember',
  continuum: 'Temporal',
  verdance:  'Verdant',
  abyss:     'Void',
  radiance:    'Radiant',
  singularity:     'Singularity',
};

/**
 * Noun (identity) form of each affinity — used as the secondary label in dual-affinity names.
 * e.g. "Continuum" for continuum, "Abyss" for abyss.
 */
const AFFINITY_NOUN: Record<string, string> = {
  flare:     'Flare',
  continuum: 'Continuum',
  verdance:  'Verdance',
  abyss:     'Abyss',
  radiance:    'Radiance',
  singularity:     'Singularity',
};

const DUAL_TIER_SUFFIX: Record<KardashevTier, string> = {
  0: 'Outpost',
  1: '',
  2: 'Sovereignty',
  3: 'Absolute',
};

/**
 * Returns a short lore-appropriate civilization name derived from the player's
 * dominant affinity palette and their current Kardashev tier.
 *
 * When the palette carries a secondary affinity (set by getDominantAffinityPalette
 * when a runner-up affinity is within 45% of the top count), the name blends both
 * affinities — e.g. "Verdant Continuum" or "Ember Void Sovereignty".
 * Single-affinity players still receive the existing tier names unchanged.
 */
export function getCivilizationName(palette: AffinityPalette, tier: KardashevTier): string {
  const primaryKey  = PRIMARY_TO_AFFINITY[palette.primary]   ?? 'continuum';
  const secondaryKey = PRIMARY_TO_AFFINITY[palette.secondary];

  if (secondaryKey && secondaryKey !== primaryKey) {
    const adj    = AFFINITY_ADJECTIVE[primaryKey]   ?? primaryKey;
    const noun   = AFFINITY_NOUN[secondaryKey]      ?? secondaryKey;
    const suffix = DUAL_TIER_SUFFIX[tier];
    return suffix ? `${adj} ${noun} ${suffix}` : `${adj} ${noun}`;
  }

  return (CIV_NAMES[primaryKey] ?? CIV_NAMES['continuum'])[tier];
}

/**
 * Returns the secondary affinity's primary color when the palette was built
 * from two distinct affinities (dual-path strategy), or null for single-affinity
 * palettes. Use this to drive per-tier dual-color rendering in KardashevScene.
 */
export function getSecondaryAffinityColor(palette: AffinityPalette): string | null {
  const primaryKey   = PRIMARY_TO_AFFINITY[palette.primary];
  const secondaryKey = PRIMARY_TO_AFFINITY[palette.secondary];
  if (secondaryKey && secondaryKey !== primaryKey) {
    // palette.secondary IS the other affinity's primary color
    return palette.secondary;
  }
  return null;
}

export function getDominantAffinityPalette(
  forgedArtifacts: ReadonlyArray<{ bonusAffinity: string }>,
): AffinityPalette {
  if (!forgedArtifacts || forgedArtifacts.length === 0) return DEFAULT_PALETTE;

  const counts: Record<string, number> = {};
  for (const artifact of forgedArtifacts) {
    counts[artifact.bonusAffinity] = (counts[artifact.bonusAffinity] ?? 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return DEFAULT_PALETTE;

  const top = sorted[0];
  const second = sorted[1];
  const p1 = AFFINITY_PALETTES[top[0]] ?? DEFAULT_PALETTE;

  if (!second || second[1] < top[1] * 0.45) {
    return p1;
  }

  const p2 = AFFINITY_PALETTES[second[0]] ?? DEFAULT_PALETTE;
  return {
    primary: p1.primary,
    secondary: p2.primary,
    accent: p1.accent,
  };
}
