// Mock GameState factories for the Procedure Review mode in DevAnimSandbox.
// Each factory produces a minimal state shaped for the specific Luminary's
// resolver so the resolved procedure targets are visually meaningful.
// No real game state is mutated — all mock data is sandbox-local.
//
// DEV-ONLY: this module is imported only from dev-anim-sandbox.tsx,
// which is tree-shaken from production builds via import.meta.env.DEV guards.

import type { GameState, ArtifactCard } from '@workspace/api-client-react';
import { ArtifactCardBonusColor, CardMarkerType } from '@workspace/api-client-react';

// ─── Internal helpers ─────────────────────────────────────────────────────────

const ZERO = { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 };
type BC = keyof typeof ArtifactCardBonusColor;

function mc(id: string, tier: 1 | 2 | 3, bonus: BC): ArtifactCard {
  return {
    id,
    tier,
    bonusColor: ArtifactCardBonusColor[bonus],
    lumens: tier,
    cost: { ...ZERO, [bonus]: 2 + tier },
    name: `${bonus[0].toUpperCase()}${bonus.slice(1)} T${tier}`,
    flavor: 'Mock artifact for procedure preview.',
  };
}

function mp(id: string, name: string) {
  return {
    playerId: id,
    playerName: name,
    avatarId: null,
    isAi: false,
    aiDifficulty: null,
    crystals: { ...ZERO },
    bonuses: { ...ZERO },
    lumens: 5,
    reservedCards: [],
    purchasedCardIds: [],
    discountedForgeIds: [],
    purchasedCards: [],
    isConnected: true,
    claimedLuminaryIds: [],
    plannedAction: null,
  };
}

type MarkerMap = Record<string, { type: string; ownerId: string; summonedAtTurnCount: number }>;

interface StateOverrides {
  marketTier1?: ArtifactCard[];
  marketTier2?: ArtifactCard[];
  marketTier3?: ArtifactCard[];
  players?: ReturnType<typeof mp>[];
  burnPile?: string[];
  marketMarkers?: MarkerMap;
}

const TWO_PLAYERS = [mp('mock-p1', 'Alpha'), mp('mock-p2', 'Beta')];

/* eslint-disable no-restricted-syntax */
// safe: GameState has many required fields; resolvers only access marketTier*, players,
// burnPile, and marketMarkers, all guarded with ?? []. The cast avoids filling in
// every required field (Luminary[], LuminaryActiveState[], etc.) that the procedures never touch.
function base(o: StateOverrides = {}): GameState {
  return {
    roomId: 'sandbox-preview',
    status: 'playing' as const,
    currentPlayerIndex: 0,
    roundNumber: 2,
    turnCount: 5,
    crystalBank: { ...ZERO },
    marketTier1: o.marketTier1 ?? [],
    marketTier2: o.marketTier2 ?? [],
    marketTier3: o.marketTier3 ?? [],
    deckCounts: { tier1: 10, tier2: 10, tier3: 10 },
    luminaries: [],
    luminaryAffinities: [],
    players: o.players ?? TWO_PLAYERS,
    winnerId: null,
    winTriggerLuminaryId: null,
    lastAction: null,
    actionLog: [],
    turnTimerSeconds: null,
    turnDeadline: null,
    version: 1,
    pendingSummonEvents: [],
    pendingLuminaryActivationEvents: [],
    burnPile: o.burnPile ?? [],
    marketMarkers: o.marketMarkers ?? {},
  } as unknown as GameState;
}

// ─── Public shape ─────────────────────────────────────────────────────────────

export interface MockProcedureEntry {
  state: GameState;
  ownerId: string;
  /** Human-readable scenario description shown in the Procedure Review panel. */
  description: string;
}

// ─── Per-Luminary mock states ─────────────────────────────────────────────────

export const MOCK_PROCEDURE_STATES: Record<string, MockProcedureEntry> = {

  // 1. Red Moth — Rupture of the Still
  //    Burns all T3 + T2. Needs 4 cards in each tier.
  lum_moth: {
    state: base({
      marketTier3: [
        mc('m3a', 3, 'ruby'), mc('m3b', 3, 'sapphire'),
        mc('m3c', 3, 'emerald'), mc('m3d', 3, 'onyx'),
      ],
      marketTier2: [
        mc('m2a', 2, 'pearl'), mc('m2b', 2, 'ruby'),
        mc('m2c', 2, 'emerald'), mc('m2d', 2, 'sapphire'),
      ],
    }),
    ownerId: 'mock-p1',
    description: '4 T3 + 4 T2 cards face-up in market. Red Moth targets and burns all 8. Market refreshes.',
  },

  // 2. Tide Architect — The Observer Effect
  //    DeckScry only — no market data needed.
  lum_tide: {
    state: base(),
    ownerId: 'mock-p1',
    description: 'Scries T2 + T3 decks with sapphire (Continuum) bias. Market reorders with quiet inevitability.',
  },

  // 3. Verdant Oracle — Early Bloom
  //    Pulse only — living affinity bonus; no card targeting.
  lum_verdant: {
    state: base(),
    ownerId: 'mock-p1',
    description: 'Pulse only — passive living-affinity bonus. Verdance cards cost 1 less from the next turn.',
  },

  // 4. Void Warden — Oblivion
  //    Targets all players for −4 Eminence. Two players in mock.
  lum_void: {
    state: base({ players: TWO_PLAYERS }),
    ownerId: 'mock-p1',
    description: '2 players in room. Board-wide drain: both panels highlighted, then −4 Eminence each.',
  },

  // 5. Concordance Mandala — Perfect Coherence
  //    Pearl-bonus cards in market → +2 Eminence to owner.
  lum_radiant: {
    state: base({
      marketTier1: [mc('r1a', 1, 'pearl'), mc('r1b', 1, 'ruby'), mc('r1c', 1, 'emerald')],
      marketTier2: [mc('r2a', 2, 'pearl'), mc('r2b', 2, 'sapphire'), mc('r2c', 2, 'onyx')],
      marketTier3: [mc('r3a', 3, 'onyx'), mc('r3b', 3, 'ruby'), mc('r3c', 3, 'emerald')],
    }),
    ownerId: 'mock-p1',
    description: '2 Radiance (pearl) cards in market. Both highlighted; owner gains +2 Eminence.',
  },

  // 6. Phoenix Paradox — Ash-Seeking Recurrence
  //    Burns non-Flare/Continuum from T3+T2. Ruby/sapphire survive with paradox pulse.
  lum_astral: {
    state: base({
      marketTier3: [
        mc('a3a', 3, 'ruby'), mc('a3b', 3, 'sapphire'),
        mc('a3c', 3, 'emerald'), mc('a3d', 3, 'onyx'),
      ],
      marketTier2: [
        mc('a2a', 2, 'ruby'), mc('a2b', 2, 'pearl'), mc('a2c', 2, 'emerald'),
      ],
    }),
    ownerId: 'mock-p1',
    description: 'T3+T2 mixed. Emerald/onyx/pearl cards burn (5 targets). Ruby+sapphire survive with paradox pulse.',
  },

  // 7. Catalyst Bloom — Aftergrowth
  //    Owner gains Eminence equal to burn pile length.
  lum_bloom: {
    state: base({ burnPile: ['b1', 'b2', 'b3', 'b4', 'b5'] }),
    ownerId: 'mock-p1',
    description: '5 cards in burn pile. Owner panel highlighted; gains +5 Eminence (one per burned card).',
  },

  // 8. Iron Harbinger — Impact Extinction
  //    Burns all T3 only. T2 unaffected.
  lum_forge: {
    state: base({
      marketTier3: [
        mc('f3a', 3, 'ruby'), mc('f3b', 3, 'sapphire'),
        mc('f3c', 3, 'emerald'), mc('f3d', 3, 'onyx'),
      ],
      marketTier2: [mc('f2a', 2, 'ruby'), mc('f2b', 2, 'pearl')],
    }),
    ownerId: 'mock-p1',
    description: '4 T3 + 2 T2 cards. Hammer-shadow pre-tint on T3 only; all 4 burn. T2 unaffected. Market refreshes.',
  },

  // 9. Hourless Compass — The Forgotten Hour
  //    Forgotten residue on all face-up market cards.
  lum_compass: {
    state: base({
      marketTier1: [mc('c1a', 1, 'ruby'), mc('c1b', 1, 'emerald'), mc('c1c', 1, 'sapphire')],
      marketTier2: [mc('c2a', 2, 'onyx'), mc('c2b', 2, 'pearl'), mc('c2c', 2, 'ruby')],
      marketTier3: [mc('c3a', 3, 'sapphire'), mc('c3b', 3, 'emerald')],
    }),
    ownerId: 'mock-p1',
    description: '8 market cards across all tiers. Needle sweep scans; all receive Forgotten residue — Eminence suppressed.',
  },

  // 10. Seed Beyond Seasons — Avatar Seeds
  //     Seeded residue planted on deck tops; badge appears when cards surface.
  lum_seed: {
    state: base(),
    ownerId: 'mock-p1',
    description: 'Seed glyphs planted on deck tops across all tiers. Seeded badge appears when cards enter the market.',
  },

  // 11. Glass Orchard — Perfect Replication
  //     Cheapest T1 card gets a boon CLAIM flash.
  lum_orchard: {
    state: base({
      marketTier1: [
        mc('o1a', 1, 'ruby'), mc('o1b', 1, 'emerald'), mc('o1c', 1, 'pearl'),
      ],
    }),
    ownerId: 'mock-p1',
    description: '3 T1 cards. Cheapest (Ruby T1, cost 3) is targeted with a boon CLAIM flash — free copy granted.',
  },

  // 12. Pale Merchant — Balance Due
  //     Crystal return from both players.
  lum_pale: {
    state: base({ players: TWO_PLAYERS }),
    ownerId: 'mock-p1',
    description: '2 players in room. Both panels highlighted; excess crystals above threshold return to bank.',
  },

  // 13. Ember Sovereign — Cinder Mandate
  //     Summon path: condemns non-immune (not ruby/onyx/pearl) cards.
  //     Start_of_turn path: pre-condemned cards burn.
  lum_ember: {
    state: base({
      marketTier1: [mc('e1a', 1, 'emerald'), mc('e1b', 1, 'sapphire'), mc('e1c', 1, 'ruby')],
      marketTier2: [mc('e2a', 2, 'emerald'), mc('e2b', 2, 'sapphire'), mc('e2c', 2, 'onyx')],
      marketTier3: [mc('e3a', 3, 'emerald'), mc('e3b', 3, 'sapphire'), mc('e3c', 3, 'ruby')],
      marketMarkers: {
        'e1a': { type: CardMarkerType.condemned, ownerId: 'mock-p1', summonedAtTurnCount: 3 },
        'e2a': { type: CardMarkerType.condemned, ownerId: 'mock-p1', summonedAtTurnCount: 3 },
        'e3a': { type: CardMarkerType.condemned, ownerId: 'mock-p1', summonedAtTurnCount: 3 },
      },
    }),
    ownerId: 'mock-p1',
    description: 'Summon: emerald+sapphire cards (4 targets) receive Condemned. Start_of_turn: 3 pre-condemned cards burn.',
  },

  // 14. First Hunger — Assimilation
  //     Owner panel highlighted; pendingAction assimilate granted.
  lum_hunger: {
    state: base({ players: TWO_PLAYERS }),
    ownerId: 'mock-p1',
    description: 'Owner panel highlighted. Assimilate pending action replaces the core action for one turn.',
  },

  // 15. Null Sovereign — Black Domain
  //     Nullified residue on all T3 cards.
  lum_null: {
    state: base({
      marketTier3: [
        mc('n3a', 3, 'ruby'), mc('n3b', 3, 'sapphire'),
        mc('n3c', 3, 'emerald'), mc('n3d', 3, 'onyx'),
      ],
    }),
    ownerId: 'mock-p1',
    description: '4 T3 cards face-up. All receive Nullified residue — Eminence icons fully suppressed.',
  },

};
