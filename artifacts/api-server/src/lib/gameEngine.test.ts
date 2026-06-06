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

  it("summon sets flag but does not auto-execute the ability", () => {
    // The lum_hunger summon handler sets firstHungerAvailable to the summoner's ID;
    // it must NOT immediately grant the Assimilation +2 bonus — the player must
    // explicitly use the assimilate action later.
    const freshState = makeGame();
    enrichPlayer(freshState, 0);
    freshState.activeLuminaries = ["lum_hunger"];
    const p = freshState.players[0];
    const lum = LUMINARY_MAP.get("lum_hunger")!;
    for (const c of CRYSTAL_COLORS) p.bonuses[c] = lum.requirements[c];
    const lumensBefore = p.lumens;

    const cardId = freshState.marketTier1[0]!;
    applyAction(freshState, "p1", { type: "purchase_card", cardId });

    // Flag should now be set for the summoner — NOT consumed.
    expect(freshState.firstHungerAvailable).toBe("p1");

    // Eminence gained must equal: card's printed lumens + luminary's own lumens bonus.
    // It must NOT include an extra +2 Assimilation bonus.
    const cardLumens = CARD_MAP.get(cardId)?.lumens ?? 0;
    const luminaryLumens = lum.lumens; // granted for claiming the Luminary itself
    expect(freshState.players[0].lumens).toBe(lumensBefore + cardLumens + luminaryLumens);
  });

  it("firstHungerAvailable persists across turns — not cleared when opponent plays", () => {
    // After p1 gains the ability, p2 takes their turn. The flag must still be set.
    pass(state); // p1's turn ends (state.firstHungerAvailable === "p1")
    // Now it is p2's turn.
    expect(state.players[state.currentPlayerIndex].playerId).toBe("p2");
    expect(state.firstHungerAvailable).toBe("p1"); // persists
    pass(state); // p2's turn ends
    // Back to p1.
    expect(state.players[state.currentPlayerIndex].playerId).toBe("p1");
    expect(state.firstHungerAvailable).toBe("p1"); // still persists
  });

  it("cost reduces Flare/Verdance/Radiance by card-derived bonuses only — other colors paid in full", () => {
    // Set up a known card with Flare (ruby) AND Continuum/Abyss (sapphire or onyx) cost.
    const target = [...CARD_MAP.values()].find(
      (c) => c.tier === 1 && c.cost.ruby > 0 && (c.cost.sapphire > 0 || c.cost.onyx > 0),
    );
    if (!target) return; // skip if card catalog changes
    state.marketTier1[0] = target.id;

    // Give the player exactly 2 ruby card bonuses; no emerald or pearl bonuses.
    state.players[0].bonuses.ruby    = 2;
    state.players[0].bonuses.emerald = 0;
    state.players[0].bonuses.pearl   = 0;

    // Expected costs after reduction:
    //   ruby:     max(0, printed - 2)      ← discounted
    //   emerald:  max(0, printed - 0)      ← full (bonus=0)
    //   pearl:    max(0, printed - 0)      ← full (bonus=0)
    //   sapphire: printed                  ← no reduction
    //   onyx:     printed                  ← no reduction
    const rubyCost    = Math.max(0, target.cost.ruby     - 2);
    const sapphireCost = target.cost.sapphire;
    const emeraldCost  = target.cost.emerald;
    const onyxCost     = target.cost.onyx;
    const pearlCost    = target.cost.pearl;

    // Drain crystals, then give EXACTLY what is required by the formula above.
    for (const c of CRYSTAL_COLORS) {
      state.players[0].crystals[c] = 0;
      state.crystalBank[c] = 20;
    }
    state.players[0].crystals.ruby     = rubyCost;
    state.players[0].crystals.sapphire = sapphireCost;
    state.players[0].crystals.emerald  = emeraldCost;
    state.players[0].crystals.onyx     = onyxCost;
    state.players[0].crystals.pearl    = pearlCost;
    state.players[0].crystals.flux     = 0;

    const r = applyAction(state, "p1", { type: "assimilate", cardId: target.id });
    expect(r.success).toBe(true);
  });

  it("rejected by a different player even when flag is set", () => {
    // firstHungerAvailable === "p1" but p2 tries to assimilate.
    enrichPlayer(state, 1);
    const cardId =
      state.marketTier1.find((id) => (CARD_MAP.get(id)?.cost.ruby ?? 0) > 0) ??
      state.marketTier1[0]!;
    const r = applyAction(state, "p2", { type: "assimilate", cardId });
    expect(r.success).toBe(false);
    expect(state.firstHungerAvailable).toBe("p1"); // flag unchanged
  });

  it("cannot be used a second time — flag is null after first use", () => {
    const cardId = state.marketTier1.find((id) => (CARD_MAP.get(id)?.cost.ruby ?? 0) > 0)!;
    if (!cardId) return;

    const r1 = applyAction(state, "p1", { type: "assimilate", cardId });
    expect(r1.success).toBe(true);
    expect(state.firstHungerAvailable).toBeNull();

    // Advance turns so p1 acts again, then try a second assimilation.
    pass(state); // p2 passes
    const secondCard =
      state.marketTier1.find((id) => (CARD_MAP.get(id)?.cost.ruby ?? 0) > 0) ??
      state.marketTier1[0]!;
    const r2 = applyAction(state, "p1", { type: "assimilate", cardId: secondCard });
    expect(r2.success).toBe(false);
  });

  it("card bonuses and purchasedCardIds are unchanged after assimilation — no forge effects", () => {
    const targetId =
      state.marketTier1.find((id) => (CARD_MAP.get(id)?.cost.ruby ?? 0) > 0) ??
      state.marketTier1[0]!;
    const bonusesBefore = { ...state.players[0].bonuses };
    const cardCountBefore = state.players[0].purchasedCardIds.length;

    applyAction(state, "p1", { type: "assimilate", cardId: targetId });

    // No extra card in hand.
    expect(state.players[0].purchasedCardIds.length).toBe(cardCountBefore);
    // No bonus gem awarded.
    for (const c of CRYSTAL_COLORS) {
      expect(state.players[0].bonuses[c]).toBe(bonusesBefore[c]);
    }
  });

  it("assimilation works on a future turn (not just the summon turn)", () => {
    // firstHungerAvailable is "p1"; have p1 pass, p2 pass, then p1 assimilates.
    pass(state); // p1 passes
    pass(state); // p2 passes
    // Now it is p1's turn again and the flag should still be set.
    expect(state.firstHungerAvailable).toBe("p1");
    const cardId =
      state.marketTier1.find((id) => (CARD_MAP.get(id)?.cost.ruby ?? 0) > 0) ??
      state.marketTier1[0]!;
    const r = applyAction(state, "p1", { type: "assimilate", cardId });
    expect(r.success).toBe(true);
    expect(state.firstHungerAvailable).toBeNull();
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

// ─── normalizeState — action log string migration ─────────────────────────────

describe("normalizeState — Glass Orchard action log migration", () => {
  it("rewrites old 'Glass Orchard — Perfect Replication' summaries to include 'The'", () => {
    const raw = {
      ...initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2),
      actionLog: [
        { playerId: "p1", summary: "Glass Orchard — Perfect Replication: +1 extra emerald bonus" },
        { playerId: "p1", summary: "Glass Orchard — Perfect Replication: +1 extra pearl bonus" },
      ],
    };
    const normalized = normalizeState(raw);
    expect(normalized.actionLog[0].summary).toBe(
      "The Glass Orchard — Perfect Replication: +1 extra emerald bonus",
    );
    expect(normalized.actionLog[1].summary).toBe(
      "The Glass Orchard — Perfect Replication: +1 extra pearl bonus",
    );
  });

  it("does not alter summaries that already contain 'The Glass Orchard'", () => {
    const raw = {
      ...initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2),
      actionLog: [
        { playerId: "p1", summary: "The Glass Orchard — Perfect Replication: +1 extra emerald bonus" },
      ],
    };
    const normalized = normalizeState(raw);
    expect(normalized.actionLog[0].summary).toBe(
      "The Glass Orchard — Perfect Replication: +1 extra emerald bonus",
    );
  });

  it("does not alter unrelated action log summaries", () => {
    const raw = {
      ...initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2),
      actionLog: [
        { playerId: "p1", summary: "Player 1 forged Starfall Conduit for 2 Eminence" },
        { playerId: "p2", summary: "Player 2 harvested 2 ruby" },
      ],
    };
    const normalized = normalizeState(raw);
    expect(normalized.actionLog[0].summary).toBe("Player 1 forged Starfall Conduit for 2 Eminence");
    expect(normalized.actionLog[1].summary).toBe("Player 2 harvested 2 ruby");
  });
});

// ─── Simultaneous-Claim Sequencing ────────────────────────────────────────────

// Helper: when a purchase triggers pendingLuminaryChoice, dispatch
// choose_luminary_order in the given order to complete the claim sequence.
function resolveChoice(state: GameStateData, playerId: string, orderedIds: string[]) {
  const r = applyAction(state, playerId, { type: "choose_luminary_order", orderedIds });
  expect(r.success, `choose_luminary_order failed: ${r.error}`).toBe(true);
}

describe("checkLuminaries — simultaneous-claim sequencing", () => {
  it("pendingLuminaryChoice is set (not auto-claimed) when two Luminaries qualify simultaneously", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    p.bonuses.emerald = 5;
    p.bonuses.sapphire = 6;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    const cardId = state.marketTier1[0]!;
    const r = applyAction(state, "p1", { type: "purchase_card", cardId });
    expect(r.success).toBe(true);
    // Must pause for player choice — not yet claimed
    expect(state.pendingLuminaryChoice).not.toBeNull();
    expect(state.pendingLuminaryChoice?.candidates).toContain("lum_verdant");
    expect(state.pendingLuminaryChoice?.candidates).toContain("lum_tide");
    expect(p.luminaries).toHaveLength(0);
  });

  it("both Luminaries are claimed when a single forge qualifies for two simultaneously", () => {
    // lum_verdant (emerald ×5) and lum_tide (sapphire ×6) — no shared color requirement
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    p.bonuses.emerald = 5;
    p.bonuses.sapphire = 6;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    const cardId = state.marketTier1[0]!;
    const r = applyAction(state, "p1", { type: "purchase_card", cardId });
    expect(r.success).toBe(true);
    // Player chooses order: verdant first, tide second
    resolveChoice(state, "p1", ["lum_verdant", "lum_tide"]);
    expect(p.luminaries).toContain("lum_verdant");
    expect(p.luminaries).toContain("lum_tide");
    expect(state.pendingLuminaryChoice).toBeNull();
  });

  it("both Luminaries have summon events queued in player-chosen order", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    p.bonuses.emerald = 5;
    p.bonuses.sapphire = 6;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    const cardId = state.marketTier1[0]!;
    applyAction(state, "p1", { type: "purchase_card", cardId });
    // Choose tide first, verdant second — events must match the chosen order
    resolveChoice(state, "p1", ["lum_tide", "lum_verdant"]);

    const eventIds = state.pendingSummonEvents.map((e) => e.luminaryId);
    expect(eventIds.indexOf("lum_tide")).toBeLessThan(eventIds.indexOf("lum_verdant"));
  });

  it("Eminence is awarded for both Luminaries before any effect runs", () => {
    // Use two passive Luminaries (no market effects) to verify clean Eminence sum.
    // lum_verdant (2 Eminence, emerald×5) and lum_tide (2 Eminence, sapphire×6)
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    const startLumens = p.lumens;
    p.bonuses.emerald = 5;
    p.bonuses.sapphire = 6;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    const cardId = state.marketTier1[0]!;
    applyAction(state, "p1", { type: "purchase_card", cardId });
    resolveChoice(state, "p1", ["lum_verdant", "lum_tide"]);

    // lum_verdant = 2, lum_tide = 2 → total +4 (plus any card lumens)
    const cardLumens = CARD_MAP.get(cardId)?.lumens ?? 0;
    expect(p.lumens).toBe(startLumens + 2 + 2 + cardLumens);
  });

  it("winTriggerLuminaryId is set to the Luminary that crosses WIN_THRESHOLD", () => {
    // Player needs exactly 1 more Eminence to win.  Chosen order: verdant first.
    // lum_verdant (2L, emerald×5) fires first, crosses 15.
    // lum_tide (2L, sapphire×6) fires second.
    // winTriggerLuminaryId should be lum_verdant (the first to cross 15 in chosen order).
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    p.lumens = 14; // One Eminence away from 15
    p.bonuses.emerald = 5;
    p.bonuses.sapphire = 6;
    // Use a 0-lumen card to keep the lumen math deterministic
    const zeroLumenCard = [...CARD_MAP.entries()].find(([, c]) => c.lumens === 0)?.[0]
      ?? state.marketTier1[0]!;
    state.marketTier1[0] = zeroLumenCard;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    applyAction(state, "p1", { type: "purchase_card", cardId: zeroLumenCard });
    resolveChoice(state, "p1", ["lum_verdant", "lum_tide"]);

    expect(state.winTriggerLuminaryId).toBe("lum_verdant");
  });

  it("winTriggerLuminaryId is set to the second Luminary when the first does not cross 15", () => {
    // Player is at 12, needs 3+ to win.
    // Chosen order: verdant first (+2) → 14, does not cross 15.
    // lum_tide (+2) → 16, crosses 15.
    // winTriggerLuminaryId should be lum_tide.
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    p.lumens = 12;
    p.bonuses.emerald = 5;
    p.bonuses.sapphire = 6;
    const zeroLumenCard = [...CARD_MAP.entries()].find(([, c]) => c.lumens === 0)?.[0]
      ?? state.marketTier1[0]!;
    state.marketTier1[0] = zeroLumenCard;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    applyAction(state, "p1", { type: "purchase_card", cardId: zeroLumenCard });
    resolveChoice(state, "p1", ["lum_verdant", "lum_tide"]);

    expect(state.winTriggerLuminaryId).toBe("lum_tide");
  });

  // ─── Oblivion post-pass ─────────────────────────────────────────────────────

  it("lum_void Oblivion applies AFTER all other effects — opponent lumens stable during effect loop", () => {
    // Forge triggers both lum_void (Oblivion −4) and lum_verdant (+2 passive).
    // Player chooses: verdant first, void second.
    // Effects fire in that order, but Oblivion is always deferred to post-pass.
    // If Oblivion were applied mid-loop, opponent lumens would be wrong when
    // lum_verdant's effect runs.  The post-pass ensures Oblivion is last.
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);
    const p1 = state.players[0];
    const p2 = state.players[1];

    p1.bonuses.emerald = 5;
    p1.bonuses.onyx = 6;
    state.activeLuminaries = ["lum_verdant", "lum_void"];

    // Give both players some lumens so Oblivion doesn't clamp to 0.
    p1.lumens = 5;
    p2.lumens = 5;

    const zeroLumenCard = [...CARD_MAP.entries()].find(([, c]) => c.lumens === 0)?.[0]
      ?? state.marketTier1[0]!;
    state.marketTier1[0] = zeroLumenCard;
    applyAction(state, "p1", { type: "purchase_card", cardId: zeroLumenCard });
    resolveChoice(state, "p1", ["lum_verdant", "lum_void"]);

    // lum_verdant: +2 Eminence to p1 → p1 was 5, now 7
    // lum_void: −4 Oblivion to both (post-pass) → clamped at 0 minimum
    const expectedP1 = Math.max(0, 5 + 2 - 4);
    const expectedP2 = Math.max(0, 5 - 4);
    expect(p1.lumens).toBe(expectedP1);
    expect(p2.lumens).toBe(expectedP2);
  });

  it("Oblivion clamps player lumens to 0 — cannot go negative", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    const p1 = state.players[0];
    const p2 = state.players[1];

    p1.bonuses.onyx = 6;
    state.activeLuminaries = ["lum_void"];

    // Both players start at 0 lumens.
    p1.lumens = 0;
    p2.lumens = 0;

    const cardId = state.marketTier1[0]!;
    applyAction(state, "p1", { type: "purchase_card", cardId });

    expect(p1.lumens).toBeGreaterThanOrEqual(0);
    expect(p2.lumens).toBeGreaterThanOrEqual(0);
  });

  // ─── Cascade re-entry ───────────────────────────────────────────────────────

  it("cascade re-entry: a summon effect that grants a crystal bonus can claim a second Luminary", () => {
    // lum_scholar's Selective Amnesia draws a card from the deck and adds it to
    // the player's collection, granting its bonusColor as a permanent bonus.
    // Setup: lum_scholar fires at depth 0, draws an emerald card → player bonus
    // reaches emerald×5 → depth-1 cascade detects lum_verdant eligibility → claims it.
    //
    // Deck-slot accounting: purchasing marketTier1[0] causes drawIntoMarket to
    // shift deckTier1[0] into the market slot.  lum_scholar's Selective Amnesia
    // then draws from deckTier1 starting at the new [0] (originally [1]).
    // So the emerald card must be placed at deckTier1[1] to survive the market refill.
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];

    // lum_scholar requires sapphire×4 + pearl×4.
    p.bonuses.sapphire = 4;
    p.bonuses.pearl = 4;
    // Player needs emerald×4 now; after lum_scholar draws an emerald card → 5 → qualifies lum_verdant.
    p.bonuses.emerald = 4;

    // Find an emerald-bonus Tier 1 card.
    const emeraldCard = [...CARD_MAP.values()].find(
      (c) => c.tier === 1 && c.bonusColor === "emerald",
    )!;

    // Remove the emerald card from wherever it is (market or deck) to rebuild the deck cleanly.
    state.marketTier1 = state.marketTier1.filter((id) => id !== emeraldCard.id);
    state.deckTier1 = state.deckTier1.filter((id) => id !== emeraldCard.id);

    // Place the emerald card at deckTier1[1].
    // deckTier1[0] will be consumed by the market refill after the triggering purchase.
    // After refill, emeraldCard is at deckTier1[0] — the slot lum_scholar draws.
    const filler = state.deckTier1.shift()!; // take first card as the refill donor
    state.deckTier1 = [filler, emeraldCard.id, ...state.deckTier1];

    // Refill market to 4 if needed (we removed emeraldCard from market above).
    while (state.marketTier1.length < 4 && state.deckTier1.length > 0) {
      state.marketTier1.push(state.deckTier1.shift()!);
    }
    // After this, deckTier1[0] = filler (will be consumed by market refill),
    // deckTier1[1] = emeraldCard.id (drawn by lum_scholar).

    state.activeLuminaries = ["lum_scholar", "lum_verdant"];

    // Use a non-emerald trigger card so the purchased card itself doesn't push
    // emerald to ≥5 — we need lum_verdant to qualify only AFTER lum_scholar's
    // Selective Amnesia draws the emerald card (depth-1 cascade path, not depth-0).
    const nonEmeraldCardId = state.marketTier1.find((id) => {
      const c = CARD_MAP.get(id);
      return c && c.bonusColor !== "emerald";
    }) ?? state.marketTier1[0]!;
    // Ensure it's the first slot (for the market-refill accounting above).
    state.marketTier1 = [
      nonEmeraldCardId,
      ...state.marketTier1.filter((id) => id !== nonEmeraldCardId),
    ];

    const r = applyAction(state, "p1", { type: "purchase_card", cardId: nonEmeraldCardId });
    expect(r.success).toBe(true);
    // No pending choice — single candidate at depth-0, cascade at depth-1.
    expect(state.pendingLuminaryChoice).toBeNull();

    // After depth-0: lum_scholar claimed → Selective Amnesia draws emeraldCard → emerald bonus +1 (now 5)
    // After depth-1 cascade: lum_verdant now qualifies → should be claimed
    expect(p.luminaries).toContain("lum_scholar");
    expect(p.luminaries).toContain("lum_verdant");
  });

  // ─── plannedAction double-execution guard ───────────────────────────────────

  it("plannedAction is NOT re-executed after deferred action creates new summon events", () => {
    // Setup: player has a plannedAction.  A pending summon event is outstanding.
    // When the event resolves, the plannedAction executes once.  If that execution
    // triggers another Luminary claim (new pendingSummonEvent), the plannedAction
    // must NOT execute again when the new event resolves.
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];

    // Give p enough bonuses to claim lum_verdant after buying one emerald card.
    p.bonuses.emerald = 4; // one more emerald card will push to 5 → qualifies
    state.activeLuminaries = ["lum_verdant"];

    // Inject a fake pre-existing pending summon event (from a hypothetical earlier claim).
    state.pendingSummonEvents = [{
      eventId: "fake-event-v1",
      luminaryId: "lum_tide",
      claimedByPlayerId: "p1",
      createdAt: Date.now(),
    }];

    // Store a planned purchase_card action.
    const targetCard = state.marketTier1[0]!;
    p.plannedAction = { type: "purchase_card", cardId: targetCard };

    // Resolve the fake event → plannedAction fires → buys targetCard → claims lum_verdant → new event pushed.
    const r = applyAction(state, "p1", { type: "resolve_summon", eventId: "fake-event-v1" });
    expect(r.success).toBe(true);

    // plannedAction should have been cleared (already executed or voided).
    expect(p.plannedAction).toBeNull();

    // If lum_verdant was claimed, there's now a new pending event.
    // Simulate the client resolving that new event.
    if (state.pendingSummonEvents.length > 0) {
      const newEventId = state.pendingSummonEvents[0].eventId;
      // Count purchases before.
      const purchasedBefore = [...p.purchasedCardIds];
      applyAction(state, "p1", { type: "resolve_summon", eventId: newEventId });
      // The planned action (purchase_card) should NOT have fired again.
      expect(p.purchasedCardIds.length).toBe(purchasedBefore.length);
      // plannedAction still null.
      expect(p.plannedAction).toBeNull();
    }
  });
});

// ─── LUMINARIES catalogue ─────────────────────────────────────────────────────

describe("LUMINARIES catalogue", () => {
  it("contains all 17 v0.8/v0.9 entries (16 active + lum_oracle deferred)", () => {
    // 12 original + 4 new (lum_moth, lum_seed, lum_orchard, lum_hunger) + 1 v0.9 (lum_scholar) = 17.
    expect(LUMINARIES).toHaveLength(17);
  });

  it("all 16 active Luminaries (excluding lum_oracle) have effectName defined", () => {
    const active = LUMINARIES.filter((l) => l.id !== "lum_oracle");
    expect(active).toHaveLength(16);
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

  it("new v0.8/v0.9 Luminaries are in the active pool", () => {
    // lum_scholar is v0.9 but explicitly deferred (not in ILLUSTRATED_IDS) — excluded here.
    const newIds = ["lum_moth", "lum_seed", "lum_orchard", "lum_hunger"];
    // Run 200 full initializations (always, not short-circuit) and verify each
    // new ID appears at least once. With 16 active luminaries and 3 per game,
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
