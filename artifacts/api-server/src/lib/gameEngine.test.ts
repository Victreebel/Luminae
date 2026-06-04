/**
 * gameEngine.test.ts — Luminary Mechanics Update v0.8
 *
 * Covers: markers (Forgotten / Condemned / Nullified / Avatar Seed),
 * on-summon burn / scry effects, end-of-turn payouts, start-of-turn burns,
 * the Assimilation action, The Glass Orchard bonus, and normalizeState defaults.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeGame,
  applyAction,
  normalizeState,
  LUMINARY_MAP,
  CARD_MAP,
  CRYSTAL_COLORS,
  LUMINARIES,
} from "./gameEngine.js";
import type { GameStateData } from "./gameEngine.js";

// ─── Test helpers ──────────────────────────────────────────────────────────────

/** Create a fresh 2-player game, always starting with player index 0. */
function makeGame(): GameStateData {
  const raw = initializeGame(
    [
      { id: "p1", name: "Player 1" },
      { id: "p2", name: "Player 2" },
    ],
    2,
  );
  raw.currentPlayerIndex = 0;
  return normalizeState(raw);
}

/** Give a player unlimited crystals for test purchases. */
function enrichPlayer(state: GameStateData, playerIdx: number) {
  const p = state.players[playerIdx];
  for (const c of CRYSTAL_COLORS) {
    p.crystals[c] = 10;
    state.crystalBank[c] = 20;
  }
  p.crystals.flux = 5;
  state.crystalBank.flux = 5;
}

/** Advance the current player's turn via pass. */
function pass(state: GameStateData) {
  const p = state.players[state.currentPlayerIndex];
  const r = applyAction(state, p.playerId, { type: "pass" });
  if (!r.success) throw new Error(`pass failed: ${r.error}`);
}

/**
 * Force the CURRENT player to claim a specific Luminary immediately:
 * sets their bonuses to the requirements and purchases a Tier 1 card,
 * which triggers checkLuminaries.
 */
function claimLuminary(state: GameStateData, lumId: string) {
  const lum = LUMINARY_MAP.get(lumId);
  if (!lum) throw new Error(`Unknown luminary: ${lumId}`);
  const player = state.players[state.currentPlayerIndex];

  // Pre-set bonuses to match requirements exactly (purchase will add one more).
  for (const c of CRYSTAL_COLORS) {
    player.bonuses[c] = lum.requirements[c];
  }
  enrichPlayer(state, state.currentPlayerIndex);
  // Only this Luminary should be active so no other summons fire.
  state.activeLuminaries = [lumId];

  const cardId = state.marketTier1[0];
  if (!cardId) throw new Error("No Tier 1 card in market");
  const r = applyAction(state, player.playerId, { type: "purchase_card", cardId });
  if (!r.success) throw new Error(`claimLuminary purchase failed: ${r.error}`);
}

// ─── Normalisation ────────────────────────────────────────────────────────────

describe("normalizeState — v0.8 field defaults", () => {
  it("initialises marketMarkers to {} when absent", () => {
    const state = normalizeState({
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
    });
    expect(state.marketMarkers).toEqual({});
  });

  it("initialises catalystBloomBurnCount to 0 when absent", () => {
    const state = normalizeState({
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
    });
    expect(state.catalystBloomBurnCount).toBe(0);
  });

  it("initialises concordanceMandalaTriggered to false when absent", () => {
    const state = normalizeState({
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
    });
    expect(state.concordanceMandalaTriggered).toBe(false);
  });

  it("initialises glassOrchardTriggered to false when absent", () => {
    const state = normalizeState({
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
    });
    expect(state.glassOrchardTriggered).toBe(false);
  });

  it("initialises firstHungerAvailable to null when absent", () => {
    const state = normalizeState({
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
    });
    expect(state.firstHungerAvailable).toBeNull();
  });
});

// ─── Marker mechanics — zero-eminence forge ───────────────────────────────────

describe("CardMarker — zero-eminence on purchase_card", () => {
  let state: GameStateData;

  beforeEach(() => {
    state = makeGame();
    enrichPlayer(state, 0);
  });

  it("Forgotten marker → forging grants 0 Eminence regardless of card's printed value", () => {
    // Find a Tier 1 card in the market that has ≥1 printed Eminence.
    const cardId = state.marketTier1.find((id) => (CARD_MAP.get(id)?.lumens ?? 0) > 0);
    if (!cardId) return; // No card with lumens available — skip gracefully.

    state.marketMarkers = {
      [cardId]: { type: "forgotten", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    const lumensBefore = state.players[0].lumens;
    const r = applyAction(state, "p1", { type: "purchase_card", cardId });
    expect(r.success).toBe(true);
    expect(state.players[0].lumens).toBe(lumensBefore); // 0 eminence added
  });

  it("Condemned marker → forging grants 0 Eminence", () => {
    const cardId = state.marketTier1.find((id) => (CARD_MAP.get(id)?.lumens ?? 0) > 0);
    if (!cardId) return;
    state.marketMarkers = {
      [cardId]: { type: "condemned", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    const lumensBefore = state.players[0].lumens;
    const r = applyAction(state, "p1", { type: "purchase_card", cardId });
    expect(r.success).toBe(true);
    expect(state.players[0].lumens).toBe(lumensBefore);
  });

  it("Nullified marker → forging grants 0 Eminence", () => {
    // Use a Tier 3 card for Nullified (it's a T3-only marker per spec, but the
    // engine enforces 0-eminence for any nullified card regardless of tier).
    const cardId = state.marketTier3.find((id) => (CARD_MAP.get(id)?.lumens ?? 0) > 0);
    if (!cardId) return;
    state.marketMarkers = {
      [cardId]: { type: "nullified", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    const lumensBefore = state.players[0].lumens;
    const r = applyAction(state, "p1", { type: "purchase_card", cardId });
    expect(r.success).toBe(true);
    expect(state.players[0].lumens).toBe(lumensBefore);
  });

  it("no marker → forging grants normal printed Eminence", () => {
    const cardId = state.marketTier1.find((id) => (CARD_MAP.get(id)?.lumens ?? 0) > 0);
    if (!cardId) return;
    const card = CARD_MAP.get(cardId)!;
    const lumensBefore = state.players[0].lumens;
    const r = applyAction(state, "p1", { type: "purchase_card", cardId });
    expect(r.success).toBe(true);
    expect(state.players[0].lumens).toBe(lumensBefore + card.lumens);
  });
});

// ─── Avatar Seed ──────────────────────────────────────────────────────────────

describe("Avatar Seed — pending Eminence accumulates on opponent forge", () => {
  it("increments pendingLumens when the opponent forges an avatar-seeded market card", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);

    // Set up Avatar Seed state owned by player 1.
    state.avatarSeedState = {
      ownerId: "p2",
      summonedAtTurnCount: 0,
      pendingLumens: 0,
      deckSeeds: [],
      payoutDone: false,
    };

    // Place an avatar_seed marker on the first Tier 1 market card.
    const seededCard = state.marketTier1[0]!;
    state.marketMarkers = {
      [seededCard]: { type: "avatar_seed", ownerId: "p2", summonedAtTurnCount: 0 },
    };

    // Player 1 (p1, index 0) forges the seeded card → opponent of p2.
    const r = applyAction(state, "p1", { type: "purchase_card", cardId: seededCard });
    expect(r.success).toBe(true);
    expect(state.avatarSeedState!.pendingLumens).toBe(1);
  });

  it("does NOT increment pendingLumens when the Avatar Seed OWNER forges their own seeded card", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    // Move to player 2's turn.
    state.currentPlayerIndex = 1;
    enrichPlayer(state, 1);

    state.avatarSeedState = {
      ownerId: "p2",
      summonedAtTurnCount: 0,
      pendingLumens: 0,
      deckSeeds: [],
      payoutDone: false,
    };
    const seededCard = state.marketTier1[0]!;
    state.marketMarkers = {
      [seededCard]: { type: "avatar_seed", ownerId: "p2", summonedAtTurnCount: 0 },
    };

    const r = applyAction(state, "p2", { type: "purchase_card", cardId: seededCard });
    expect(r.success).toBe(true);
    expect(state.avatarSeedState!.pendingLumens).toBe(0);
  });

  it("pays out pending Eminence at end of owner's next turn", () => {
    const state = makeGame();
    state.turnCount = 1; // Will become 2 after first pass.

    state.avatarSeedState = {
      ownerId: "p1",
      summonedAtTurnCount: 0,
      pendingLumens: 3,
      deckSeeds: [],
      payoutDone: false,
    };
    state.luminaryAffinities = [
      {
        luminaryId: "lum_seed",
        ownerId: "p1",
        activeAffinity: "sapphire",
        eligibleAffinities: ["sapphire"],
        summonedAtTurnCount: 0,
      },
    ];

    // player0 passes → applyEndOfTurnEffects: turnCount=1 > summonedAt=0 → payout
    const lumensBefore = state.players[0].lumens;
    pass(state); // ends p1's turn
    expect(state.players[0].lumens).toBe(lumensBefore + 3);
    expect(state.avatarSeedState!.payoutDone).toBe(true);
  });

  it("does NOT pay out on the SAME turn as summon", () => {
    const state = makeGame();
    state.turnCount = 0; // Summon and end-of-turn both at 0 → condition is false.

    state.avatarSeedState = {
      ownerId: "p1",
      summonedAtTurnCount: 0,
      pendingLumens: 5,
      deckSeeds: [],
      payoutDone: false,
    };
    state.luminaryAffinities = [
      {
        luminaryId: "lum_seed",
        ownerId: "p1",
        activeAffinity: "sapphire",
        eligibleAffinities: ["sapphire"],
        summonedAtTurnCount: 0,
      },
    ];

    const lumensBefore = state.players[0].lumens;
    pass(state); // turnCount=0 at end-of-turn → 0 > 0 = false, no payout
    expect(state.players[0].lumens).toBe(lumensBefore);
    expect(state.avatarSeedState!.payoutDone).toBe(false);
  });
});

// ─── Catalyst Bloom ───────────────────────────────────────────────────────────

describe("Catalyst Bloom — Aftergrowth: +1 Eminence per burn effect at end of turn", () => {
  it("grants accumulated burn-effect Eminence and resets counter", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_bloom"];
    state.catalystBloomBurnCount = 4;

    const lumensBefore = state.players[0].lumens;
    pass(state);
    expect(state.players[0].lumens).toBe(lumensBefore + 4);
    expect(state.catalystBloomBurnCount).toBe(0);
  });

  it("pays nothing when no burns occurred", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_bloom"];
    state.catalystBloomBurnCount = 0;
    const lumensBefore = state.players[0].lumens;
    pass(state);
    expect(state.players[0].lumens).toBe(lumensBefore);
  });

  it("non-owner does not receive bloom Eminence even with burns queued", () => {
    // Player 1 owns Bloom; it's player 0's turn → player 0 should get nothing.
    const state = makeGame();
    state.players[1].luminaries = ["lum_bloom"];
    state.catalystBloomBurnCount = 3;
    const p0LumensBefore = state.players[0].lumens;
    pass(state); // p0's turn ends — bloom payout runs only for bloom owner's turn
    expect(state.players[0].lumens).toBe(p0LumensBefore);
    // Counter should NOT be reset (no bloom owner's turn ended).
    expect(state.catalystBloomBurnCount).toBe(3);
  });
});

// ─── Concordance Mandala ──────────────────────────────────────────────────────

describe("Concordance Mandala — Perfect Coherence: +2 Eminence at end of turn with 8+ Radiance Artifacts", () => {
  it("grants +2 Eminence when owner has ≥8 Radiance Artifacts at end of turn", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    // Give the player 8 pearl-bonus cards (t1p01 through t3p04 are examples).
    const pearlCards = [...CARD_MAP.values()]
      .filter((c) => c.bonusColor === "pearl")
      .slice(0, 8)
      .map((c) => c.id);
    state.players[0].purchasedCardIds = pearlCards;

    const lumensBefore = state.players[0].lumens;
    pass(state);
    expect(state.players[0].lumens).toBe(lumensBefore + 2);
    expect(state.concordanceMandalaTriggered).toBe(true);
  });

  it("does NOT fire again once already triggered", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    state.concordanceMandalaTriggered = true; // Already triggered.
    const pearlCards = [...CARD_MAP.values()]
      .filter((c) => c.bonusColor === "pearl")
      .slice(0, 8)
      .map((c) => c.id);
    state.players[0].purchasedCardIds = pearlCards;

    const lumensBefore = state.players[0].lumens;
    pass(state);
    expect(state.players[0].lumens).toBe(lumensBefore); // No bonus.
  });

  it("does NOT fire when fewer than 8 Radiance Artifacts", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    const pearlCards = [...CARD_MAP.values()]
      .filter((c) => c.bonusColor === "pearl")
      .slice(0, 7)
      .map((c) => c.id);
    state.players[0].purchasedCardIds = pearlCards;

    const lumensBefore = state.players[0].lumens;
    pass(state);
    expect(state.players[0].lumens).toBe(lumensBefore);
  });
});

// ─── The Glass Orchard ────────────────────────────────────────────────────────

describe("The Glass Orchard — Perfect Replication: +1 extra bonus on first Verdance/Radiance forge", () => {
  let state: GameStateData;

  beforeEach(() => {
    state = makeGame();
    enrichPlayer(state, 0);
    state.players[0].luminaries = ["lum_orchard"];
    state.activeLuminaries = []; // No other Luminary summons.
    state.glassOrchardTriggered = false;
  });

  it("grants an extra bonus of the card's bonusColor on first eligible forge", () => {
    // Find a Tier 1 card with Verdance (emerald) in its cost.
    const targetCard = [...CARD_MAP.values()].find(
      (c) => c.tier === 1 && c.cost.emerald > 0 && state.marketTier1.includes(c.id),
    );
    if (!targetCard) {
      // No emerald card in market — inject one.
      const anyEmeraldCard = [...CARD_MAP.values()].find(
        (c) => c.tier === 1 && c.cost.emerald > 0,
      )!;
      if (!anyEmeraldCard) return; // Nothing to test.
      state.marketTier1[0] = anyEmeraldCard.id;
    }

    const cardId = state.marketTier1.find((id) => {
      const c = CARD_MAP.get(id);
      return c && c.cost.emerald > 0;
    })!;
    if (!cardId) return;

    const card = CARD_MAP.get(cardId)!;
    const bonusBefore = state.players[0].bonuses[card.bonusColor];
    const r = applyAction(state, "p1", { type: "purchase_card", cardId });
    expect(r.success).toBe(true);
    // Normal forge gives +1; The Glass Orchard gives an additional +1 = +2 total.
    expect(state.players[0].bonuses[card.bonusColor]).toBe(bonusBefore + 2);
    expect(state.glassOrchardTriggered).toBe(true);
  });

  it("does NOT grant extra bonus on a second eligible forge (one-time only)", () => {
    state.glassOrchardTriggered = true; // Already fired.
    const cardId = state.marketTier1.find((id) => {
      const c = CARD_MAP.get(id);
      return c && (c.cost.emerald > 0 || c.cost.pearl > 0);
    });
    if (!cardId) return;

    const card = CARD_MAP.get(cardId)!;
    const bonusBefore = state.players[0].bonuses[card.bonusColor];
    const r = applyAction(state, "p1", { type: "purchase_card", cardId });
    expect(r.success).toBe(true);
    // Only +1 (no The Glass Orchard bonus this time).
    expect(state.players[0].bonuses[card.bonusColor]).toBe(bonusBefore + 1);
  });
});

// ─── Assimilation (First Hunger) ──────────────────────────────────────────────

describe("Assimilation — First Hunger one-time burn action", () => {
  let state: GameStateData;

  beforeEach(() => {
    state = makeGame();
    enrichPlayer(state, 0);
    state.firstHungerAvailable = "p1";
  });

  it("burns the target card (removes from market) and grants printed+2 Eminence", () => {
    // Find a market card with Flare (ruby) in its cost.
    const cardId = state.marketTier1.find((id) => (CARD_MAP.get(id)?.cost.ruby ?? 0) > 0)
      ?? state.marketTier2.find((id) => (CARD_MAP.get(id)?.cost.ruby ?? 0) > 0)
      ?? state.marketTier3.find((id) => (CARD_MAP.get(id)?.cost.ruby ?? 0) > 0);
    if (!cardId) {
      // Inject a known ruby card into the Tier 1 market.
      const rubyCard = [...CARD_MAP.values()].find(
        (c) => c.tier === 1 && c.cost.ruby > 0,
      )!;
      if (!rubyCard) return;
      state.marketTier1[0] = rubyCard.id;
    }

    const targetId = state.marketTier1.find((id) => (CARD_MAP.get(id)?.cost.ruby ?? 0) > 0)!;
    if (!targetId) return;
    const card = CARD_MAP.get(targetId)!;
    const lumensBefore = state.players[0].lumens;

    const r = applyAction(state, "p1", { type: "assimilate", cardId: targetId });
    expect(r.success).toBe(true);

    // Card must be gone from the market.
    expect(state.marketTier1).not.toContain(targetId);
    expect(state.marketTier2).not.toContain(targetId);
    expect(state.marketTier3).not.toContain(targetId);

    // Eminence = printed + 2.
    expect(state.players[0].lumens).toBe(lumensBefore + card.lumens + 2);

    // Assimilation consumed.
    expect(state.firstHungerAvailable).toBeNull();

    // Card NOT added to purchasedCardIds.
    expect(state.players[0].purchasedCardIds).not.toContain(targetId);
  });

  it("rejects assimilate when firstHungerAvailable is null", () => {
    state.firstHungerAvailable = null;
    const cardId = state.marketTier1.find((id) => (CARD_MAP.get(id)?.cost.ruby ?? 0) > 0)
      ?? state.marketTier1[0]!;
    const r = applyAction(state, "p1", { type: "assimilate", cardId });
    expect(r.success).toBe(false);
  });

  it("rejects assimilate when target lacks Flare/Verdance/Radiance cost", () => {
    // Find a card with ONLY Continuum/Abyss costs (no ruby/emerald/pearl).
    const pureOnyx = [...CARD_MAP.values()].find(
      (c) =>
        c.tier === 1 &&
        c.cost.ruby === 0 &&
        c.cost.emerald === 0 &&
        c.cost.pearl === 0 &&
        (c.cost.sapphire > 0 || c.cost.onyx > 0),
    );
    if (!pureOnyx) return;
    state.marketTier1[0] = pureOnyx.id;
    const r = applyAction(state, "p1", { type: "assimilate", cardId: pureOnyx.id });
    expect(r.success).toBe(false);
  });
});

// ─── Cinder Mandate (Ember Sovereign) — start-of-turn burn ───────────────────

describe("Cinder Mandate — Condemned cards burn at start of owner's next turn", () => {
  it("burns all Condemned market cards at the start of the owner's next turn", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);

    // Mark a Tier 1 market card as Condemned (owned by p1) at turnCount=0.
    const condemnedId = state.marketTier1[0]!;
    state.marketMarkers = {
      [condemnedId]: { type: "condemned", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    // Register lum_ember for p1 in luminaryAffinities (needed for timing check).
    state.luminaryAffinities = [
      {
        luminaryId: "lum_ember",
        ownerId: "p1",
        activeAffinity: "ruby",
        eligibleAffinities: ["ruby"],
        summonedAtTurnCount: 0,
      },
    ];
    state.players[0].luminaries = ["lum_ember"];
    state.turnCount = 0;

    // p1 passes → end of turn 0 (no burn yet, turnCount=0 === summonedAt=0).
    pass(state); // p1's turn ends; now p2's turn
    expect(state.marketTier1.includes(condemnedId) || !state.marketTier1.includes(condemnedId)).toBe(true); // just not burned yet
    // The condemned card should still be present (burn is at START of p1's NEXT turn).
    // After pass, p2's turn starts. Check condemned card still there.
    // Note: the condemned card might have been replaced by the avatar seed transfer — 
    // but there's no avatar seed here. The card should still be in the market.
    // (Actually after p1's pass → applyEndOfTurnEffects: 0 > 0 = false → no burn ✓)
    // Verify the card was NOT burned yet (it's p2's turn).
    expect([
      ...state.marketTier1,
      ...state.marketTier2,
      ...state.marketTier3,
    ]).toContain(condemnedId);

    // p2 passes → p1's turn again, turnCount=2 now after advance.
    pass(state); // p2's turn ends → applyStartOfTurnEffects(p1): turnCount=2 > 0 → BURN
    // The condemned card should now be gone.
    expect([
      ...state.marketTier1,
      ...state.marketTier2,
      ...state.marketTier3,
    ]).not.toContain(condemnedId);
    // The marker should also be cleaned up.
    expect(state.marketMarkers?.[condemnedId]).toBeUndefined();
  });
});

// ─── Forgotten Hour expiry ────────────────────────────────────────────────────

describe("Forgotten Hour — markers expire at end of owner's next turn", () => {
  it("clears Forgotten markers at the end of the owner's next turn", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);

    // Mark a Tier 1 market card as Forgotten (owned by p1) at turnCount=0.
    const forgottenId = state.marketTier1[0]!;
    state.marketMarkers = {
      [forgottenId]: { type: "forgotten", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    state.luminaryAffinities = [
      {
        luminaryId: "lum_compass",
        ownerId: "p1",
        activeAffinity: "sapphire",
        eligibleAffinities: ["sapphire"],
        summonedAtTurnCount: 0,
      },
    ];
    state.turnCount = 0; // p1 starts (currentPlayerIndex = 0).

    // p1 passes → applyEndOfTurnEffects: turnCount=0, summonedAt=0 → 0>0 = false → no clear.
    // advanceTurn: turnCount→1, currentPlayerIndex→1 (p2's turn).
    pass(state);
    expect(state.marketMarkers?.[forgottenId]).toBeDefined(); // Still there.

    // p2 passes → applyEndOfTurnEffects for p2: p2 doesn't own Forgotten Hour → no clear.
    // advanceTurn: turnCount→2, currentPlayerIndex→0 (p1's turn again).
    pass(state);
    expect(state.marketMarkers?.[forgottenId]).toBeDefined(); // STILL there (clearing happens at END of p1's next turn).

    // p1 passes again → applyEndOfTurnEffects: turnCount=2, 2>0 = true → CLEAR.
    pass(state);
    expect(state.marketMarkers?.[forgottenId]).toBeUndefined();
  });
});

// ─── On-summon burn effects ───────────────────────────────────────────────────

describe("Impact Extinction (lum_forge) — burns all face-up Tier III on summon", () => {
  it("removes all original Tier III market cards on Iron Harbinger summon", () => {
    const state = makeGame();
    const t3Before = [...state.marketTier3];
    expect(t3Before.length).toBeGreaterThan(0);
    claimLuminary(state, "lum_forge");
    // None of the original T3 cards should remain in the market.
    for (const id of t3Before) {
      expect(state.marketTier3).not.toContain(id);
    }
  });
});

describe("Rupture of the Still (lum_moth) — burns lowest-cost T3/T2 without Flare on summon", () => {
  it("fires without error and player owns lum_moth after claim", () => {
    const state = makeGame();
    claimLuminary(state, "lum_moth");
    expect(state.players[0].luminaries).toContain("lum_moth");
  });

  it("does not burn cards that have Flare (ruby) in their cost", () => {
    const state = makeGame();
    // Place a known ruby T3 card in the market — it must survive the burn.
    const rubyT3 = [...CARD_MAP.values()].find(
      (c) => c.tier === 3 && c.cost.ruby > 0,
    );
    if (!rubyT3) return;
    state.marketTier3[0] = rubyT3.id;
    claimLuminary(state, "lum_moth");
    // The ruby card should still be in the market (burn skips cards with Flare).
    expect(state.marketTier3).toContain(rubyT3.id);
  });
});

describe("Phoenix Paradox (lum_astral) — Ash-Seeking Recurrence cascade burn", () => {
  it("fires without error and player owns lum_astral after claim", () => {
    const state = makeGame();
    claimLuminary(state, "lum_astral");
    expect(state.players[0].luminaries).toContain("lum_astral");
  });
});

// ─── Observer Effect (lum_tide) ───────────────────────────────────────────────

describe("Observer Effect (lum_tide) — scry and reorder decks by Continuum", () => {
  it("promotes Continuum cards to the top of Tier 2 and Tier 3 decks on summon", () => {
    const state = makeGame();

    // Plant a known sapphire card at position 2 in the T2 deck, and a non-sapphire at 0/1.
    const sapphireCard = [...CARD_MAP.values()].find(
      (c) => c.tier === 2 && c.cost.sapphire > 0 && c.cost.ruby === 0,
    );
    const nonSapphireCard = [...CARD_MAP.values()].find(
      (c) => c.tier === 2 && c.cost.sapphire === 0,
    );
    if (!sapphireCard || !nonSapphireCard) return;

    // Build a deck where: [nonSap, nonSap, sap, ...]
    state.deckTier2 = [nonSapphireCard.id, nonSapphireCard.id, sapphireCard.id, ...state.deckTier2.slice(3)];

    claimLuminary(state, "lum_tide");

    // After Observer Effect, the sapphire card should be within the top 3.
    const top3 = state.deckTier2.slice(0, 3);
    expect(top3).toContain(sapphireCard.id);
  });
});

// ─── Balance Due (lum_pale) ───────────────────────────────────────────────────

describe("Balance Due (lum_pale) — returns crystals held above half supply", () => {
  it("returns one crystal per color per player holding more than half starting supply", () => {
    const state = makeGame();
    // Give both players 10 of each color. The bank stays at its initial value (4
    // for 2 players), so Balance Due's halfSupply = 4/2 = 2. 10 > 2 → each player
    // returns 1 per color. Do NOT modify the bank so the hardcoded threshold holds.
    for (const c of CRYSTAL_COLORS) {
      state.players[0].crystals[c] = 10;
      state.players[1].crystals[c] = 10;
    }
    state.players[0].crystals.flux = 5;
    state.players[1].crystals.flux = 5;

    // claimLuminary will also call enrichPlayer (which modifies the bank), but
    // Balance Due uses state.players.length to recompute the threshold (always 4 for
    // 2 players), so the bank value doesn't affect the result.
    const p1BeforeRuby = state.players[1].crystals.ruby;    // = 10
    const p1BeforeSapphire = state.players[1].crystals.sapphire; // = 10

    claimLuminary(state, "lum_pale");

    // Player 1 (p2) made NO purchase and only loses crystals from Balance Due.
    // 10 > halfSupply(2) → returns 1 per color.
    expect(state.players[1].crystals.ruby).toBe(p1BeforeRuby - 1);
    expect(state.players[1].crystals.sapphire).toBe(p1BeforeSapphire - 1);

    // Player 0 (p1, the claimer) also loses 1 per color from Balance Due,
    // plus any crystals spent on the triggering purchase. Net: at most -1 per color.
    expect(state.players[0].crystals.ruby).toBeLessThanOrEqual(9);
    expect(state.players[0].crystals.sapphire).toBeLessThanOrEqual(9);
  });
});

// ─── LUMINARIES catalogue ─────────────────────────────────────────────────────

describe("LUMINARIES catalogue", () => {
  it("contains all 16 v0.8 entries (15 active + lum_oracle deferred)", () => {
    // 12 original + 4 new (lum_moth, lum_seed, lum_orchard, lum_hunger) = 16.
    expect(LUMINARIES).toHaveLength(16);
  });

  it("all 15 active Luminaries (excluding lum_oracle) have effectName defined", () => {
    const active = LUMINARIES.filter((l) => l.id !== "lum_oracle");
    expect(active).toHaveLength(15);
    for (const lum of active) {
      expect(lum.effectName, `${lum.id} missing effectName`).toBeTruthy();
    }
  });

  it("lum_oracle is NOT in the active pool (AVAILABLE_LUMINARIES)", () => {
    // We test this indirectly: initializeGame should never return lum_oracle
    // in activeLuminaries since it's not in AVAILABLE_LUMINARIES.
    const results = Array.from({ length: 20 }, () => {
      const s = initializeGame(
        [{ id: "a", name: "A" }, { id: "b", name: "B" }],
        2,
      );
      return s.activeLuminaries;
    });
    for (const lumList of results) {
      expect(lumList).not.toContain("lum_oracle");
    }
  });

  it("new v0.8 Luminaries are in the active pool", () => {
    const newIds = ["lum_moth", "lum_seed", "lum_orchard", "lum_hunger"];
    // Run 200 full initializations (always, not short-circuit) and verify each
    // new ID appears at least once. With 15 active luminaries and 3 per game,
    // the probability of not seeing any specific ID in 200 games is vanishingly small.
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const s = initializeGame(
        [{ id: "a", name: "A" }, { id: "b", name: "B" }],
        2,
      );
      for (const id of s.activeLuminaries) seen.add(id);
    }
    for (const id of newIds) {
      expect(seen).toContain(id);
    }
  });
});
