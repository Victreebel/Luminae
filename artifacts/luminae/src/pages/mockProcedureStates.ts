// Mock GameState factories for the Procedure Review mode in DevAnimSandbox.
// Each factory produces a minimal state shaped for the specific Luminary's
// resolver so the resolved procedure targets are visually meaningful.
// No real game state is mutated — all mock data is sandbox-local.
//
// DEV-ONLY: this module is imported only from dev-anim-sandbox.tsx,
// which is tree-shaken from production builds via import.meta.env.DEV guards.

import type { GameState, ArtifactCard } from '@workspace/api-client-react';
import { ArtifactCardBonusAffinity, ArtifactMarkerType } from '@workspace/api-client-react';

// ─── Internal helpers ─────────────────────────────────────────────────────────

const ZERO = { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 };
type BC = keyof typeof ArtifactCardBonusAffinity;

function mc(id: string, tier: 1 | 2 | 3, bonus: BC): ArtifactCard {
  return {
    id,
    tier,
    bonusAffinity: ArtifactCardBonusAffinity[bonus],
    eminence: tier,
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
    affinities: { ...ZERO },
    bonuses: { ...ZERO },
    eminence: 5,
    reservedArtifacts: [],
    forgedArtifactIds: [],
    discountedForgeIds: [],
    forgedArtifacts: [],
    isConnected: true,
    claimedLuminaryIds: [],
    plannedAction: null,
  };
}

type MarkerMap = Record<string, { type: string; ownerId: string; summonedAtTurnCount: number }>;

interface StateOverrides {
  forgeTier1?: ArtifactCard[];
  forgeTier2?: ArtifactCard[];
  forgeTier3?: ArtifactCard[];
  players?: ReturnType<typeof mp>[];
  burnPile?: string[];
  catalystBloomBurnCount?: number;
  artifactMarkers?: MarkerMap;
  avatarSeedMoldSlots?: string[];
}

const TWO_PLAYERS = [mp('mock-p1', 'Alpha'), mp('mock-p2', 'Beta')];

/* eslint-disable no-restricted-syntax */
// safe: GameState has many required fields; resolvers only access forgeTier*, players,
// burnPile, and artifactMarkers, all guarded with ?? []. The cast avoids filling in
// every required field (Luminary[], LuminaryActiveState[], etc.) that the procedures never touch.
function base(o: StateOverrides = {}): GameState {
  return {
    roomId: 'sandbox-preview',
    status: 'playing' as const,
    currentPlayerIndex: 0,
    roundNumber: 2,
    turnCount: 5,
    affinityWell: { ...ZERO },
    forgeTier1: o.forgeTier1 ?? [],
    forgeTier2: o.forgeTier2 ?? [],
    forgeTier3: o.forgeTier3 ?? [],
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
    catalystBloomBurnCount: o.catalystBloomBurnCount ?? 0,
    artifactMarkers: o.artifactMarkers ?? {},
    avatarSeedMoldSlots: o.avatarSeedMoldSlots ?? [],
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
  //    Burns the server-selected Tier III targets.
  lum_moth: {
    state: base({
      forgeTier3: [
        { ...mc('m3a', 3, 'flare'), cost: { ...ZERO, flare: 4 } },
        mc('m3b', 3, 'continuum'),
        mc('m3c', 3, 'verdance'), mc('m3d', 3, 'abyss'),
      ],
    }),
    ownerId: 'mock-p1',
    description: '4 qualifying Tier III Artifacts are selected on arrival, burned, and immediately redrawn.',
  },

  // 2. Tide Architect — The Observer Effect
  //    Archive revelation only — no Forge mutation.
  lum_tide: {
    state: base(),
    ownerId: 'mock-p1',
    description: 'Reveals the top Artifact of all three Archives to the allied player and grants one direct Archive Forge.',
  },

  // 3. Verdant Oracle — Early Bloom
  //    Pulse, then move one Verdance token from the Well to the owner.
  lum_verdant: {
    state: base(),
    ownerId: 'mock-p1',
    description: 'One Verdance token travels from the Affinity Well to the allied player.',
  },

  // 4. Void Warden — Oblivion
  //    Raises the shared victory requirement. Two players in mock.
  lum_void: {
    state: base({ players: TWO_PLAYERS }),
    ownerId: 'mock-p1',
    description: '2 players in room. Board-wide pressure: the victory requirement rises instead of draining Eminence.',
  },

  // 5. Concordance Mandala — Perfect Coherence
  //    A Radiance Artifact milestone resolves -> +2 Eminence to owner.
  lum_radiant: {
    state: base({
      forgeTier1: [mc('r1a', 1, 'radiance'), mc('r1b', 1, 'flare'), mc('r1c', 1, 'verdance')],
      forgeTier2: [mc('r2a', 2, 'radiance'), mc('r2b', 2, 'continuum'), mc('r2c', 2, 'abyss')],
      forgeTier3: [mc('r3a', 3, 'abyss'), mc('r3b', 3, 'flare'), mc('r3c', 3, 'verdance')],
    }),
    ownerId: 'mock-p1',
    description: 'A Perfect Coherence milestone resolves; Radiance Artifacts align and the owner gains +2 Eminence.',
  },

  // 6. Phoenix Paradox — Eternal Recurrence
  //    Start-of-turn recovery returns known Burned Artifacts to matching Archives.
  lum_astral: {
    state: base({ burnPile: ['t1-example', 't2-example', 't3-example'] }),
    ownerId: 'mock-p1',
    description: 'Three pre-manifestation Burned Artifacts return to their matching Archives at the beginning of the owner’s next turn. Future Burns route directly to Archive bottoms.',
  },

  // 7. Catalyst Bloom — Aftergrowth
  //    Owner gains Eminence from the engine-owned Burn accumulator.
  lum_bloom: {
    state: base({ catalystBloomBurnCount: 5 }),
    ownerId: 'mock-p1',
    description: '5 tracked Burns. Owner panel highlighted; gains +5 Eminence even if Phoenix redirected those Artifacts.',
  },

  // 8. Iron Harbinger — Impact Extinction
  //    Returns all Forge rows, randomizes every Archive, and redeals.
  lum_forge: {
    state: base({
      forgeTier3: [
        mc('f3a', 3, 'flare'), mc('f3b', 3, 'continuum'),
        mc('f3c', 3, 'verdance'), mc('f3d', 3, 'abyss'),
      ],
      forgeTier2: [mc('f2a', 2, 'flare'), mc('f2b', 2, 'radiance')],
    }),
    ownerId: 'mock-p1',
    description: 'All face-up Artifacts lift from their molds, return to matching Archives, and are randomized before all three Forge rows refill.',
  },

  // 9. ??? — The Forgotten Hour
  //    Oblivion-1, then Forgotten residue on all face-up Forge cards.
  lum_compass: {
    state: base({
      forgeTier1: [mc('c1a', 1, 'flare'), mc('c1b', 1, 'verdance'), mc('c1c', 1, 'continuum')],
      forgeTier2: [mc('c2a', 2, 'abyss'), mc('c2b', 2, 'radiance'), mc('c2c', 2, 'flare')],
      forgeTier3: [mc('c3a', 3, 'continuum'), mc('c3b', 3, 'verdance')],
    }),
    ownerId: 'mock-p1',
    description: '8 Forge Artifacts across all tiers. Victory requirement rises by 1, then all receive Forgotten residue — Eminence suppressed.',
  },

  // 10. Seed Beyond Seasons — Avatar Seeds
  //     One permanent mold per tier is inscribed on arrival.
  lum_seed: {
    state: base({ avatarSeedMoldSlots: ['1-1', '2-2', '3-0'] }),
    ownerId: 'mock-p1',
    description: 'A random mold in each tier receives a permanent Avatar Seed sigil.',
  },

  // 11. Glass Orchard — Perfect Replication
  //     The first eligible Forge grants a second permanent bonus Affinity.
  lum_orchard: {
    state: base({
      forgeTier1: [
        mc('o1a', 1, 'flare'), mc('o1b', 1, 'verdance'), mc('o1c', 1, 'radiance'),
      ],
    }),
    ownerId: 'mock-p1',
    description: 'The first Verdance- or Radiance-cost Forge grants a second permanent bonus Affinity matching that Artifact.',
  },

  // 12. Pale Merchant — Balance Due
  //     Every player at half of a starting supply returns two matching tokens.
  lum_pale: {
    state: base({ players: TWO_PLAYERS }),
    ownerId: 'mock-p1',
    description: 'Qualifying players and Affinity channels are highlighted; two matching tokens return per qualifying type.',
  },

  // 13. Ember Sovereign — Cinder Mandate
  //     Summon path: condemns non-immune (not flare/abyss/radiance) cards.
  //     End_of_turn path: pre-condemned cards burn.
  lum_ember: {
    state: base({
      forgeTier1: [mc('e1a', 1, 'verdance'), mc('e1b', 1, 'continuum'), mc('e1c', 1, 'flare')],
      forgeTier2: [mc('e2a', 2, 'verdance'), mc('e2b', 2, 'continuum'), mc('e2c', 2, 'abyss')],
      forgeTier3: [mc('e3a', 3, 'verdance'), mc('e3b', 3, 'continuum'), mc('e3c', 3, 'flare')],
      artifactMarkers: {
        'e1a': { type: ArtifactMarkerType.condemned, ownerId: 'mock-p1', summonedAtTurnCount: 3 },
        'e2a': { type: ArtifactMarkerType.condemned, ownerId: 'mock-p1', summonedAtTurnCount: 3 },
        'e3a': { type: ArtifactMarkerType.condemned, ownerId: 'mock-p1', summonedAtTurnCount: 3 },
      },
    }),
    ownerId: 'mock-p1',
    description: 'Summon: Verdance and Continuum Artifacts (4 targets) receive Condemned. End_of_turn: 3 pre-condemned Artifacts burn.',
  },

  // 14. Final Hunger — Assimilation
  //     A selected face-up Artifact becomes a permanent Affinity bonus.
  lum_hunger: {
    state: base({ players: TWO_PLAYERS }),
    ownerId: 'mock-p1',
    description: 'Selected Artifact dissolves into the owner’s Civilization as +1 permanent Affinity.',
  },

  // 15. Null Sovereign — Black Domain
  //     Nullified residue on all T3 cards.
  lum_null: {
    state: base({
      forgeTier3: [
        mc('n3a', 3, 'flare'), mc('n3b', 3, 'continuum'),
        mc('n3c', 3, 'verdance'), mc('n3d', 3, 'abyss'),
      ],
    }),
    ownerId: 'mock-p1',
    description: '4 T3 Artifacts face-up. All receive Nullified residue — Eminence icons fully suppressed.',
  },

};
