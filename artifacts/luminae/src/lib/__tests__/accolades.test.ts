import { describe, it, expect } from 'vitest';
import { deriveAccolades } from '@/lib/accolades';
import type { GameState, GamePlayerState, ArtifactCard, CrystalCounts } from '@workspace/api-client-react';

// ─── Minimal mock helpers ─────────────────────────────────────────────────────
//
// deriveAccolades() only reads: players[*].playerId, .purchasedCards,
// .claimedLuminaryIds, .bonuses, .lumens.  All other GameState/GamePlayerState
// fields are irrelevant to the function under test, so the mocks populate only
// what is needed and suppress the double-cast lint rule inline.

const ZERO_CRYSTALS: CrystalCounts = {
  ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0,
};

let _cardSeq = 0;
function makeCard(tier: number): ArtifactCard {
  // eslint-disable-next-line no-restricted-syntax
  return {
    id: `card-t${tier}-${++_cardSeq}`,
    tier,
    bonusColor: 'ruby',
    lumens: tier,
    name: `Tier ${tier} card`,
    flavorText: '',
    cost: { ...ZERO_CRYSTALS },
  } as ArtifactCard;
}

function makePlayer(
  id: string,
  overrides: Partial<{
    lumens: number;
    purchasedCards: ArtifactCard[];
    claimedLuminaryIds: string[];
    bonuses: Partial<CrystalCounts>;
  }> = {},
): GamePlayerState {
  // eslint-disable-next-line no-restricted-syntax
  return {
    playerId: id,
    name: id,
    lumens: overrides.lumens ?? 15,
    purchasedCards: overrides.purchasedCards ?? [],
    claimedLuminaryIds: overrides.claimedLuminaryIds ?? [],
    bonuses: { ...ZERO_CRYSTALS, ...(overrides.bonuses ?? {}) },
    reservedCards: [],
    crystals: { ...ZERO_CRYSTALS },
    aiDifficulty: 'none',
    isAi: false,
    plannedAction: null,
    freeBurnIds: [],
  } as GamePlayerState;
}

function makeState(players: GamePlayerState[]): GameState {
  // eslint-disable-next-line no-restricted-syntax
  return {
    players,
    status: 'finished',
    turn: 0,
    turnCount: 0,
    currentPlayerId: players[0]?.playerId ?? '',
    marketTier1: [],
    marketTier2: [],
    marketTier3: [],
    deckCounts: { tier1: 0, tier2: 0, tier3: 0 },
    crystalBank: { ...ZERO_CRYSTALS },
    luminaries: [],
    actionLog: [],
    lastAction: null,
  } as GameState;
}

// ─── Guard: unknown winner ────────────────────────────────────────────────────

describe('deriveAccolades — guard against unknown winner', () => {
  it('returns empty array when winnerId is not found in players', () => {
    const state = makeState([makePlayer('alice'), makePlayer('bob')]);
    expect(deriveAccolades(state, 'nobody')).toEqual([]);
  });
});

// ─── Standard win badge set ───────────────────────────────────────────────────
//
// A dominant winner who leads on multiple metrics should collect the expected
// badges.  This is the happy-path "you played a strong game" scenario.

describe('deriveAccolades — standard win badge set', () => {
  it('awards the expected badges for a dominant winner', () => {
    const winner = makePlayer('alice', {
      lumens: 17,
      purchasedCards: [makeCard(1), makeCard(2), makeCard(3)],
      claimedLuminaryIds: ['lum_ember', 'lum_forge'],
      bonuses: { ruby: 3, sapphire: 2 },
    });
    const loser = makePlayer('bob', {
      lumens: 12,
      purchasedCards: [makeCard(1)],
      claimedLuminaryIds: ['lum_verdant'],
      bonuses: { ruby: 1 },
    });
    const state = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).toContain('Most artifacts forged');
    expect(labels).toContain('Most Luminaries claimed');
    expect(labels).toContain('Strongest affinity engine');
    expect(labels).toContain('Tier III pioneer');
  });

  it('every accolade in the standard set has a non-empty icon and label', () => {
    const winner = makePlayer('alice', {
      lumens: 18,
      purchasedCards: [makeCard(1), makeCard(2), makeCard(3)],
      claimedLuminaryIds: ['lum_ember', 'lum_forge'],
      bonuses: { ruby: 3, sapphire: 2 },
    });
    const loser = makePlayer('bob', { lumens: 12, purchasedCards: [], bonuses: {} });
    const state = makeState([winner, loser]);

    const badges = deriveAccolades(state, 'alice');
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(typeof badge.icon).toBe('string');
      expect(badge.icon.length).toBeGreaterThan(0);
      expect(typeof badge.label).toBe('string');
      expect(badge.label.length).toBeGreaterThan(0);
    }
  });
});

// ─── Defeat badge set ─────────────────────────────────────────────────────────
//
// When called with the losing player's ID, deriveAccolades compares that player's
// stats against all others (including the actual game winner).  A player who
// underperformed on every metric should receive no accolades.

describe('deriveAccolades — defeat badge set', () => {
  it('returns no accolades for a losing player who trails on every metric', () => {
    const winner = makePlayer('alice', {
      lumens: 17,
      purchasedCards: [makeCard(1), makeCard(2), makeCard(3)],
      claimedLuminaryIds: ['lum_ember', 'lum_forge'],
      bonuses: { ruby: 3, sapphire: 2, emerald: 1 },
    });
    const loser = makePlayer('bob', {
      lumens: 12,
      purchasedCards: [makeCard(1)],
      claimedLuminaryIds: ['lum_verdant'],
      bonuses: { ruby: 1 },
    });
    const state = makeState([winner, loser]);

    expect(deriveAccolades(state, 'bob')).toEqual([]);
  });

  it('can award accolades to a player who lost but still led on a metric', () => {
    // Bob lost on lumens but forged more artifacts than Alice
    const winner = makePlayer('alice', {
      lumens: 15,
      purchasedCards: [makeCard(1)],
      claimedLuminaryIds: [],
      bonuses: {},
    });
    const loser = makePlayer('bob', {
      lumens: 14,
      purchasedCards: [makeCard(1), makeCard(2), makeCard(2)],
      claimedLuminaryIds: [],
      bonuses: {},
    });
    const state = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'bob').map((b) => b.label);
    expect(labels).toContain('Most artifacts forged');
  });
});

// ─── Accolade tie-break: fewest cards ─────────────────────────────────────────
//
// The game's win tie-break rule (same lumens → fewest purchased cards wins)
// can produce a game winner who has FEWER purchased cards than an opponent.
// deriveAccolades must not award "Most artifacts forged" to a winner who has
// fewer (or equal) forged cards than the field, even when they won the game
// legitimately by tie-break.

describe('deriveAccolades — fewest-cards tie-break winner', () => {
  it('does NOT award "Most artifacts forged" when the winner won by fewest-cards tie-break', () => {
    // Same lumens, alice wins by tie-break (1 card vs 3), but has fewer cards
    const winner = makePlayer('alice', {
      lumens: 15,
      purchasedCards: [makeCard(1)],
      claimedLuminaryIds: [],
      bonuses: {},
    });
    const loser = makePlayer('bob', {
      lumens: 15,
      purchasedCards: [makeCard(1), makeCard(2), makeCard(2)],
      claimedLuminaryIds: [],
      bonuses: {},
    });
    const state = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).not.toContain('Most artifacts forged');
  });

  it('does NOT award "Most artifacts forged" when tied on card count', () => {
    const winner = makePlayer('alice', { purchasedCards: [makeCard(1), makeCard(2)] });
    const loser  = makePlayer('bob',   { purchasedCards: [makeCard(1), makeCard(2)] });
    const state  = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).not.toContain('Most artifacts forged');
  });

  it('CAN award other accolades to a fewest-cards tie-break winner who led on other metrics', () => {
    // Alice wins by fewest cards (1 vs 3 at same lumens), but holds more Luminaries
    const winner = makePlayer('alice', {
      lumens: 15,
      purchasedCards: [makeCard(1)],
      claimedLuminaryIds: ['lum_ember', 'lum_forge'],
      bonuses: { ruby: 3, sapphire: 2 },
    });
    const loser = makePlayer('bob', {
      lumens: 15,
      purchasedCards: [makeCard(1), makeCard(2), makeCard(2)],
      claimedLuminaryIds: ['lum_verdant'],
      bonuses: { ruby: 1 },
    });
    const state = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).not.toContain('Most artifacts forged');
    expect(labels).toContain('Most Luminaries claimed');
    expect(labels).toContain('Strongest affinity engine');
  });
});

// ─── Most artifacts forged ────────────────────────────────────────────────────

describe('deriveAccolades — "Most artifacts forged"', () => {
  it('awards badge when winner has strictly more forged cards than all opponents', () => {
    const winner = makePlayer('alice', { purchasedCards: [makeCard(1), makeCard(1)] });
    const loser  = makePlayer('bob',   { purchasedCards: [makeCard(1)] });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Most artifacts forged');
  });

  it('does NOT award badge when an opponent has more forged cards', () => {
    const winner = makePlayer('alice', { purchasedCards: [makeCard(1)] });
    const loser  = makePlayer('bob',   { purchasedCards: [makeCard(1), makeCard(2)] });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Most artifacts forged');
  });
});

// ─── Most Luminaries claimed ──────────────────────────────────────────────────

describe('deriveAccolades — Luminary badges', () => {
  it('awards "Most Luminaries claimed" when winner claims strictly more', () => {
    const winner = makePlayer('alice', { claimedLuminaryIds: ['lum_ember', 'lum_forge'] });
    const loser  = makePlayer('bob',   { claimedLuminaryIds: ['lum_ember'] });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Most Luminaries claimed');
  });

  it('awards "Cosmic patron" when winner ties for most Luminaries', () => {
    const winner = makePlayer('alice', { claimedLuminaryIds: ['lum_ember'] });
    const loser  = makePlayer('bob',   { claimedLuminaryIds: ['lum_forge'] });
    const state  = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).toContain('Cosmic patron');
    expect(labels).not.toContain('Most Luminaries claimed');
  });

  it('awards no Luminary badge when winner claimed zero Luminaries', () => {
    const winner = makePlayer('alice', { claimedLuminaryIds: [] });
    const loser  = makePlayer('bob',   { claimedLuminaryIds: [] });
    const state  = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).not.toContain('Most Luminaries claimed');
    expect(labels).not.toContain('Cosmic patron');
  });

  it('awards no Luminary badge when winner claimed fewer than an opponent', () => {
    const winner = makePlayer('alice', { claimedLuminaryIds: ['lum_ember'] });
    const loser  = makePlayer('bob',   { claimedLuminaryIds: ['lum_ember', 'lum_forge'] });
    const state  = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).not.toContain('Most Luminaries claimed');
    expect(labels).not.toContain('Cosmic patron');
  });
});

// ─── Strongest affinity engine ────────────────────────────────────────────────

describe('deriveAccolades — "Strongest affinity engine"', () => {
  it('awards badge when winner has a strictly higher total bonus', () => {
    const winner = makePlayer('alice', { bonuses: { ruby: 3, sapphire: 2 } });
    const loser  = makePlayer('bob',   { bonuses: { ruby: 1 } });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Strongest affinity engine');
  });

  it('does NOT award badge when tied with an opponent', () => {
    const winner = makePlayer('alice', { bonuses: { ruby: 2 } });
    const loser  = makePlayer('bob',   { bonuses: { sapphire: 2 } });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Strongest affinity engine');
  });
});

// ─── Tier III pioneer ─────────────────────────────────────────────────────────

describe('deriveAccolades — "Tier III pioneer"', () => {
  it('awards badge when winner has more tier-3 cards than all opponents', () => {
    const winner = makePlayer('alice', { purchasedCards: [makeCard(3), makeCard(3)] });
    const loser  = makePlayer('bob',   { purchasedCards: [makeCard(3)] });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Tier III pioneer');
  });

  it('does NOT award badge when winner has zero tier-3 cards', () => {
    const winner = makePlayer('alice', { purchasedCards: [makeCard(1), makeCard(2)] });
    const loser  = makePlayer('bob',   { purchasedCards: [] });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Tier III pioneer');
  });

  it('does NOT award badge when tied on tier-3 count', () => {
    const winner = makePlayer('alice', { purchasedCards: [makeCard(3)] });
    const loser  = makePlayer('bob',   { purchasedCards: [makeCard(3)] });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Tier III pioneer');
  });
});

// ─── Versatile engineer ───────────────────────────────────────────────────────

describe('deriveAccolades — "Versatile engineer"', () => {
  it('awards badge when winner has ≥3 bonus colors and strictly more than all opponents', () => {
    const winner = makePlayer('alice', { bonuses: { ruby: 1, sapphire: 1, emerald: 1 } });
    const loser  = makePlayer('bob',   { bonuses: { ruby: 1, sapphire: 1 } });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Versatile engineer');
  });

  it('does NOT award badge when winner has fewer than 3 bonus colors even if more than opponents', () => {
    const winner = makePlayer('alice', { bonuses: { ruby: 5, sapphire: 5 } });
    const loser  = makePlayer('bob',   { bonuses: { ruby: 1 } });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Versatile engineer');
  });

  it('does NOT award badge when tied on bonus color count', () => {
    const winner = makePlayer('alice', { bonuses: { ruby: 1, sapphire: 1, emerald: 1 } });
    const loser  = makePlayer('bob',   { bonuses: { ruby: 1, sapphire: 1, onyx: 1 } });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Versatile engineer');
  });
});

// ─── Ascended badge ───────────────────────────────────────────────────────────

describe('deriveAccolades — "Ascended to N Eminence"', () => {
  it('awards badge when winner lumens ≥ 20', () => {
    const winner = makePlayer('alice', { lumens: 20 });
    const loser  = makePlayer('bob',   { lumens: 14 });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Ascended to 20 Eminence');
  });

  it('includes the actual lumen count in the label', () => {
    const winner = makePlayer('alice', { lumens: 25 });
    const loser  = makePlayer('bob',   { lumens: 14 });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Ascended to 25 Eminence');
  });

  it('does NOT award badge when winner lumens === 19', () => {
    const winner = makePlayer('alice', { lumens: 19 });
    const loser  = makePlayer('bob',   { lumens: 14 });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label).some((l) => l.startsWith('Ascended'))).toBe(false);
  });
});

// ─── Zero-accolade case ───────────────────────────────────────────────────────

describe('deriveAccolades — zero-accolade case', () => {
  it('returns empty array when winner does not lead on any metric and has no Luminaries', () => {
    const winner = makePlayer('alice', {
      lumens: 15,
      purchasedCards: [],
      claimedLuminaryIds: [],
      bonuses: {},
    });
    const loser = makePlayer('bob', {
      lumens: 14,
      purchasedCards: [makeCard(1), makeCard(2), makeCard(3)],
      claimedLuminaryIds: ['lum_ember'],
      bonuses: { ruby: 3, sapphire: 2, emerald: 1, onyx: 1 },
    });
    const state = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice')).toEqual([]);
  });
});

// ─── Accolade cap ─────────────────────────────────────────────────────────────

describe('deriveAccolades — result is capped at 4', () => {
  it('returns at most 4 accolades even when winner dominates every category', () => {
    const winner = makePlayer('alice', {
      lumens: 22,
      purchasedCards: [makeCard(1), makeCard(2), makeCard(3), makeCard(3)],
      claimedLuminaryIds: ['lum_ember', 'lum_forge'],
      bonuses: { ruby: 3, sapphire: 2, emerald: 2, onyx: 1 },
    });
    const loser = makePlayer('bob', {
      lumens: 15,
      purchasedCards: [makeCard(1)],
      claimedLuminaryIds: ['lum_verdant'],
      bonuses: { ruby: 1 },
    });
    const state = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').length).toBeLessThanOrEqual(4);
  });
});

// ─── Solo game (no opponents) ─────────────────────────────────────────────────

describe('deriveAccolades — solo game (single player)', () => {
  it('awards forged badge when winner is the only player with forged cards', () => {
    const winner = makePlayer('alice', { purchasedCards: [makeCard(1)] });
    expect(deriveAccolades(makeState([winner]), 'alice').map((b) => b.label)).toContain('Most artifacts forged');
  });

  it('does NOT award forged badge when winner has zero forged cards in a solo game', () => {
    const winner = makePlayer('alice', { purchasedCards: [] });
    expect(deriveAccolades(makeState([winner]), 'alice').map((b) => b.label)).not.toContain('Most artifacts forged');
  });

  it('awards Ascended badge in a solo game when lumens ≥ 20', () => {
    const winner = makePlayer('alice', { lumens: 21 });
    expect(deriveAccolades(makeState([winner]), 'alice').map((b) => b.label)).toContain('Ascended to 21 Eminence');
  });
});
