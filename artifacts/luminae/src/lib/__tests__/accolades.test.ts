import { describe, it, expect } from 'vitest';
import { deriveAccolades } from '@/lib/accolades';
import type { GameState, GamePlayerState, ArtifactCard, AffinityCounts } from '@workspace/api-client-react';

// ─── Minimal mock helpers ─────────────────────────────────────────────────────
//
// deriveAccolades() only reads: players[*].playerId, .forgedArtifacts,
// compatibility fields `.claimedLuminaryIds`, `.bonuses`, and `.eminence`. Other state
// fields are irrelevant to the function under test, so the mocks populate only
// what is needed and suppress the double-cast lint rule inline.

const ZERO_AFFINITIES: AffinityCounts = {
  flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0,
};

let _cardSeq = 0;
function makeCard(tier: number): ArtifactCard {
  return {
    id: `card-t${tier}-${++_cardSeq}`,
    tier,
    bonusAffinity: 'flare',
    eminence: tier,
    name: `Tier ${tier} card`,
    flavorText: '',
    cost: { ...ZERO_AFFINITIES },
  } as ArtifactCard;
}

function makePlayer(
  id: string,
  overrides: Partial<{
    eminence: number;
    forgedArtifacts: ArtifactCard[];
    claimedLuminaryIds: string[];
    bonuses: Partial<AffinityCounts>;
  }> = {},
): GamePlayerState {
  return {
    playerId: id,
    name: id,
    eminence: overrides.eminence ?? 15,
    forgedArtifacts: overrides.forgedArtifacts ?? [],
    claimedLuminaryIds: overrides.claimedLuminaryIds ?? [],
    bonuses: { ...ZERO_AFFINITIES, ...(overrides.bonuses ?? {}) },
    reservedArtifacts: [],
    affinities: { ...ZERO_AFFINITIES },
    aiDifficulty: 'none',
    isAi: false,
    plannedAction: null,
    freeBurnIds: [],
  } as GamePlayerState;
}

function makeState(players: GamePlayerState[]): GameState {
  return {
    players,
    status: 'finished',
    turn: 0,
    turnCount: 0,
    currentPlayerId: players[0]?.playerId ?? '',
    forgeTier1: [],
    forgeTier2: [],
    forgeTier3: [],
    deckCounts: { tier1: 0, tier2: 0, tier3: 0 },
    affinityWell: { ...ZERO_AFFINITIES },
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
      eminence: 17,
      forgedArtifacts: [makeCard(1), makeCard(2), makeCard(3)],
      claimedLuminaryIds: ['lum_ember', 'lum_forge'],
      bonuses: { flare: 3, continuum: 2 },
    });
    const loser = makePlayer('bob', {
      eminence: 12,
      forgedArtifacts: [makeCard(1)],
      claimedLuminaryIds: ['lum_verdant'],
      bonuses: { flare: 1 },
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
      eminence: 18,
      forgedArtifacts: [makeCard(1), makeCard(2), makeCard(3)],
      claimedLuminaryIds: ['lum_ember', 'lum_forge'],
      bonuses: { flare: 3, continuum: 2 },
    });
    const loser = makePlayer('bob', { eminence: 12, forgedArtifacts: [], bonuses: {} });
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
      eminence: 17,
      forgedArtifacts: [makeCard(1), makeCard(2), makeCard(3)],
      claimedLuminaryIds: ['lum_ember', 'lum_forge'],
      bonuses: { flare: 3, continuum: 2, verdance: 1 },
    });
    const loser = makePlayer('bob', {
      eminence: 12,
      forgedArtifacts: [makeCard(1)],
      claimedLuminaryIds: ['lum_verdant'],
      bonuses: { flare: 1 },
    });
    const state = makeState([winner, loser]);

    expect(deriveAccolades(state, 'bob')).toEqual([]);
  });

  it('can award accolades to a player who lost but still led on a metric', () => {
    // Bob lost on Eminence but forged more Artifacts than Alice.
    const winner = makePlayer('alice', {
      eminence: 15,
      forgedArtifacts: [makeCard(1)],
      claimedLuminaryIds: [],
      bonuses: {},
    });
    const loser = makePlayer('bob', {
      eminence: 14,
      forgedArtifacts: [makeCard(1), makeCard(2), makeCard(2)],
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
// The game's tie-break rule (same Eminence, then fewest forged Artifacts)
// can produce a winner with fewer forged Artifacts than an opponent.
// deriveAccolades must not award "Most artifacts forged" to a winner who has
// fewer (or equal) forged cards than the field, even when they won the game
// legitimately by tie-break.

describe('deriveAccolades — fewest-cards tie-break winner', () => {
  it('does NOT award "Most artifacts forged" when the winner won by fewest-cards tie-break', () => {
    // Same Eminence: Alice wins the 1-Artifact vs 3-Artifact tie-break.
    const winner = makePlayer('alice', {
      eminence: 15,
      forgedArtifacts: [makeCard(1)],
      claimedLuminaryIds: [],
      bonuses: {},
    });
    const loser = makePlayer('bob', {
      eminence: 15,
      forgedArtifacts: [makeCard(1), makeCard(2), makeCard(2)],
      claimedLuminaryIds: [],
      bonuses: {},
    });
    const state = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).not.toContain('Most artifacts forged');
  });

  it('does NOT award "Most artifacts forged" when tied on card count', () => {
    const winner = makePlayer('alice', { forgedArtifacts: [makeCard(1), makeCard(2)] });
    const loser  = makePlayer('bob',   { forgedArtifacts: [makeCard(1), makeCard(2)] });
    const state  = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).not.toContain('Most artifacts forged');
  });

  it('CAN award other accolades to a fewest-cards tie-break winner who led on other metrics', () => {
    // Alice wins by fewest Artifacts at equal Eminence and also holds more Luminaries.
    const winner = makePlayer('alice', {
      eminence: 15,
      forgedArtifacts: [makeCard(1)],
      claimedLuminaryIds: ['lum_ember', 'lum_forge'],
      bonuses: { flare: 3, continuum: 2 },
    });
    const loser = makePlayer('bob', {
      eminence: 15,
      forgedArtifacts: [makeCard(1), makeCard(2), makeCard(2)],
      claimedLuminaryIds: ['lum_verdant'],
      bonuses: { flare: 1 },
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
    const winner = makePlayer('alice', { forgedArtifacts: [makeCard(1), makeCard(1)] });
    const loser  = makePlayer('bob',   { forgedArtifacts: [makeCard(1)] });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Most artifacts forged');
  });

  it('does NOT award badge when an opponent has more forged cards', () => {
    const winner = makePlayer('alice', { forgedArtifacts: [makeCard(1)] });
    const loser  = makePlayer('bob',   { forgedArtifacts: [makeCard(1), makeCard(2)] });
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

  it('awards "Luminary steward" when winner ties for most Luminaries', () => {
    const winner = makePlayer('alice', { claimedLuminaryIds: ['lum_ember'] });
    const loser  = makePlayer('bob',   { claimedLuminaryIds: ['lum_forge'] });
    const state  = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).toContain('Luminary steward');
    expect(labels).not.toContain('Most Luminaries claimed');
  });

  it('awards no Luminary badge when winner claimed zero Luminaries', () => {
    const winner = makePlayer('alice', { claimedLuminaryIds: [] });
    const loser  = makePlayer('bob',   { claimedLuminaryIds: [] });
    const state  = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).not.toContain('Most Luminaries claimed');
    expect(labels).not.toContain('Luminary steward');
  });

  it('awards no Luminary badge when winner claimed fewer than an opponent', () => {
    const winner = makePlayer('alice', { claimedLuminaryIds: ['lum_ember'] });
    const loser  = makePlayer('bob',   { claimedLuminaryIds: ['lum_ember', 'lum_forge'] });
    const state  = makeState([winner, loser]);

    const labels = deriveAccolades(state, 'alice').map((b) => b.label);
    expect(labels).not.toContain('Most Luminaries claimed');
    expect(labels).not.toContain('Luminary steward');
  });
});

// ─── Strongest affinity engine ────────────────────────────────────────────────

describe('deriveAccolades — "Strongest affinity engine"', () => {
  it('awards badge when winner has a strictly higher total bonus', () => {
    const winner = makePlayer('alice', { bonuses: { flare: 3, continuum: 2 } });
    const loser  = makePlayer('bob',   { bonuses: { flare: 1 } });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Strongest affinity engine');
  });

  it('does NOT award badge when tied with an opponent', () => {
    const winner = makePlayer('alice', { bonuses: { flare: 2 } });
    const loser  = makePlayer('bob',   { bonuses: { continuum: 2 } });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Strongest affinity engine');
  });
});

// ─── Tier III pioneer ─────────────────────────────────────────────────────────

describe('deriveAccolades — "Tier III pioneer"', () => {
  it('awards badge when winner has more tier-3 cards than all opponents', () => {
    const winner = makePlayer('alice', { forgedArtifacts: [makeCard(3), makeCard(3)] });
    const loser  = makePlayer('bob',   { forgedArtifacts: [makeCard(3)] });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Tier III pioneer');
  });

  it('does NOT award badge when winner has zero tier-3 cards', () => {
    const winner = makePlayer('alice', { forgedArtifacts: [makeCard(1), makeCard(2)] });
    const loser  = makePlayer('bob',   { forgedArtifacts: [] });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Tier III pioneer');
  });

  it('does NOT award badge when tied on tier-3 count', () => {
    const winner = makePlayer('alice', { forgedArtifacts: [makeCard(3)] });
    const loser  = makePlayer('bob',   { forgedArtifacts: [makeCard(3)] });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Tier III pioneer');
  });
});

// ─── Versatile engineer ───────────────────────────────────────────────────────

describe('deriveAccolades — "Versatile engineer"', () => {
  it('awards badge when winner has ≥3 bonus colors and strictly more than all opponents', () => {
    const winner = makePlayer('alice', { bonuses: { flare: 1, continuum: 1, verdance: 1 } });
    const loser  = makePlayer('bob',   { bonuses: { flare: 1, continuum: 1 } });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Versatile engineer');
  });

  it('does NOT award badge when winner has fewer than 3 bonus colors even if more than opponents', () => {
    const winner = makePlayer('alice', { bonuses: { flare: 5, continuum: 5 } });
    const loser  = makePlayer('bob',   { bonuses: { flare: 1 } });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Versatile engineer');
  });

  it('does NOT award badge when tied on bonus color count', () => {
    const winner = makePlayer('alice', { bonuses: { flare: 1, continuum: 1, verdance: 1 } });
    const loser  = makePlayer('bob',   { bonuses: { flare: 1, continuum: 1, abyss: 1 } });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).not.toContain('Versatile engineer');
  });
});

// ─── Ascended badge ───────────────────────────────────────────────────────────

describe('deriveAccolades — "Ascended to N Eminence"', () => {
  it('awards badge when winner Eminence is at least 20', () => {
    const winner = makePlayer('alice', { eminence: 20 });
    const loser  = makePlayer('bob',   { eminence: 14 });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Ascended to 20 Eminence');
  });

  it('includes the actual Eminence total in the label', () => {
    const winner = makePlayer('alice', { eminence: 25 });
    const loser  = makePlayer('bob',   { eminence: 14 });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label)).toContain('Ascended to 25 Eminence');
  });

  it('does NOT award badge when winner Eminence is 19', () => {
    const winner = makePlayer('alice', { eminence: 19 });
    const loser  = makePlayer('bob',   { eminence: 14 });
    const state  = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').map((b) => b.label).some((l) => l.startsWith('Ascended'))).toBe(false);
  });
});

// ─── Zero-accolade case ───────────────────────────────────────────────────────

describe('deriveAccolades — zero-accolade case', () => {
  it('returns empty array when winner does not lead on any metric and has no Luminaries', () => {
    const winner = makePlayer('alice', {
      eminence: 15,
      forgedArtifacts: [],
      claimedLuminaryIds: [],
      bonuses: {},
    });
    const loser = makePlayer('bob', {
      eminence: 14,
      forgedArtifacts: [makeCard(1), makeCard(2), makeCard(3)],
      claimedLuminaryIds: ['lum_ember'],
      bonuses: { flare: 3, continuum: 2, verdance: 1, abyss: 1 },
    });
    const state = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice')).toEqual([]);
  });
});

// ─── Accolade cap ─────────────────────────────────────────────────────────────

describe('deriveAccolades — result is capped at 4', () => {
  it('returns at most 4 accolades even when winner dominates every category', () => {
    const winner = makePlayer('alice', {
      eminence: 22,
      forgedArtifacts: [makeCard(1), makeCard(2), makeCard(3), makeCard(3)],
      claimedLuminaryIds: ['lum_ember', 'lum_forge'],
      bonuses: { flare: 3, continuum: 2, verdance: 2, abyss: 1 },
    });
    const loser = makePlayer('bob', {
      eminence: 15,
      forgedArtifacts: [makeCard(1)],
      claimedLuminaryIds: ['lum_verdant'],
      bonuses: { flare: 1 },
    });
    const state = makeState([winner, loser]);

    expect(deriveAccolades(state, 'alice').length).toBeLessThanOrEqual(4);
  });
});

// ─── Solo game (no opponents) ─────────────────────────────────────────────────

describe('deriveAccolades — solo game (single player)', () => {
  it('awards forged badge when winner is the only player with forged cards', () => {
    const winner = makePlayer('alice', { forgedArtifacts: [makeCard(1)] });
    expect(deriveAccolades(makeState([winner]), 'alice').map((b) => b.label)).toContain('Most artifacts forged');
  });

  it('does NOT award forged badge when winner has zero forged cards in a solo game', () => {
    const winner = makePlayer('alice', { forgedArtifacts: [] });
    expect(deriveAccolades(makeState([winner]), 'alice').map((b) => b.label)).not.toContain('Most artifacts forged');
  });

  it('awards Ascended badge in a solo game at 20 or more Eminence', () => {
    const winner = makePlayer('alice', { eminence: 21 });
    expect(deriveAccolades(makeState([winner]), 'alice').map((b) => b.label)).toContain('Ascended to 21 Eminence');
  });
});
