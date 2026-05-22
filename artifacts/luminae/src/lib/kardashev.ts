export type KardashevTier = 0 | 1 | 2 | 3;

export interface AffinityPalette {
  primary: string;
  secondary: string;
  accent: string;
}

const AFFINITY_PALETTES: Record<string, AffinityPalette> = {
  ruby:     { primary: '#ff5a3c', secondary: '#8b1a08', accent: '#ffaa88' },
  sapphire: { primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' },
  emerald:  { primary: '#4ade80', secondary: '#0f5a28', accent: '#a7f3c0' },
  onyx:     { primary: '#a855f7', secondary: '#2d0a5e', accent: '#d8b4fe' },
  pearl:    { primary: '#f0e6a0', secondary: '#8a6e20', accent: '#fdf6d0' },
  flux:     { primary: '#c4b5fd', secondary: '#4c1d95', accent: '#ede9fe' },
};

const DEFAULT_PALETTE: AffinityPalette = {
  primary: '#60a5fa',
  secondary: '#1a3a8f',
  accent: '#bfdbfe',
};

type CardRef = { tier: number };

/**
 * Compute the player's Kardashev tier from their forged cards and the set of
 * card IDs that were forged entirely through permanent bonus discounts (zero
 * crystals spent at the moment of forging).
 *
 * Type I  — first Tier 2 card forged, OR a Tier 1 card forged entirely through
 *            permanent bonus discounts (cost fully covered, zero crystals spent).
 * Type II — first Tier 3 card forged, OR a Tier 2 card forged entirely through
 *            permanent bonus discounts.
 * Type III — a Tier 3 card forged entirely through permanent bonus discounts.
 *
 * Tier 0 is the initial night-sky state; forging Tier 1 cards alone does NOT
 * advance the tier — that represents a pre-spacefaring terrestrial civilization.
 *
 * @param purchasedCards   All forged cards (must include an `id` and `tier`).
 * @param discountedForgeIds  Card IDs recorded at forge time as fully discount-covered.
 *                         This is the historically accurate signal — it is NOT
 *                         re-derived from current bonuses to avoid false positives.
 */
export function getKardashevTier(
  purchasedCards: ReadonlyArray<CardRef & { id: string }>,
  discountedForgeIds: ReadonlyArray<string> = [],
): KardashevTier {
  if (!purchasedCards || purchasedCards.length === 0) return 0;

  const discountedSet = new Set(discountedForgeIds);

  const tier1 = purchasedCards.filter((c) => c.tier === 1);
  const tier2 = purchasedCards.filter((c) => c.tier === 2);
  const tier3 = purchasedCards.filter((c) => c.tier === 3);

  // Type III: a Tier 3 card fully on discounts
  if (tier3.some((c) => discountedSet.has(c.id))) return 3;

  // Type II: any Tier 3 card, OR a Tier 2 card fully on discounts
  if (tier3.length > 0 || tier2.some((c) => discountedSet.has(c.id))) return 2;

  // Type I: any Tier 2 card, OR a Tier 1 card fully on discounts
  if (tier2.length > 0 || tier1.some((c) => discountedSet.has(c.id))) return 1;

  // Still on the ground — only Tier 1 cards forged with crystals
  return 0;
}

// ── Civilization name ────────────────────────────────────────────────────────

const PRIMARY_TO_AFFINITY: Record<string, string> = {
  '#ff5a3c': 'ruby',
  '#60a5fa': 'sapphire',
  '#4ade80': 'emerald',
  '#a855f7': 'onyx',
  '#f0e6a0': 'pearl',
  '#c4b5fd': 'flux',
};

const CIV_NAMES: Record<string, Record<KardashevTier, string>> = {
  ruby: {
    0: 'Ember Settlement',
    1: 'Ember Republic',
    2: 'Flare Sovereignty',
    3: 'Ignition Absolute',
  },
  sapphire: {
    0: 'Temporal Enclave',
    1: 'Temporal Domain',
    2: 'Continuum Sovereignty',
    3: 'Causal Infinite',
  },
  emerald: {
    0: 'Verdant Commune',
    1: 'Verdant Conclave',
    2: 'Verdant Dominion',
    3: 'Living Convergence',
  },
  onyx: {
    0: 'Void Enclave',
    1: 'Void Sovereignty',
    2: 'Abyss Dominion',
    3: 'Entropy Absolute',
  },
  pearl: {
    0: 'Radiant Settlement',
    1: 'Radiant Order',
    2: 'Radiant Sovereignty',
    3: 'Coherent Absolute',
  },
  flux: {
    0: 'Flux Enclave',
    1: 'Flux Nexus',
    2: 'Singularity Domain',
    3: 'Flux Transcendence',
  },
};

/**
 * Returns a short lore-appropriate civilization name derived from the player's
 * dominant affinity palette and their current Kardashev tier.
 */
export function getCivilizationName(palette: AffinityPalette, tier: KardashevTier): string {
  const affinity = PRIMARY_TO_AFFINITY[palette.primary] ?? 'sapphire';
  return (CIV_NAMES[affinity] ?? CIV_NAMES['sapphire'])[tier];
}

export function getDominantAffinityPalette(
  purchasedCards: ReadonlyArray<{ bonusColor: string }>,
): AffinityPalette {
  if (!purchasedCards || purchasedCards.length === 0) return DEFAULT_PALETTE;

  const counts: Record<string, number> = {};
  for (const card of purchasedCards) {
    counts[card.bonusColor] = (counts[card.bonusColor] ?? 0) + 1;
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
