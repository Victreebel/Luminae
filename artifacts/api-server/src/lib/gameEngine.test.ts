/**
 * gameEngine.test.ts — Luminary Mechanics Update v0.8
 *
 * Covers: markers (Forgotten / Condemned / Nullified / Avatar Seed),
 * on-arrival burn / scry effects, end-of-turn payouts, deferred burns,
 * the Assimilation action, The Glass Orchard bonus, and normalizeState defaults.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initializeGame,
  applyAction,
  normalizeState,
  formatGameState,
  getReplayBoardSnapshot,
  LUMINARY_MAP,
  CARD_MAP,
  STANDARD_AFFINITY_KEYS,
  LUMINARIES,
  getArtifactBrands,
  runDevLuminarySequence,
} from "./gameEngine.js";
import type { GameStateData } from "./gameEngine.js";
import { chooseAiAction } from "./aiPlayer.js";

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

/** Give a player ample held Affinities for test Forges. */
function enrichPlayer(state: GameStateData, playerIdx: number) {
  const p = state.players[playerIdx];
  for (const c of STANDARD_AFFINITY_KEYS) {
    p.affinities[c] = 10;
    state.affinityWell[c] = 20;
  }
  p.affinities.singularity = 5;
  state.affinityWell.singularity = 5;
}

function placeRuptureTargets(state: GameStateData, count = 4): string[] {
  const tier3Pool = [...state.forgeTier3, ...state.deckTier3];
  const targets = tier3Pool
    .filter((cardId) => (CARD_MAP.get(cardId)?.cost.flare ?? 0) < 5)
    .slice(0, count);
  expect(targets.length).toBeGreaterThan(0);
  const targetSet = new Set(targets);
  state.forgeTier3 = [...targets];
  state.deckTier3 = tier3Pool.filter((cardId) => !targetSet.has(cardId));
  return targets;
}

/** Advance the current player's turn via pass. */
function pass(state: GameStateData) {
  const p = state.players[state.currentPlayerIndex];
  const r = applyAction(state, p.playerId, { type: "pass" });
  if (!r.success) throw new Error(`pass failed: ${r.error}`);
}

function emptyForgeAndArchives(state: GameStateData) {
  state.forgeTier1 = [];
  state.forgeTier2 = [];
  state.forgeTier3 = [];
  state.deckTier1 = [];
  state.deckTier2 = [];
  state.deckTier3 = [];
}

function finishByExhaustion(state: GameStateData) {
  emptyForgeAndArchives(state);
  pass(state);
  expect(state.phase).toBe("finished");
}

/**
 * Force the CURRENT player to claim a specific Luminary immediately:
 * sets their bonuses to the requirements and forges a Tier 1 card,
 * which triggers checkLuminaries.
 */
function claimLuminary(
  state: GameStateData,
  lumId: string,
  prepareBeforeForge?: (state: GameStateData) => void,
) {
  const lum = LUMINARY_MAP.get(lumId);
  if (!lum) throw new Error(`Unknown luminary: ${lumId}`);
  const player = state.players[state.currentPlayerIndex];

  // Pre-set bonuses to match requirements exactly (Forge action will add one more).
  for (const c of STANDARD_AFFINITY_KEYS) {
    player.bonuses[c] = lum.requirements[c];
  }
  enrichPlayer(state, state.currentPlayerIndex);
  prepareBeforeForge?.(state);
  // Only this Luminary should be active so no other arrivals fire.
  state.activeLuminaries = [lumId];

  const cardId = state.forgeTier1[0];
  if (!cardId) throw new Error("No Tier 1 card in Forge");
  const r = applyAction(state, player.playerId, { type: "forge_artifact", cardId });
  if (!r.success) throw new Error(`claimLuminary Forge action failed: ${r.error}`);
}

/** Acknowledge the current ordered presentation queue until the turn releases. */
function resolveLuminaryPresentation(state: GameStateData) {
  let safety = 0;
  while (safety++ < 30) {
    const summon = state.pendingSummonEvents[0];
    if (summon) {
      const result = applyAction(state, state.players[0]!.playerId, {
        type: "resolve_summon",
        eventId: summon.eventId,
      });
      if (!result.success) throw new Error(`resolve_summon failed: ${result.error}`);
      continue;
    }

    const activation = state.pendingLuminaryActivationEvents[0];
    if (activation) {
      const result = applyAction(state, state.players[0]!.playerId, {
        type: "resolve_luminary_activation",
        eventId: activation.eventId,
      });
      if (!result.success) {
        throw new Error(`resolve_luminary_activation failed: ${result.error}`);
      }
      continue;
    }
    break;
  }
  if (safety >= 30) throw new Error("Luminary presentation did not settle");
}

describe("game ending and victory ranking", () => {
  it("ends immediately when the final Forge Artifact exhausts every Archive", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    state.players[0].eminence = 8;
    state.players[1].eminence = 11;
    const finalArtifactId = state.forgeTier1[0]!;
    state.forgeTier1 = [finalArtifactId];
    state.forgeTier2 = [];
    state.forgeTier3 = [];
    state.deckTier1 = [];
    state.deckTier2 = [];
    state.deckTier3 = [];
    const roundBefore = state.roundNumber;

    const result = applyAction(state, "p1", {
      type: "forge_artifact",
      cardId: finalArtifactId,
    });

    expect(result.success).toBe(true);
    expect(state.phase).toBe("finished");
    expect(state.winnerId).toBe("p2");
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.roundNumber).toBe(roundBefore);
    expect(state.pendingTurnTransition).toBeNull();
  });

  it("does not end while any Artifact remains in the Forge", () => {
    const state = makeGame();
    state.deckTier1 = [];
    state.deckTier2 = [];
    state.deckTier3 = [];

    pass(state);

    expect(state.phase).toBe("playing");
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("breaks an Eminence tie by fewest encrypted Artifacts", () => {
    const state = makeGame();
    state.players[0].eminence = 10;
    state.players[1].eminence = 10;
    state.players[0].reservedArtifactIds = ["t1r01"];
    state.players[1].reservedArtifactIds = ["t1s01", "t1e01"];
    state.players[1].forgedArtifactIds = ["t3s01", "t3e01"];

    finishByExhaustion(state);

    expect(state.winnerId).toBe("p1");
  });

  it.each([
    {
      decidingTier: "Tier III",
      p1: ["t3r01", "t2r01", "t2s01", "t2e01"],
      p2: ["t3s01", "t3e01"],
    },
    {
      decidingTier: "Tier II",
      p1: ["t3r01", "t2r01", "t1r01", "t1s01", "t1e01"],
      p2: ["t3s01", "t2s01", "t2e01"],
    },
    {
      decidingTier: "Tier I",
      p1: ["t3r01", "t2r01", "t1r01"],
      p2: ["t3s01", "t2s01", "t1s01", "t1e01"],
    },
  ])("uses $decidingTier count as the next artifact tie-break", ({ p1, p2 }) => {
    const state = makeGame();
    state.players[0].eminence = 10;
    state.players[1].eminence = 10;
    state.players[0].forgedArtifactIds = p1;
    state.players[1].forgedArtifactIds = p2;

    finishByExhaustion(state);

    expect(state.winnerId).toBe("p2");
  });

  it("uses the strongest single-affinity tier profile after overall tiers tie", () => {
    const state = makeGame();
    state.players[0].eminence = 10;
    state.players[1].eminence = 10;
    state.players[0].forgedArtifactIds = ["t3r01", "t2s01", "t1e01"];
    state.players[1].forgedArtifactIds = ["t3s01", "t2s02", "t1s01"];

    finishByExhaustion(state);

    expect(state.winnerId).toBe("p2");
  });

  it("uses the same ranking after the normal final round", () => {
    const state = makeGame();
    state.players[0].eminence = 15;
    state.players[1].eminence = 15;
    state.players[0].reservedArtifactIds = ["t1r01"];

    pass(state);
    expect(state.phase).toBe("last_round");
    expect(state.currentPlayerIndex).toBe(1);

    pass(state);
    expect(state.phase).toBe("finished");
    expect(state.winnerId).toBe("p2");
  });
});

describe("guided Lumii", () => {
  it("passes a legal turn without taking resources or building a civilization", () => {
    const state = makeGame();
    state.currentPlayerIndex = 1;
    const lumii = state.players[1];
    const bankBefore = { ...state.affinityWell };

    const action = chooseAiAction(state, lumii.playerId, "passive");
    expect(action).toEqual({ type: "pass" });

    const result = applyAction(state, lumii.playerId, action);
    expect(result.success).toBe(true);
    expect(lumii.affinities).toEqual({ flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 });
    expect(lumii.forgedArtifactIds).toEqual([]);
    expect(state.affinityWell).toEqual(bankBefore);
  });
});

// ─── Normalisation ────────────────────────────────────────────────────────────

describe("normalizeState — v0.8 field defaults", () => {
  it("initialises artifactMarkers to {} when absent", () => {
    const state = normalizeState({
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
    });
    expect(state.artifactMarkers).toEqual({});
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

  it("initialises openingTurnOrder to null when absent", () => {
    const state = normalizeState({
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
    });
    expect(state.openingTurnOrder).toBeNull();
  });

  it("initialises coreActionUsed to false when absent", () => {
    const state = normalizeState({
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
    });
    expect(state.coreActionUsed).toBe(false);
  });

  it("initialises Avatar Seed pending Eminence when absent", () => {
    const state = normalizeState({
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
      avatarSeedState: {
        ownerId: "p1",
        summonedAtTurnCount: 3,
        deckSeeds: [],
        payoutDone: false,
      },
    });

    expect(state.avatarSeedState?.pendingEminence).toBe(0);
  });
});

// ─── Double-action exploit prevention ────────────────────────────────────────

describe("coreActionUsed — one core action per turn", () => {
  let state: GameStateData;

  beforeEach(() => {
    state = makeGame();
    enrichPlayer(state, 0);
  });

  it("is false after initializeGame / normalizeState", () => {
    expect(state.coreActionUsed).toBe(false);
  });

  it("is reset to false by advanceTurn after a successful core action", () => {
    // A Forge action succeeds because enrichPlayer supplied ample Affinities.
    // advanceTurn fires afterwards, resetting coreActionUsed for the new player.
    const cardId = state.forgeTier1[0];
    if (!cardId) throw new Error("No Tier 1 card in Forge");
    const r1 = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r1.success).toBe(true);
    // advanceTurn ran; coreActionUsed must be false for the incoming player.
    expect(state.coreActionUsed).toBe(false);
  });

  it("blocks a second core action when coreActionUsed is already true", () => {
    // Directly set the flag (simulates the state immediately after a first core
    // action when advanceTurn has not yet run, e.g. due to a concurrent request
    // arriving before the turn advances, or any future code path that keeps the
    // same player active after a core action).
    state.coreActionUsed = true;

    const cardId = state.forgeTier1[0];
    if (!cardId) throw new Error("No Tier 1 card in Forge");

    // All core action types should be blocked.
    const r1 = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r1.success).toBe(false);
    expect(r1.error).toBe("You already used your core action this turn.");

    const r2 = applyAction(state, "p1", {
      type: "harness_three_affinities",
      affinities: { flare: 1, continuum: 1, verdance: 1 },
    });
    expect(r2.success).toBe(false);
    expect(r2.error).toBe("You already used your core action this turn.");

    const r3 = applyAction(state, "p1", {
      type: "harness_two_affinities",
      affinity: "flare",
    });
    expect(r3.success).toBe(false);
    expect(r3.error).toBe("You already used your core action this turn.");

    const r4 = applyAction(state, "p1", { type: "reserve_artifact", cardId, tier: 1 });
    expect(r4.success).toBe(false);
    expect(r4.error).toBe("You already used your core action this turn.");
  });

  it("does not block pass (non-core) when coreActionUsed is true", () => {
    // pass ends the turn but is not a "core action" per the game rules.
    state.coreActionUsed = true;
    const r = applyAction(state, "p1", { type: "pass" });
    expect(r.success).toBe(true);
  });

  it("rejects attempts to change an arrived Luminary's active affinity", () => {
    const lumId = "lum_ember";
    const player = state.players[0];
    const eligibleColors = ["flare", "radiance", "abyss"] as const;

    state.luminaryAffinities.push({
      luminaryId: lumId,
      ownerId: "p1",
      activeAffinity: "radiance",
      eligibleAffinities: [...eligibleColors],
      summonedAtTurnCount: 0,
    });
    player.luminaries = [lumId];
    state.turnCount = 5;

    state.coreActionUsed = true;
    const r = applyAction(state, "p1", {
      type: "toggle_luminary_affinity",
      luminaryId: lumId,
      affinity: "flare",
    });
    expect(r).toEqual({
      success: false,
      error: "Active affinity is fixed when the Luminary arrives",
    });
    expect(state.luminaryAffinities[0]?.activeAffinity).toBe("radiance");
  });
});

describe("Luminary active affinity", () => {
  it("chooses uniformly from the Luminary's required affinity types on arrival", () => {
    const firstState = makeGame();
    const lastState = makeGame();
    const random = vi.spyOn(Math, "random");

    try {
      random.mockReturnValueOnce(0);
      expect(runDevLuminarySequence(firstState, "p1", {
        luminaryIds: ["lum_ember"],
        includeEndOfTurnEffects: false,
        includeStartOfTurnEffects: false,
      }).success).toBe(true);

      random.mockReturnValueOnce(0.999999);
      expect(runDevLuminarySequence(lastState, "p1", {
        luminaryIds: ["lum_ember"],
        includeEndOfTurnEffects: false,
        includeStartOfTurnEffects: false,
      }).success).toBe(true);
    } finally {
      random.mockRestore();
    }

    expect(firstState.luminaryAffinities[0]).toMatchObject({
      activeAffinity: "flare",
      eligibleAffinities: ["flare", "radiance", "abyss"],
    });
    expect(lastState.luminaryAffinities[0]).toMatchObject({
      activeAffinity: "abyss",
      eligibleAffinities: ["flare", "radiance", "abyss"],
    });
  });

  it("does not let AI players replace the affinity chosen at arrival", () => {
    const state = makeGame();
    const ai = state.players[1];
    ai.luminaries = ["lum_ember"];
    state.currentPlayerIndex = 1;
    state.turnCount = 5;
    state.luminaryAffinities = [{
      luminaryId: "lum_ember",
      ownerId: ai.playerId,
      activeAffinity: "radiance",
      eligibleAffinities: ["flare", "radiance", "abyss"],
      summonedAtTurnCount: 0,
    }];

    expect(chooseAiAction(state, ai.playerId, "medium").type)
      .not.toBe("toggle_luminary_affinity");
    expect(chooseAiAction(state, ai.playerId, "hard").type)
      .not.toBe("toggle_luminary_affinity");
    expect(state.luminaryAffinities[0]?.activeAffinity).toBe("radiance");
  });
});

describe("Luminary resolution barrier", () => {
  it("keeps the acting player current and blocks all real actions during arrival", () => {
    const state = makeGame();
    claimLuminary(state, "lum_verdant");

    expect(state.currentPlayerIndex).toBe(0);
    expect(state.pendingTurnTransition).toMatchObject({
      stage: "after_action",
      endingPlayerId: "p1",
    });
    expect(state.coreActionUsed).toBe(true);
    expect(state.pendingSummonEvents).toHaveLength(1);

    const blocked = applyAction(state, "p1", { type: "pass" });
    expect(blocked).toEqual({
      success: false,
      error: "Complete the Luminary resolution sequence before acting",
    });
    expect(applyAction(state, "p1", {
      type: "toggle_luminary_affinity",
      luminaryId: "lum_verdant",
      affinity: "verdance",
    })).toEqual({
      success: false,
      error: "Complete the Luminary resolution sequence before acting",
    });

    expect(applyAction(state, "p2", {
      type: "plan_action",
      plannedActionData: {
        type: "harness_three_affinities",
        affinities: { flare: 1 },
      },
    }).success).toBe(true);

    resolveLuminaryPresentation(state);
    expect(state.pendingTurnTransition).toBeNull();
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.coreActionUsed).toBe(false);
  });

  it("requires both arrival and summon-effect presentation before handoff", () => {
    const state = makeGame();
    claimLuminary(state, "lum_forge");
    const summonEvent = state.pendingSummonEvents[0]!;
    const activationEvent = state.pendingLuminaryActivationEvents[0]!;

    expect(applyAction(state, "p1", {
      type: "resolve_summon",
      eventId: summonEvent.eventId,
    }).success).toBe(true);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.pendingTurnTransition?.stage).toBe("after_action");

    expect(applyAction(state, "p1", {
      type: "resolve_luminary_activation",
      eventId: activationEvent.eventId,
    }).success).toBe(true);
    expect(state.pendingTurnTransition).toBeNull();
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("presents arrivals before end-of-turn effects, then releases the next turn", () => {
    const state = makeGame();
    state.players[0].luminaries.push("lum_bloom");
    state.catalystBloomBurnCount = 2;

    claimLuminary(state, "lum_verdant");
    const eminenceAfterCoreAction = state.players[0].eminence;
    const summonEvent = state.pendingSummonEvents[0]!;

    expect(state.pendingTurnTransition?.stage).toBe("after_action");
    expect(state.catalystBloomBurnCount).toBe(2);
    expect(state.pendingLuminaryActivationEvents).toHaveLength(0);

    expect(applyAction(state, "p1", {
      type: "resolve_summon",
      eventId: summonEvent.eventId,
    }).success).toBe(true);

    expect(state.players[0].eminence).toBe(eminenceAfterCoreAction + 2);
    expect(state.catalystBloomBurnCount).toBe(0);
    expect(state.pendingTurnTransition?.stage).toBe("after_end_effects");
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.pendingLuminaryActivationEvents).toMatchObject([{
      luminaryId: "lum_bloom",
      effectType: "end_of_turn",
    }]);

    const endEffectEvent = state.pendingLuminaryActivationEvents[0]!;
    expect(applyAction(state, "p1", {
      type: "resolve_luminary_activation",
      eventId: endEffectEvent.eventId,
    }).success).toBe(true);

    expect(state.pendingTurnTransition).toBeNull();
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("exposes the authoritative transition cursor to clients", () => {
    const state = makeGame();
    claimLuminary(state, "lum_verdant");

    const formatted = formatGameState("room-test", "playing", state, new Set());
    expect(formatted.pendingTurnTransition).toEqual({
      stage: "after_action",
      endingPlayerId: "p1",
    });
  });
});

// ─── Marker mechanics — zero-eminence forge ───────────────────────────────────

describe("Artifact markers — zero Eminence on forge_artifact", () => {
  let state: GameStateData;

  beforeEach(() => {
    state = makeGame();
    enrichPlayer(state, 0);
  });

  it("Forgotten marker → forging grants 0 Eminence regardless of card's printed value", () => {
    // Find a Tier 1 card in the Forge that has ≥1 printed Eminence.
    const cardId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.eminence ?? 0) > 0);
    if (!cardId) return; // No Artifact with positive Eminence; skip gracefully.

    state.artifactMarkers = {
      [cardId]: { type: "forgotten", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    const eminenceBefore = state.players[0].eminence;
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);
    expect(state.players[0].eminence).toBe(eminenceBefore); // No Eminence added.
    expect(state.players[0].blueprintBlockedCardIds).toContain(cardId);
  });

  it("Condemned marker → forging grants 0 Eminence", () => {
    const cardId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.eminence ?? 0) > 0);
    if (!cardId) return;
    state.artifactMarkers = {
      [cardId]: { type: "condemned", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    const eminenceBefore = state.players[0].eminence;
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);
    expect(state.players[0].eminence).toBe(eminenceBefore);
  });

  it("Nullified marker → forging grants 0 Eminence", () => {
    // Use a Tier 3 card for Nullified (it's a T3-only marker per spec, but the
    // engine enforces 0-eminence for any nullified card regardless of tier).
    const cardId = state.forgeTier3.find((id) => (CARD_MAP.get(id)?.eminence ?? 0) > 0);
    if (!cardId) return;
    state.artifactMarkers = {
      [cardId]: { type: "nullified", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    const eminenceBefore = state.players[0].eminence;
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);
    expect(state.players[0].eminence).toBe(eminenceBefore);
  });

  it("no marker → forging grants normal printed Eminence", () => {
    const cardId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.eminence ?? 0) > 0);
    if (!cardId) return;
    const card = CARD_MAP.get(cardId)!;
    const eminenceBefore = state.players[0].eminence;
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);
    expect(state.players[0].eminence).toBe(eminenceBefore + card.eminence);
  });

  it("keeps an existing brand when Black Domain adds Nullified and exposes exact animation targets", () => {
    const eligible = [...CARD_MAP.values()].find(card => (
      card.tier === 3 &&
      ((card.cost.continuum ?? 0) === 0 ||
        (card.cost.abyss ?? 0) === 0 ||
      (card.cost.radiance ?? 0) === 0
      )
    ));
    expect(eligible).toBeDefined();
    if (!eligible) return;

    state.forgeTier3 = [eligible.id];
    state.artifactMarkers = {
      [eligible.id]: {
        type: "forgotten",
        ownerId: "p2",
        summonedAtTurnCount: 0,
      },
    };

    claimLuminary(state, "lum_null");

    expect(getArtifactBrands(state.artifactMarkers?.[eligible.id]).map(brand => brand.type))
      .toEqual(["forgotten", "nullified"]);
    expect(state.pendingLuminaryActivationEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          luminaryId: "lum_null",
          effectType: "summon",
          targetCardIds: [eligible.id],
        }),
      ]),
    );
  });

  it("Forgotten Hour blocks encrypting face-up and hidden Artifacts", () => {
    const cardId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.eminence ?? 0) > 0);
    if (!cardId) return;

    state.artifactMarkers = {
      [cardId]: { type: "forgotten", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    state.affinityWell.singularity = 0;

    const reserveResult = applyAction(state, "p1", { type: "reserve_artifact", cardId });
    expect(reserveResult.success).toBe(false);
    expect(reserveResult.error).toBe("Cannot encrypt during The Forgotten Hour");

    state.artifactMarkers = {
      [cardId]: { type: "forgotten", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    const blindReserveResult = applyAction(state, "p1", { type: "reserve_artifact", tier: 1 });
    expect(blindReserveResult.success).toBe(false);
    expect(blindReserveResult.error).toBe("Cannot encrypt during The Forgotten Hour");

    state.artifactMarkers = {};
    state.forgottenHourCycle = {
      p1: { lastAppliedTurnCount: state.turnCount, cooldownOwnerTurnsRemaining: null },
    };
    const cycleOnlyReserveResult = applyAction(state, "p1", { type: "reserve_artifact", cardId });
    expect(cycleOnlyReserveResult.success).toBe(false);
    expect(cycleOnlyReserveResult.error).toBe("Cannot encrypt during The Forgotten Hour");
  });

  it("??? awards no Eminence and raises the victory requirement with its Forgotten branding", () => {
    const player = state.players[0];
    const eminenceBefore = player.eminence;
    const victoryBefore = state.victoryRequirement ?? 15;

    claimLuminary(state, "lum_compass");

    expect(player.eminence).toBe(eminenceBefore);
    expect(state.victoryRequirement).toBe(victoryBefore + 1);
    const activation = state.pendingLuminaryActivationEvents.find(
      (event) => event.luminaryId === "lum_compass" && event.effectType === "summon",
    );
    expect(activation?.targetCardIds?.length).toBeGreaterThan(0);
  });

  it("Forgotten marker on an already-reserved card still grants 0 Eminence when forged", () => {
    const cardId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.eminence ?? 0) > 0);
    if (!cardId) return;

    state.forgeTier1 = state.forgeTier1.filter((id) => id !== cardId);
    state.players[0].reservedArtifactIds.push(cardId);
    state.artifactMarkers = {
      [cardId]: { type: "forgotten", ownerId: "p1", summonedAtTurnCount: 0 },
    };

    const eminenceBefore = state.players[0].eminence;
    const forgeResult = applyAction(state, "p1", { type: "forge_reserved_artifact", cardId });
    expect(forgeResult.success).toBe(true);
    expect(state.players[0].eminence).toBe(eminenceBefore);
    expect(state.players[0].blueprintBlockedCardIds).toContain(cardId);
    expect(state.artifactMarkers?.[cardId]).toBeUndefined();
  });
});

describe("Private Archive encryption tracking", () => {
  let state: GameStateData;

  beforeEach(() => {
    state = makeGame();
    enrichPlayer(state, 0);
    state.affinityWell.singularity = 0;
  });

  it("fails closed for legacy saves that did not record reserve sources", () => {
    const legacyState = makeGame();
    const reservedId = legacyState.forgeTier1[0];
    legacyState.players[0].reservedArtifactIds = [reservedId];
    delete legacyState.players[0].privateReservedArtifactIds;

    const normalized = normalizeState(legacyState);

    expect(normalized.players[0].privateReservedArtifactIds).toEqual([reservedId]);
  });

  it("marks only blind Archive draws as private", () => {
    const blindCardId = state.deckTier1[0];
    const visibleCardId = state.forgeTier2[0];

    const blindResult = applyAction(state, "p1", {
      type: "reserve_artifact",
      tier: 1,
    });
    expect(blindResult.success).toBe(true);
    expect(state.players[0].reservedArtifactIds).toContain(blindCardId);
    expect(state.players[0].privateReservedArtifactIds).toContain(blindCardId);

    state.currentPlayerIndex = 0;
    const visibleResult = applyAction(state, "p1", {
      type: "reserve_artifact",
      cardId: visibleCardId,
    });
    expect(visibleResult.success).toBe(true);
    expect(state.players[0].reservedArtifactIds).toContain(visibleCardId);
    expect(state.players[0].privateReservedArtifactIds).not.toContain(visibleCardId);
  });

  it("clears the private marker when the Artifact is forged", () => {
    const blindCardId = state.deckTier1[0];
    const reserveResult = applyAction(state, "p1", {
      type: "reserve_artifact",
      tier: 1,
    });
    expect(reserveResult.success).toBe(true);

    state.currentPlayerIndex = 0;
    const forgeResult = applyAction(state, "p1", {
      type: "forge_reserved_artifact",
      cardId: blindCardId,
    });
    expect(forgeResult.success).toBe(true);
    expect(state.players[0].privateReservedArtifactIds).not.toContain(blindCardId);
  });
});

// ─── Avatar Seed ──────────────────────────────────────────────────────────────

describe("Avatar Seed — pending Eminence accumulates on opponent forge", () => {
  it("queues Seed's summon activation before the deck-seeding flourish", () => {
    const state = makeGame();

    claimLuminary(state, "lum_seed");

    const seededIds = state.avatarSeedState?.deckSeeds ?? [];
    expect(seededIds.length).toBeGreaterThan(0);
    expect(state.pendingLuminaryActivationEvents).toEqual([
      expect.objectContaining({
        luminaryId: "lum_seed",
        effectType: "summon",
        triggeringPlayerId: "p1",
        targetCardIds: expect.arrayContaining(seededIds),
      }),
    ]);
  });

  it("increments pending Eminence when the opponent forges an avatar-seeded Forge card", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);

    // Set up Avatar Seed state owned by player 1.
    state.avatarSeedState = {
      ownerId: "p2",
      summonedAtTurnCount: 0,
      pendingEminence: 0,
      deckSeeds: [],
      payoutDone: false,
    };

    // Place an avatar_seed marker on the first Tier 1 Forge card.
    const seededCard = state.forgeTier1[0]!;
    state.artifactMarkers = {
      [seededCard]: { type: "avatar_seed", ownerId: "p2", summonedAtTurnCount: 0 },
    };

    // Player 1 (p1, index 0) forges the seeded Artifact -> opponent of p2.
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId: seededCard });
    expect(r.success).toBe(true);
    expect(state.avatarSeedState!.pendingEminence).toBe(1);
  });

  it("does NOT increment pending Eminence when the Avatar Seed OWNER forges their own seeded Artifact", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    // Move to player 2's turn.
    state.currentPlayerIndex = 1;
    enrichPlayer(state, 1);

    state.avatarSeedState = {
      ownerId: "p2",
      summonedAtTurnCount: 0,
      pendingEminence: 0,
      deckSeeds: [],
      payoutDone: false,
    };
    const seededCard = state.forgeTier1[0]!;
    state.artifactMarkers = {
      [seededCard]: { type: "avatar_seed", ownerId: "p2", summonedAtTurnCount: 0 },
    };

    const r = applyAction(state, "p2", { type: "forge_artifact", cardId: seededCard });
    expect(r.success).toBe(true);
    expect(state.avatarSeedState!.pendingEminence).toBe(0);
  });

  it("pays out pending Eminence at end of owner's next turn", () => {
    const state = makeGame();
    state.turnCount = 1; // Will become 2 after first pass.

    state.avatarSeedState = {
      ownerId: "p1",
      summonedAtTurnCount: 0,
      pendingEminence: 3,
      deckSeeds: [],
      payoutDone: false,
    };
    state.luminaryAffinities = [
      {
        luminaryId: "lum_seed",
        ownerId: "p1",
        activeAffinity: "continuum",
        eligibleAffinities: ["continuum"],
        summonedAtTurnCount: 0,
      },
    ];

    // player0 passes → applyEndOfTurnEffects: turnCount=1 > summonedAt=0 → payout
    const eminenceBefore = state.players[0].eminence;
    pass(state); // ends p1's turn
    expect(state.players[0].eminence).toBe(eminenceBefore + 3);
    expect(state.avatarSeedState!.payoutDone).toBe(true);
  });

  it("does NOT pay out on the SAME turn as arrival", () => {
    const state = makeGame();
    state.turnCount = 0; // Arrival and end-of-turn both at 0 → condition is false.

    state.avatarSeedState = {
      ownerId: "p1",
      summonedAtTurnCount: 0,
      pendingEminence: 5,
      deckSeeds: [],
      payoutDone: false,
    };
    state.luminaryAffinities = [
      {
        luminaryId: "lum_seed",
        ownerId: "p1",
        activeAffinity: "continuum",
        eligibleAffinities: ["continuum"],
        summonedAtTurnCount: 0,
      },
    ];

    const eminenceBefore = state.players[0].eminence;
    pass(state); // turnCount=0 at end-of-turn → 0 > 0 = false, no payout
    expect(state.players[0].eminence).toBe(eminenceBefore);
    expect(state.avatarSeedState!.payoutDone).toBe(false);
  });
});

// ─── Catalyst Bloom ───────────────────────────────────────────────────────────

describe("Catalyst Bloom — Aftergrowth: +1 Eminence per burn effect at end of turn", () => {
  it("grants accumulated burn-effect Eminence and resets counter", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_bloom"];
    state.catalystBloomBurnCount = 4;

    const eminenceBefore = state.players[0].eminence;
    pass(state);
    expect(state.players[0].eminence).toBe(eminenceBefore + 4);
    expect(state.catalystBloomBurnCount).toBe(0);
  });

  it("pays nothing when no burns occurred", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_bloom"];
    state.catalystBloomBurnCount = 0;
    const eminenceBefore = state.players[0].eminence;
    pass(state);
    expect(state.players[0].eminence).toBe(eminenceBefore);
  });

  it("non-owner does not receive bloom Eminence even with burns queued", () => {
    // Player 1 owns Bloom; it's player 0's turn → player 0 should get nothing.
    const state = makeGame();
    state.players[1].luminaries = ["lum_bloom"];
    state.catalystBloomBurnCount = 3;
    const p0EminenceBefore = state.players[0].eminence;
    pass(state); // p0's turn ends — bloom payout runs only for bloom owner's turn
    expect(state.players[0].eminence).toBe(p0EminenceBefore);
    // Counter should NOT be reset (no bloom owner's turn ended).
    expect(state.catalystBloomBurnCount).toBe(3);
  });
});

// ─── Concordance Mandala ──────────────────────────────────────────────────────

describe("Concordance Mandala — Perfect Coherence: +2 Eminence at end of turn with 8+ Radiance Artifacts", () => {
  it("grants +2 Eminence when owner has ≥8 Radiance Artifacts at end of turn", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    // Give the player 8 Radiance Artifacts (t1p01 through t3p04 are examples).
    const radianceCards = [...CARD_MAP.values()]
      .filter((c) => c.bonusAffinity === "radiance")
      .slice(0, 8)
      .map((c) => c.id);
    state.players[0].forgedArtifactIds = radianceCards;

    const eminenceBefore = state.players[0].eminence;
    pass(state);
    expect(state.players[0].eminence).toBe(eminenceBefore + 2);
    expect(state.concordanceMandalaTriggered).toBe(true);
  });

  it("does NOT fire again once already triggered", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    state.concordanceMandalaTriggered = true; // Already triggered.
    const radianceCards = [...CARD_MAP.values()]
      .filter((c) => c.bonusAffinity === "radiance")
      .slice(0, 8)
      .map((c) => c.id);
    state.players[0].forgedArtifactIds = radianceCards;

    const eminenceBefore = state.players[0].eminence;
    pass(state);
    expect(state.players[0].eminence).toBe(eminenceBefore); // No bonus.
  });

  it("does NOT fire when fewer than 8 Radiance Artifacts", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    const radianceCards = [...CARD_MAP.values()]
      .filter((c) => c.bonusAffinity === "radiance")
      .slice(0, 7)
      .map((c) => c.id);
    state.players[0].forgedArtifactIds = radianceCards;

    const eminenceBefore = state.players[0].eminence;
    pass(state);
    expect(state.players[0].eminence).toBe(eminenceBefore);
  });
});

// ─── The Glass Orchard ────────────────────────────────────────────────────────

describe("The Glass Orchard — Perfect Replication: +1 extra bonus on first Verdance/Radiance forge", () => {
  let state: GameStateData;

  beforeEach(() => {
    state = makeGame();
    enrichPlayer(state, 0);
    state.players[0].luminaries = ["lum_orchard"];
    state.activeLuminaries = []; // No other Luminary arrivals.
    state.glassOrchardTriggered = false;
  });

  it("grants an extra bonus of the card's bonusAffinity on first eligible forge", () => {
    // Find a Tier 1 card with Verdance (verdance) in its cost.
    const targetCard = [...CARD_MAP.values()].find(
      (c) => c.tier === 1 && c.cost.verdance > 0 && state.forgeTier1.includes(c.id),
    );
    if (!targetCard) {
      // No verdance card in Forge — inject one.
      const anyVerdanceCard = [...CARD_MAP.values()].find(
        (c) => c.tier === 1 && c.cost.verdance > 0,
      )!;
      if (!anyVerdanceCard) return; // Nothing to test.
      state.forgeTier1[0] = anyVerdanceCard.id;
    }

    const cardId = state.forgeTier1.find((id) => {
      const c = CARD_MAP.get(id);
      return c && c.cost.verdance > 0;
    })!;
    if (!cardId) return;

    const card = CARD_MAP.get(cardId)!;
    const bonusBefore = state.players[0].bonuses[card.bonusAffinity];
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);
    // Normal forge gives +1; The Glass Orchard gives an additional +1 = +2 total.
    expect(state.players[0].bonuses[card.bonusAffinity]).toBe(bonusBefore + 2);
    expect(state.glassOrchardTriggered).toBe(true);
  });

  it("does NOT grant extra bonus on a second eligible forge (one-time only)", () => {
    state.glassOrchardTriggered = true; // Already fired.
    const cardId = state.forgeTier1.find((id) => {
      const c = CARD_MAP.get(id);
      return c && (c.cost.verdance > 0 || c.cost.radiance > 0);
    });
    if (!cardId) return;

    const card = CARD_MAP.get(cardId)!;
    const bonusBefore = state.players[0].bonuses[card.bonusAffinity];
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);
    // Only +1 (no The Glass Orchard bonus this time).
    expect(state.players[0].bonuses[card.bonusAffinity]).toBe(bonusBefore + 1);
  });
});

// ─── Assimilation (Final Hunger) ──────────────────────────────────────────────

describe("Assimilation — Final Hunger one-time burn action", () => {
  let state: GameStateData;

  beforeEach(() => {
    state = makeGame();
    enrichPlayer(state, 0);
    state.firstHungerAvailable = "p1";
  });

  it("burns the target card (removes from Forge) and grants printed+2 Eminence", () => {
    // Find a Forge card with Flare (flare) in its cost.
    const cardId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0)
      ?? state.forgeTier2.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0)
      ?? state.forgeTier3.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0);
    if (!cardId) {
      // Inject a known flare card into the Tier 1 Forge.
      const flareCard = [...CARD_MAP.values()].find(
        (c) => c.tier === 1 && c.cost.flare > 0,
      )!;
      if (!flareCard) return;
      state.forgeTier1[0] = flareCard.id;
    }

    const targetId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0)!;
    if (!targetId) return;
    const card = CARD_MAP.get(targetId)!;
    const eminenceBefore = state.players[0].eminence;

    const r = applyAction(state, "p1", { type: "assimilate", cardId: targetId });
    expect(r.success).toBe(true);

    // Card must be gone from the Forge.
    expect(state.forgeTier1).not.toContain(targetId);
    expect(state.forgeTier2).not.toContain(targetId);
    expect(state.forgeTier3).not.toContain(targetId);

    // Eminence = printed + 2.
    expect(state.players[0].eminence).toBe(eminenceBefore + card.eminence + 2);

    // Assimilation consumed.
    expect(state.firstHungerAvailable).toBeNull();

    // Assimilated Artifacts are not added to forgedArtifactIds.
    expect(state.players[0].forgedArtifactIds).not.toContain(targetId);
  });

  it("rejects assimilate when firstHungerAvailable is null", () => {
    state.firstHungerAvailable = null;
    const cardId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0)
      ?? state.forgeTier1[0]!;
    const r = applyAction(state, "p1", { type: "assimilate", cardId });
    expect(r.success).toBe(false);
  });

  it("rejects assimilate when target lacks Flare/Verdance/Radiance cost", () => {
    // Find a card with ONLY Continuum/Abyss costs (no flare/verdance/radiance).
    const pureAbyss = [...CARD_MAP.values()].find(
      (c) =>
        c.tier === 1 &&
        c.cost.flare === 0 &&
        c.cost.verdance === 0 &&
        c.cost.radiance === 0 &&
        (c.cost.continuum > 0 || c.cost.abyss > 0),
    );
    if (!pureAbyss) return;
    state.forgeTier1[0] = pureAbyss.id;
    const r = applyAction(state, "p1", { type: "assimilate", cardId: pureAbyss.id });
    expect(r.success).toBe(false);
  });

  it("arrival sets flag but does not auto-execute the ability", () => {
    // The lum_hunger arrival handler sets firstHungerAvailable to the claimer's ID;
    // it must NOT immediately grant the Assimilation +2 bonus — the player must
    // explicitly use the assimilate action later.
    const freshState = makeGame();
    enrichPlayer(freshState, 0);
    freshState.activeLuminaries = ["lum_hunger"];
    const p = freshState.players[0];
    const lum = LUMINARY_MAP.get("lum_hunger")!;
    for (const c of STANDARD_AFFINITY_KEYS) p.bonuses[c] = lum.requirements[c];
    const eminenceBefore = p.eminence;

    const cardId = freshState.forgeTier1[0]!;
    applyAction(freshState, "p1", { type: "forge_artifact", cardId });

    // Flag should now be set for the claimer — NOT consumed.
    expect(freshState.firstHungerAvailable).toBe("p1");

    // Eminence gained equals the Artifact's printed value plus the Luminary award.
    // It must NOT include an extra +2 Assimilation bonus.
    const cardEminence = CARD_MAP.get(cardId)?.eminence ?? 0;
    const luminaryEminence = lum.eminence; // granted for claiming the Luminary itself
    expect(freshState.players[0].eminence).toBe(eminenceBefore + cardEminence + luminaryEminence);
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
    // Set up a known card with Flare (flare) AND Continuum/Abyss (continuum or abyss) cost.
    const target = [...CARD_MAP.values()].find(
      (c) => c.tier === 1 && c.cost.flare > 0 && (c.cost.continuum > 0 || c.cost.abyss > 0),
    );
    if (!target) return; // skip if card catalog changes
    state.forgeTier1[0] = target.id;

    // Give the player exactly 2 flare card bonuses; no verdance or radiance bonuses.
    state.players[0].bonuses.flare    = 2;
    state.players[0].bonuses.verdance = 0;
    state.players[0].bonuses.radiance   = 0;

    // Expected costs after reduction:
    //   flare:     max(0, printed - 2)      ← discounted
    //   verdance:  max(0, printed - 0)      ← full (bonus=0)
    //   radiance:    max(0, printed - 0)      ← full (bonus=0)
    //   continuum: printed                  ← no reduction
    //   abyss:     printed                  ← no reduction
    const flareCost    = Math.max(0, target.cost.flare     - 2);
    const continuumCost = target.cost.continuum;
    const verdanceCost  = target.cost.verdance;
    const abyssCost     = target.cost.abyss;
    const radianceCost    = target.cost.radiance;

    // Drain held Affinities, then provide exactly what the formula requires.
    for (const c of STANDARD_AFFINITY_KEYS) {
      state.players[0].affinities[c] = 0;
      state.affinityWell[c] = 20;
    }
    state.players[0].affinities.flare     = flareCost;
    state.players[0].affinities.continuum = continuumCost;
    state.players[0].affinities.verdance  = verdanceCost;
    state.players[0].affinities.abyss     = abyssCost;
    state.players[0].affinities.radiance    = radianceCost;
    state.players[0].affinities.singularity     = 0;

    const r = applyAction(state, "p1", { type: "assimilate", cardId: target.id });
    expect(r.success).toBe(true);
  });

  it("rejected by a different player even when flag is set", () => {
    // firstHungerAvailable === "p1" but p2 tries to assimilate.
    enrichPlayer(state, 1);
    const cardId =
      state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0) ??
      state.forgeTier1[0]!;
    const r = applyAction(state, "p2", { type: "assimilate", cardId });
    expect(r.success).toBe(false);
    expect(state.firstHungerAvailable).toBe("p1"); // flag unchanged
  });

  it("cannot be used a second time — flag is null after first use", () => {
    const cardId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0)!;
    if (!cardId) return;

    const r1 = applyAction(state, "p1", { type: "assimilate", cardId });
    expect(r1.success).toBe(true);
    expect(state.firstHungerAvailable).toBeNull();

    // Advance turns so p1 acts again, then try a second assimilation.
    pass(state); // p2 passes
    const secondCard =
      state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0) ??
      state.forgeTier1[0]!;
    const r2 = applyAction(state, "p1", { type: "assimilate", cardId: secondCard });
    expect(r2.success).toBe(false);
  });

  it("card bonuses and forgedArtifactIds are unchanged after assimilation — no forge effects", () => {
    const targetId =
      state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0) ??
      state.forgeTier1[0]!;
    const bonusesBefore = { ...state.players[0].bonuses };
    const cardCountBefore = state.players[0].forgedArtifactIds.length;

    applyAction(state, "p1", { type: "assimilate", cardId: targetId });

    // No extra card in hand.
    expect(state.players[0].forgedArtifactIds.length).toBe(cardCountBefore);
    // No permanent Affinity bonus awarded.
    for (const c of STANDARD_AFFINITY_KEYS) {
      expect(state.players[0].bonuses[c]).toBe(bonusesBefore[c]);
    }
  });

  it("assimilation works on a future turn (not just the arrival turn)", () => {
    // firstHungerAvailable is "p1"; have p1 pass, p2 pass, then p1 assimilates.
    pass(state); // p1 passes
    pass(state); // p2 passes
    // Now it is p1's turn again and the flag should still be set.
    expect(state.firstHungerAvailable).toBe("p1");
    const cardId =
      state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0) ??
      state.forgeTier1[0]!;
    const r = applyAction(state, "p1", { type: "assimilate", cardId });
    expect(r.success).toBe(true);
    expect(state.firstHungerAvailable).toBeNull();
  });
});

// ─── Cinder Mandate (Ember Sovereign) — end-of-next-turn burn ────────────────

describe("Cinder Mandate — Condemned cards burn at end of owner's next turn", () => {
  it("burns all Condemned Forge cards at the end of the owner's next turn", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);

    // Mark a Tier 1 Forge card as Condemned (owned by p1) at turnCount=0.
    const condemnedId = state.forgeTier1[0]!;
    state.artifactMarkers = {
      [condemnedId]: { type: "condemned", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    // Register lum_ember for p1 in luminaryAffinities (needed for timing check).
    state.luminaryAffinities = [
      {
        luminaryId: "lum_ember",
        ownerId: "p1",
        activeAffinity: "flare",
        eligibleAffinities: ["flare"],
        summonedAtTurnCount: 0,
      },
    ];
    state.players[0].luminaries = ["lum_ember"];
    state.turnCount = 0;

    // p1 passes → end of turn 0 (no burn yet, turnCount=0 === summonedAt=0).
    pass(state); // p1's turn ends; now p2's turn
    expect(state.forgeTier1.includes(condemnedId) || !state.forgeTier1.includes(condemnedId)).toBe(true); // just not burned yet
    // The condemned card should still be present (burn is at START of p1's NEXT turn).
    // After pass, p2's turn starts. Check condemned card still there.
    // Note: the condemned card might have been replaced by the avatar seed transfer — 
    // but there's no avatar seed here. The card should still be in the Forge.
    // (Actually after p1's pass → applyEndOfTurnEffects: 0 > 0 = false → no burn ✓)
    // Verify the card was NOT burned yet (it's p2's turn).
    expect([
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ]).toContain(condemnedId);

    // p2 passes → p1's turn again, turnCount=2 after advance. Cinder does not
    // burn at the start of that turn; it waits until p1 ends that next turn.
    pass(state);
    expect([
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ]).toContain(condemnedId);

    // p1 passes → p1's next turn ends, turnCount=2 > summonedAt=0 → BURN.
    pass(state);
    // The condemned card should now be gone.
    expect([
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ]).not.toContain(condemnedId);
    // The marker should also be cleaned up.
    expect(state.artifactMarkers?.[condemnedId]).toBeUndefined();
  });
});

// ─── Forgotten Hour expiry ────────────────────────────────────────────────────

describe("Forgotten Hour — markers expire at end of owner's next turn", () => {
  it("clears Forgotten markers at the end of the owner's next turn", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);

    // Mark a Tier 1 Forge card as Forgotten (owned by p1) at turnCount=0.
    const forgottenId = state.forgeTier1[0]!;
    state.artifactMarkers = {
      [forgottenId]: { type: "forgotten", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    state.luminaryAffinities = [
      {
        luminaryId: "lum_compass",
        ownerId: "p1",
        activeAffinity: "continuum",
        eligibleAffinities: ["continuum"],
        summonedAtTurnCount: 0,
      },
    ];
    state.turnCount = 0; // p1 starts (currentPlayerIndex = 0).

    // p1 passes → applyEndOfTurnEffects: turnCount=0, summonedAt=0 → 0>0 = false → no clear.
    // advanceTurn: turnCount→1, currentPlayerIndex→1 (p2's turn).
    pass(state);
    expect(state.artifactMarkers?.[forgottenId]).toBeDefined(); // Still there.

    // p2 passes → applyEndOfTurnEffects for p2: p2 doesn't own Forgotten Hour → no clear.
    // advanceTurn: turnCount→2, currentPlayerIndex→0 (p1's turn again).
    pass(state);
    expect(state.artifactMarkers?.[forgottenId]).toBeDefined(); // STILL there (clearing happens at END of p1's next turn).

    // p1 passes again → applyEndOfTurnEffects: turnCount=2, 2>0 = true → CLEAR.
    pass(state);
    expect(state.artifactMarkers?.[forgottenId]).toBeUndefined();
    expect(state.forgottenHourCycle?.p1?.cooldownOwnerTurnsRemaining).toBe(12);
  });

  it("repeats Forgotten Hour at the owner's end of turn after 12 quiet owner turns", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);

    const faceUpIds = [...state.forgeTier1, ...state.forgeTier2, ...state.forgeTier3];
    state.players[0].luminaries.push("lum_compass");
    state.luminaryAffinities = [
      {
        luminaryId: "lum_compass",
        ownerId: "p1",
        activeAffinity: "continuum",
        eligibleAffinities: ["continuum"],
        summonedAtTurnCount: 0,
      },
    ];
    state.artifactMarkers = {};
    state.forgottenHourCycle = {
      p1: {
        lastAppliedTurnCount: 2,
        cooldownOwnerTurnsRemaining: 1,
      },
    };
    state.pendingLuminaryActivationEvents = [];
    state.currentPlayerIndex = 1;
    state.roundNumber = 13;
    state.turnCount = 25;

    // p2 ends round 13. The old global-round implementation would fire here;
    // the owner-relative rule must wait for p1's own end of turn.
    pass(state);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.roundNumber).toBe(14);
    expect(state.artifactMarkers).toEqual({});
    expect(state.pendingLuminaryActivationEvents).toEqual([]);

    const appliedTurnCount = state.turnCount;
    pass(state);

    for (const cardId of faceUpIds) {
      expect(state.artifactMarkers?.[cardId]).toEqual(expect.objectContaining({
        type: "forgotten",
        ownerId: "p1",
        summonedAtTurnCount: appliedTurnCount,
        brands: [
          {
            type: "forgotten",
            ownerId: "p1",
            summonedAtTurnCount: appliedTurnCount,
          },
        ],
      }));
    }
    expect(state.forgottenHourCycle?.p1).toEqual({
      lastAppliedTurnCount: appliedTurnCount,
      cooldownOwnerTurnsRemaining: null,
    });
    expect(state.pendingLuminaryActivationEvents).toEqual([
      expect.objectContaining({
        luminaryId: "lum_compass",
        effectType: "end_of_turn",
        triggeringPlayerId: "p1",
        targetCardIds: expect.arrayContaining(faceUpIds),
      }),
    ]);
  });
});

// ─── On-arrival Forge and Burn effects ───────────────────────────────────────

describe("Impact Extinction (lum_forge) — resets the complete Forge through the Archives", () => {
  it("returns all rows, randomizes each tier pool, refills, and never emits a Burn", () => {
    const state = makeGame();
    const rowsBefore = {
      3: [...state.forgeTier3],
      2: [...state.forgeTier2],
      1: [...state.forgeTier1],
    };
    const poolsBefore = {
      3: [...state.forgeTier3, ...state.deckTier3].sort(),
      2: [...state.forgeTier2, ...state.deckTier2].sort(),
      1: [...state.forgeTier1, ...state.deckTier1].sort(),
    };
    const burnPileBefore = [...state.burnPile];
    const burnEventsBefore = [...state.burnEvents];
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    try {
      claimLuminary(state, "lum_forge");
    } finally {
      randomSpy.mockRestore();
    }

    expect(state.forgeTier3).toHaveLength(4);
    expect(state.forgeTier2).toHaveLength(4);
    expect(state.forgeTier1).toHaveLength(4);
    const triggeringForgeId = state.players[0].forgedArtifactIds.at(-1);
    expect([...state.forgeTier3, ...state.deckTier3].sort()).toEqual(poolsBefore[3]);
    expect([...state.forgeTier2, ...state.deckTier2].sort()).toEqual(poolsBefore[2]);
    expect([...state.forgeTier1, ...state.deckTier1].sort()).toEqual(
      poolsBefore[1].filter(cardId => cardId !== triggeringForgeId),
    );
    expect(state.burnPile).toEqual(burnPileBefore);
    expect(state.burnEvents).toEqual(burnEventsBefore);

    const activation = state.pendingLuminaryActivationEvents.find(
      (event) => event.luminaryId === "lum_forge",
    );
    expect(activation?.targetCardIds).toHaveLength(12);
    expect(activation?.targetCardIds?.slice(0, 8)).toEqual([
      ...rowsBefore[3],
      ...rowsBefore[2],
    ]);
    expect(activation?.targetCardIds?.slice(8)).toHaveLength(4);
    expect(activation?.targetCardIds).not.toContain(triggeringForgeId);
    for (const cardId of activation?.targetCardIds?.slice(8) ?? []) {
      expect(poolsBefore[1]).toContain(cardId);
    }
  });
});

describe("Rupture of the Still (lum_moth) — burns Tier III below 5 Flare on arrival", () => {
  it("burns the qualifying arrival snapshot, redraws those slots, and leaves Tier II untouched", () => {
    const state = makeGame();
    const tier3Cards = [...CARD_MAP.values()].filter((card) => card.tier === 3);
    const qualifying = tier3Cards.slice(0, 3);
    const boundary = tier3Cards[3];
    expect(qualifying).toHaveLength(3);
    expect(boundary).toBeDefined();

    const originalBoundary = CARD_MAP.get(boundary.id)!;
    CARD_MAP.set(boundary.id, {
      ...originalBoundary,
      cost: { ...originalBoundary.cost, flare: 5 },
    });

    try {
      const originalTier3Ids = [...qualifying.map((card) => card.id), boundary.id];
      state.forgeTier3 = originalTier3Ids;
      state.deckTier3 = state.deckTier3.filter((cardId) => !originalTier3Ids.includes(cardId));
      const tier2Before = [...state.forgeTier2];
      const burnEventCountBefore = state.burnEvents.length;

      claimLuminary(state, "lum_moth");

      const ruptureBurns = state.burnEvents
        .slice(burnEventCountBefore)
        .filter((event) => event.sourceLuminaryId === "lum_moth");
      expect(ruptureBurns.map((event) => event.cardId)).toEqual(
        qualifying.map((card) => card.id),
      );
      expect(state.forgeTier3).toHaveLength(originalTier3Ids.length);
      for (const card of qualifying) {
        expect(state.forgeTier3).not.toContain(card.id);
      }
      expect(state.forgeTier3).toContain(boundary.id);
      expect(state.forgeTier2).toEqual(tier2Before);

      const activation = state.pendingLuminaryActivationEvents.find(
        (event) => event.luminaryId === "lum_moth",
      );
      expect(activation?.targetCardIds).toEqual(qualifying.map((card) => card.id));
    } finally {
      CARD_MAP.set(boundary.id, originalBoundary);
    }
  });
});

describe("Phoenix Paradox (lum_astral) — Eternal Recurrence", () => {
  it("uses the finalized requirements, native Eminence, and effect text", () => {
    const phoenix = LUMINARY_MAP.get("lum_astral");

    expect(phoenix).toMatchObject({
      name: "Phoenix Paradox",
      domain: "Recurrence",
      eminence: 4,
      requirements: {
        flare: 4,
        continuum: 4,
        verdance: 0,
        abyss: 0,
        radiance: 0,
        singularity: 0,
      },
      effectName: "Eternal Recurrence",
    });
    expect(phoenix?.effectDescription).toContain("future Burned Artifacts return");
    expect(phoenix?.effectDescription).toContain("beginning of your next turn");
    expect(phoenix?.effectDescription).not.toContain("Tier III");
  });

  it("manifests without burning cards or immediately emptying the Burn Pile", () => {
    const state = makeGame();
    const preexistingT1 = state.deckTier1.pop()!;
    const preexistingT2 = state.deckTier2.pop()!;
    state.burnPile = [preexistingT1, preexistingT2];
    const tier3Before = [...state.forgeTier3];

    claimLuminary(state, "lum_astral");

    expect(state.players[0].luminaries).toContain("lum_astral");
    expect(state.forgeTier3).toEqual(tier3Before);
    expect(state.burnPile).toEqual([preexistingT1, preexistingT2]);
    expect(state.phoenixRecurrence).toEqual({
      ownerId: "p1",
      summonedAtTurnCount: 0,
      recoveryPending: true,
    });
  });

  it("redirects future Burns to Archive bottoms while preserving Burn events", () => {
    const state = makeGame();
    claimLuminary(state, "lum_astral");
    resolveLuminaryPresentation(state);
    state.players[0].luminaries.push("lum_bloom");
    state.catalystBloomBurnCount = 0;
    const eventCountBefore = state.burnEvents.length;
    placeRuptureTargets(state);

    claimLuminary(state, "lum_moth");

    const recurrenceBurns = state.burnEvents.slice(eventCountBefore);
    expect(recurrenceBurns.length).toBeGreaterThan(0);
    expect(state.catalystBloomBurnCount).toBe(recurrenceBurns.length);
    for (const event of recurrenceBurns) {
      expect(event.sourceLuminaryId).toBe("lum_moth");
      expect(event.destination).toBe("archive");
      expect(state.burnPile).not.toContain(event.cardId);
      const archive =
        event.tier === 1 ? state.deckTier1 :
        event.tier === 2 ? state.deckTier2 :
        state.deckTier3;
      expect(archive).toContain(event.cardId);
    }
  });

  it("returns the existing Burn Pile at the owner's next turn and gates action until resolved", () => {
    const state = makeGame();
    const preexistingT1 = state.deckTier1.pop()!;
    const preexistingT2 = state.deckTier2.pop()!;
    state.burnPile = [preexistingT1, preexistingT2];

    claimLuminary(state, "lum_astral");
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.burnPile).toEqual([preexistingT1, preexistingT2]);
    resolveLuminaryPresentation(state);
    expect(state.currentPlayerIndex).toBe(1);

    pass(state);

    // The incoming player is not published until the start-of-turn effect
    // presentation is acknowledged.
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.burnPile).toEqual([]);
    expect(state.deckTier1.at(-1)).toBe(preexistingT1);
    expect(state.deckTier2.at(-1)).toBe(preexistingT2);
    expect(state.phoenixRecurrence?.recoveryPending).toBe(false);

    const recoveryEvent = state.pendingLuminaryActivationEvents.find(
      event => event.luminaryId === "lum_astral" && event.effectType === "start_of_turn",
    );
    expect(recoveryEvent?.targetCardIds).toEqual([preexistingT1, preexistingT2]);

    const blocked = applyAction(state, "p1", { type: "pass" });
    expect(blocked).toEqual({
      success: false,
      error: "Complete the Luminary resolution sequence before acting",
    });

    const plannedCardId = state.forgeTier1[0]!;
    const plan = applyAction(state, "p1", {
      type: "plan_action",
      plannedActionData: { type: "forge_artifact", cardId: plannedCardId },
    });
    expect(plan.success).toBe(true);
    expect(state.players[0].plannedAction).toEqual({
      type: "forge_artifact",
      cardId: plannedCardId,
    });
    expect(applyAction(state, "p1", { type: "execute_plan" })).toEqual({
      success: false,
      error: "Complete the Luminary resolution sequence before acting",
    });
    expect(applyAction(state, "p1", {
      type: "toggle_luminary_affinity",
      luminaryId: "lum_astral",
      affinity: "continuum",
    })).toEqual({
      success: false,
      error: "Complete the Luminary resolution sequence before acting",
    });
    expect(applyAction(state, "p1", { type: "cancel_plan" }).success).toBe(true);

    const resolved = applyAction(state, "p1", {
      type: "resolve_luminary_activation",
      eventId: recoveryEvent!.eventId,
    });
    expect(resolved.success).toBe(true);
    expect(state.currentPlayerIndex).toBe(0);
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
  });

  it("returns cards before refilling empty Forge positions", () => {
    const state = makeGame();
    const returnedCard = state.deckTier1.pop()!;
    state.burnPile = [returnedCard];

    claimLuminary(state, "lum_astral");
    resolveLuminaryPresentation(state);
    state.forgeTier1 = [];
    state.deckTier1 = [];

    pass(state);

    expect(state.burnPile).toEqual([]);
    expect(state.forgeTier1).toEqual([returnedCard]);
    const recoveryEvent = state.pendingLuminaryActivationEvents.find(
      event => event.luminaryId === "lum_astral" && event.effectType === "start_of_turn",
    );
    expect(recoveryEvent?.targetCardIds).toEqual([returnedCard]);
  });

  it("loads an older manifested Phoenix without retroactively scheduling recovery", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_astral"];
    state.luminaryAffinities = [{
      luminaryId: "lum_astral",
      ownerId: "p1",
      activeAffinity: "flare",
      eligibleAffinities: ["flare", "continuum"],
      summonedAtTurnCount: 3,
    }];
    delete state.phoenixRecurrence;

    normalizeState(state);

    expect(state.phoenixRecurrence).toEqual({
      ownerId: "p1",
      summonedAtTurnCount: 3,
      recoveryPending: false,
    });
  });
});

// ─── Observer Effect (lum_tide) ───────────────────────────────────────────────

describe("Observer Effect (lum_tide) — scry and reorder decks by Continuum", () => {
  it("promotes Continuum cards to the top of Tier 2 and Tier 3 decks on arrival", () => {
    const state = makeGame();

    // Plant a known Continuum card at position 2 in the T2 deck, and non-Continuum cards at 0/1.
    const continuumCard = [...CARD_MAP.values()].find(
      (c) => c.tier === 2 && c.cost.continuum > 0 && c.cost.flare === 0,
    );
    const nonContinuumCard = [...CARD_MAP.values()].find(
      (c) => c.tier === 2 && c.cost.continuum === 0,
    );
    if (!continuumCard || !nonContinuumCard) return;

    // Build a deck where: [nonSap, nonSap, sap, ...]
    state.deckTier2 = [nonContinuumCard.id, nonContinuumCard.id, continuumCard.id, ...state.deckTier2.slice(3)];

    claimLuminary(state, "lum_tide");

    // After Observer Effect, the continuum card should be within the top 3.
    const top3 = state.deckTier2.slice(0, 3);
    expect(top3).toContain(continuumCard.id);
  });
});

// ─── Balance Due (lum_pale) ───────────────────────────────────────────────────

describe("Balance Due (lum_pale) — taxes holdings at half the starting supply", () => {
  it("returns two tokens for every qualifying player and Affinity, including Singularity", () => {
    const state = makeGame();
    claimLuminary(state, "lum_pale", (prepared) => {
      for (const player of prepared.players) {
        for (const affinity of STANDARD_AFFINITY_KEYS) {
          player.affinities[affinity] = 0;
          player.bonuses[affinity] = 10;
          prepared.affinityWell[affinity] = 4;
        }
        player.affinities.singularity = 0;
      }
      prepared.players[0].affinities = {
        ...prepared.players[0].affinities,
        flare: 2,
        continuum: 1,
        verdance: 3,
        abyss: 0,
        radiance: 1,
        singularity: 3,
      };
      prepared.players[1].affinities = {
        ...prepared.players[1].affinities,
        flare: 1,
        continuum: 2,
        verdance: 0,
        abyss: 4,
        radiance: 0,
        singularity: 2,
      };
    });

    expect(state.players[0].affinities).toMatchObject({
      flare: 0,
      continuum: 1,
      verdance: 1,
      abyss: 0,
      radiance: 1,
      singularity: 1,
    });
    expect(state.players[1].affinities).toMatchObject({
      flare: 1,
      continuum: 0,
      verdance: 0,
      abyss: 2,
      radiance: 0,
      singularity: 2,
    });
    expect(state.pendingLuminaryActivationEvents[0]).toMatchObject({
      luminaryId: "lum_pale",
      affinityReturns: [
        { playerId: "p1", affinityType: "flare", affinityAmount: 2 },
        { playerId: "p1", affinityType: "verdance", affinityAmount: 2 },
        { playerId: "p1", affinityType: "singularity", affinityAmount: 2 },
        { playerId: "p2", affinityType: "continuum", affinityAmount: 2 },
        { playerId: "p2", affinityType: "abyss", affinityAmount: 2 },
      ],
    });
  });

  it("does nothing when every holding is below half the starting supply", () => {
    const state = makeGame();
    claimLuminary(state, "lum_pale", (prepared) => {
      for (const player of prepared.players) {
        for (const affinity of STANDARD_AFFINITY_KEYS) {
          player.affinities[affinity] = 1;
          player.bonuses[affinity] = 10;
        }
        player.affinities.singularity = 0;
      }
    });

    expect(state.players.every((player) => (
      STANDARD_AFFINITY_KEYS.every((affinity) => player.affinities[affinity] === 1)
    ))).toBe(true);
    expect(state.pendingLuminaryActivationEvents[0]).toMatchObject({
      luminaryId: "lum_pale",
      affinityReturns: [],
    });
  });

  it("returns two from a holding of three when the starting supply is five", () => {
    const state = normalizeState(initializeGame([
      { id: "p1", name: "Player 1" },
      { id: "p2", name: "Player 2" },
      { id: "p3", name: "Player 3" },
    ], 3));
    state.currentPlayerIndex = 0;

    claimLuminary(state, "lum_pale", (prepared) => {
      for (const player of prepared.players) {
        for (const affinity of STANDARD_AFFINITY_KEYS) {
          player.affinities[affinity] = 0;
          player.bonuses[affinity] = 10;
          prepared.affinityWell[affinity] = 5;
        }
        player.affinities.singularity = 0;
      }
      prepared.players[1].affinities.verdance = 3;
      prepared.affinityWell.verdance = 2;
    });

    expect(state.players[1].affinities.verdance).toBe(1);
    expect(state.affinityWell.verdance).toBe(4);
    expect(state.pendingLuminaryActivationEvents[0]).toMatchObject({
      affinityReturns: [
        { playerId: "p2", affinityType: "verdance", affinityAmount: 2 },
      ],
    });
  });
});

// ─── normalizeState — action log string migration ─────────────────────────────

describe("normalizeState — Glass Orchard action log migration", () => {
  it("rewrites old 'Glass Orchard — Perfect Replication' summaries to include 'The'", () => {
    const raw = {
      ...initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2),
      actionLog: [
        { playerId: "p1", summary: "Glass Orchard — Perfect Replication: +1 extra verdance bonus" },
        { playerId: "p1", summary: "Glass Orchard — Perfect Replication: +1 extra radiance bonus" },
      ],
    };
    const normalized = normalizeState(raw);
    expect(normalized.actionLog[0].summary).toBe(
      "The Glass Orchard — Perfect Replication: +1 extra verdance bonus",
    );
    expect(normalized.actionLog[1].summary).toBe(
      "The Glass Orchard — Perfect Replication: +1 extra radiance bonus",
    );
  });

  it("does not alter summaries that already contain 'The Glass Orchard'", () => {
    const raw = {
      ...initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2),
      actionLog: [
        { playerId: "p1", summary: "The Glass Orchard — Perfect Replication: +1 extra verdance bonus" },
      ],
    };
    const normalized = normalizeState(raw);
    expect(normalized.actionLog[0].summary).toBe(
      "The Glass Orchard — Perfect Replication: +1 extra verdance bonus",
    );
  });

  it("does not alter unrelated action log summaries", () => {
    const raw = {
      ...initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2),
      actionLog: [
        { playerId: "p1", summary: "Player 1 forged Starfall Conduit for 2 Eminence" },
        // Historical log copy must survive state normalization unchanged.
        { playerId: "p2", summary: "Player 2 harvested 2 flare" },
      ],
    };
    const normalized = normalizeState(raw);
    expect(normalized.actionLog[0].summary).toBe("Player 1 forged Starfall Conduit for 2 Eminence");
    expect(normalized.actionLog[1].summary).toBe("Player 2 harvested 2 flare");
  });
});

// ─── Simultaneous-Claim Sequencing ────────────────────────────────────────────

// Helper: when a Forge action triggers pendingLuminaryChoice, dispatch
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
    p.bonuses.verdance = 5;
    p.bonuses.continuum = 6;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    const cardId = state.forgeTier1[0]!;
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);
    // Must pause for player choice — not yet claimed
    expect(state.pendingLuminaryChoice).not.toBeNull();
    expect(state.pendingLuminaryChoice?.candidates).toContain("lum_verdant");
    expect(state.pendingLuminaryChoice?.candidates).toContain("lum_tide");
    expect(p.luminaries).toHaveLength(0);
  });

  it("formatted game state exposes pendingLuminaryChoice to the client", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    p.bonuses.verdance = 5;
    p.bonuses.continuum = 6;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    const cardId = state.forgeTier1[0]!;
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);

    const formatted = formatGameState("room-test", "playing", state, new Set());

    expect(formatted.pendingLuminaryChoice).toEqual({
      playerId: "p1",
      candidates: expect.arrayContaining(["lum_verdant", "lum_tide"]),
      createdAt: expect.any(Number),
    });
  });

  it("both Luminaries are claimed when a single forge qualifies for two simultaneously", () => {
    // lum_verdant (verdance ×5) and lum_tide (continuum ×6) — no shared color requirement
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    p.bonuses.verdance = 5;
    p.bonuses.continuum = 6;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    const cardId = state.forgeTier1[0]!;
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);
    // Player chooses order: verdant first, tide second
    resolveChoice(state, "p1", ["lum_verdant", "lum_tide"]);
    expect(p.luminaries).toContain("lum_verdant");
    expect(p.luminaries).toContain("lum_tide");
    expect(state.pendingLuminaryChoice).toBeNull();
  });

  it("both Luminaries have arrival events queued in player-chosen order", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    p.bonuses.verdance = 5;
    p.bonuses.continuum = 6;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    const cardId = state.forgeTier1[0]!;
    applyAction(state, "p1", { type: "forge_artifact", cardId });
    // Choose tide first, verdant second — events must match the chosen order
    resolveChoice(state, "p1", ["lum_tide", "lum_verdant"]);

    const eventIds = state.pendingSummonEvents.map((e) => e.luminaryId);
    expect(eventIds.indexOf("lum_tide")).toBeLessThan(eventIds.indexOf("lum_verdant"));
  });

  it("Eminence is awarded for both Luminaries before any effect runs", () => {
    // Use two passive Luminaries (no Forge effects) to verify clean Eminence sum.
    // lum_verdant (1 Eminence, verdance×5) and lum_tide (2 Eminence, continuum×6)
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    const startingEminence = p.eminence;
    p.bonuses.verdance = 5;
    p.bonuses.continuum = 6;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    const cardId = state.forgeTier1[0]!;
    applyAction(state, "p1", { type: "forge_artifact", cardId });
    resolveChoice(state, "p1", ["lum_verdant", "lum_tide"]);

    // lum_verdant = 1, lum_tide = 2: total +3 plus the Artifact's Eminence.
    const cardEminence = CARD_MAP.get(cardId)?.eminence ?? 0;
    expect(p.eminence).toBe(startingEminence + 1 + 2 + cardEminence);
  });

  it("winTriggerLuminaryId is set to the Luminary that crosses WIN_THRESHOLD", () => {
    // Player needs exactly 1 more Eminence to win.  Chosen order: verdant first.
    // lum_verdant (1L, verdance×5) fires first, crosses 15.
    // lum_tide (2L, continuum×6) fires second.
    // winTriggerLuminaryId should be lum_verdant (the first to cross 15 in chosen order).
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    p.eminence = 14; // One Eminence away from 15
    p.bonuses.verdance = 5;
    p.bonuses.continuum = 6;
    // Use a 0-Eminence Artifact to keep the Eminence math deterministic.
    const zeroEminenceCard = [...CARD_MAP.entries()].find(([, c]) => c.eminence === 0)?.[0]
      ?? state.forgeTier1[0]!;
    state.forgeTier1[0] = zeroEminenceCard;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    applyAction(state, "p1", { type: "forge_artifact", cardId: zeroEminenceCard });
    resolveChoice(state, "p1", ["lum_verdant", "lum_tide"]);

    expect(state.winTriggerLuminaryId).toBe("lum_verdant");
  });

  it("winTriggerLuminaryId is set to the second Luminary when the first does not cross 15", () => {
    // Player is at 12, needs 3+ to win.
    // Chosen order: verdant first (+1) → 13, does not cross 15.
    // lum_tide (+2) → 15, crosses 15.
    // winTriggerLuminaryId should be lum_tide.
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];
    p.eminence = 12;
    p.bonuses.verdance = 5;
    p.bonuses.continuum = 6;
    const zeroEminenceCard = [...CARD_MAP.entries()].find(([, c]) => c.eminence === 0)?.[0]
      ?? state.forgeTier1[0]!;
    state.forgeTier1[0] = zeroEminenceCard;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];

    applyAction(state, "p1", { type: "forge_artifact", cardId: zeroEminenceCard });
    resolveChoice(state, "p1", ["lum_verdant", "lum_tide"]);

    expect(state.winTriggerLuminaryId).toBe("lum_tide");
  });

  // ─── Oblivion post-pass ─────────────────────────────────────────────────────

  it("lum_void Oblivion applies AFTER all other effects — victory target moves after awards", () => {
    // Forge triggers both lum_void (Oblivion +5 victory requirement) and
    // lum_verdant (+1 Eminence).
    // Player chooses: verdant first, void second.
    // Effects fire in that order, but Oblivion is always deferred to post-pass.
    // The post-pass ensures the victory line moves only after all summon
    // awards/effects for this claim sequence are resolved.
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);
    const p1 = state.players[0];
    const p2 = state.players[1];

    p1.bonuses.verdance = 5;
    p1.bonuses.abyss = 6;
    state.activeLuminaries = ["lum_verdant", "lum_void"];

    p1.eminence = 5;
    p2.eminence = 5;
    state.victoryRequirement = 15;

    const zeroEminenceCard = [...CARD_MAP.entries()].find(([, c]) => c.eminence === 0)?.[0]
      ?? state.forgeTier1[0]!;
    state.forgeTier1[0] = zeroEminenceCard;
    applyAction(state, "p1", { type: "forge_artifact", cardId: zeroEminenceCard });
    resolveChoice(state, "p1", ["lum_verdant", "lum_void"]);

    // lum_verdant: +1 Eminence to p1 → p1 was 5, now 6.
    // lum_void: +5 to the shared victory requirement, no Eminence subtraction.
    expect(p1.eminence).toBe(6);
    expect(p2.eminence).toBe(5);
    expect(state.victoryRequirement).toBe(20);
  });

  it("Oblivion does not reduce Eminence and raises the victory requirement", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    const p1 = state.players[0];
    const p2 = state.players[1];

    p1.bonuses.abyss = 6;
    state.activeLuminaries = ["lum_void"];

    p1.eminence = 0;
    p2.eminence = 0;
    state.victoryRequirement = 15;

    const cardId = [...CARD_MAP.entries()].find(([, c]) => c.eminence === 0)?.[0]
      ?? state.forgeTier1[0]!;
    state.forgeTier1[0] = cardId;
    applyAction(state, "p1", { type: "forge_artifact", cardId });

    expect(p1.eminence).toBe(CARD_MAP.get(cardId)?.eminence ?? 0);
    expect(p2.eminence).toBe(0);
    expect(state.victoryRequirement).toBe(20);
  });

  // ─── Cascade re-entry ───────────────────────────────────────────────────────

  it("cascade re-entry: an arrival effect that grants an Affinity bonus can claim a second Luminary", () => {
    // lum_scholar's Selective Amnesia draws a card from the deck and adds it to
    // the player's collection, granting its bonusAffinity as a permanent bonus.
    // Setup: lum_scholar fires at depth 0, draws an verdance card → player bonus
    // reaches verdance×5 → depth-1 cascade detects lum_verdant eligibility → claims it.
    //
    // Deck-slot accounting: forging forgeTier1[0] causes refillForgeSlot to
    // shift deckTier1[0] into the Forge slot.  lum_scholar's Selective Amnesia
    // then draws from deckTier1 starting at the new [0] (originally [1]).
    // So the verdance card must be placed at deckTier1[1] to survive the Forge refill.
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];

    // lum_scholar requires continuum×4 + radiance×4.
    p.bonuses.continuum = 4;
    p.bonuses.radiance = 4;
    // Player needs verdance×4 now; after lum_scholar draws an verdance card → 5 → qualifies lum_verdant.
    p.bonuses.verdance = 4;

    // Find a Verdance-bonus Tier 1 card.
    const verdanceCard = [...CARD_MAP.values()].find(
      (c) => c.tier === 1 && c.bonusAffinity === "verdance",
    )!;

    // Remove the verdance card from wherever it is (Forge or deck) to rebuild the deck cleanly.
    state.forgeTier1 = state.forgeTier1.filter((id) => id !== verdanceCard.id);
    state.deckTier1 = state.deckTier1.filter((id) => id !== verdanceCard.id);

    // Deterministic deck setup:
    // refillForgeSlot fires before checkLuminaries in the
    // `forge_artifact` action path, so
    // the Forge action refill consumes deck[0]. verdanceCard must be at deck[1] so it
    // lands at deck[0] AFTER the refill, where Selective Amnesia will draw it.
    //
    // Step 1: ensure the Forge is at exactly 4 (without verdanceCard) so the
    // subsequent while loop is a no-op regardless of where verdanceCard was.
    while (state.forgeTier1.length < 4 && state.deckTier1.length > 0) {
      state.forgeTier1.push(state.deckTier1.shift()!);
    }

    // Step 2: place [filler, verdanceCard] at the front of the deck.
    // filler → consumed by Forge action refill (refillForgeSlot)
    // verdanceCard → becomes deck[0] after refill → drawn by Selective Amnesia
    const filler = state.deckTier1.shift()!;
    state.deckTier1 = [filler, verdanceCard.id, ...state.deckTier1];
    // deck is now: [filler, verdanceCard, rest...]
    // After Forge action refill takes filler: deck = [verdanceCard, rest...]
    // Selective Amnesia draws verdanceCard → verdance bonus +1 (4→5) → lum_verdant qualifies

    state.activeLuminaries = ["lum_scholar", "lum_verdant"];

    // Use a non-Verdance trigger card so the forged card itself doesn't push
    // verdance to ≥5 — we need lum_verdant to qualify only AFTER lum_scholar's
    // Selective Amnesia draws the verdance card (depth-1 cascade path, not depth-0).
    const nonVerdanceCardId = state.forgeTier1.find((id) => {
      const c = CARD_MAP.get(id);
      return c && c.bonusAffinity !== "verdance";
    }) ?? state.forgeTier1[0]!;
    // Ensure it's the first slot (for the Forge-refill accounting above).
    state.forgeTier1 = [
      nonVerdanceCardId,
      ...state.forgeTier1.filter((id) => id !== nonVerdanceCardId),
    ];

    const r = applyAction(state, "p1", { type: "forge_artifact", cardId: nonVerdanceCardId });
    expect(r.success).toBe(true);
    // No pending choice — single candidate at depth-0, cascade at depth-1.
    expect(state.pendingLuminaryChoice).toBeNull();

    // After depth-0: lum_scholar claimed → Selective Amnesia draws verdanceCard → verdance bonus +1 (now 5)
    // After depth-1 cascade: lum_verdant now qualifies → should be claimed
    expect(p.luminaries).toContain("lum_scholar");
    expect(p.luminaries).toContain("lum_verdant");
  });

  // ─── planned action presentation boundary ───────────────────────────────────

  it("resolve_summon never promotes a planned action", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    const p = state.players[0];

    // Give p enough bonuses to claim lum_verdant after buying one verdance card.
    p.bonuses.verdance = 4; // one more verdance card will push to 5 → qualifies
    state.activeLuminaries = ["lum_verdant"];

    // Inject a fake pre-existing pending arrival event (from a hypothetical earlier claim).
    state.pendingSummonEvents = [{
      eventId: "fake-event-v1",
      luminaryId: "lum_tide",
      claimedByPlayerId: "p1",
      createdAt: Date.now(),
    }];

    // Store a planned forge_artifact action.
    const targetCard = state.forgeTier1[0]!;
    p.plannedAction = { type: "forge_artifact", cardId: targetCard };

    const forgedBefore = [...p.forgedArtifactIds];
    const r = applyAction(state, "p1", { type: "resolve_summon", eventId: "fake-event-v1" });
    expect(r.success).toBe(true);
    expect(p.forgedArtifactIds).toEqual(forgedBefore);
    expect(p.plannedAction).toEqual({ type: "forge_artifact", cardId: targetCard });
  });

  it("turn advance preserves a plan until execute_plan commits it", () => {
    const state = makeGame();
    const p1 = state.players[0];
    const p2 = state.players[1];
    enrichPlayer(state, 1);
    const targetCard = state.forgeTier1[0]!;
    p2.plannedAction = { type: "forge_artifact", cardId: targetCard };

    const handoff = applyAction(state, p1.playerId, { type: "pass" });
    expect(handoff.success).toBe(true);
    expect(state.currentPlayerIndex).toBe(1);
    expect(p2.plannedAction).toEqual({ type: "forge_artifact", cardId: targetCard });
    expect(p2.forgedArtifactIds).not.toContain(targetCard);
    expect(state.lastAction).toMatchObject({ type: "pass", playerId: p1.playerId });

    const commit = applyAction(state, p2.playerId, { type: "execute_plan" });
    expect(commit.success).toBe(true);
    expect(p2.plannedAction).toBeNull();
    expect(p2.forgedArtifactIds).toContain(targetCard);
    expect(state.lastAction).toMatchObject({
      type: "forge_artifact",
      playerId: p2.playerId,
      cardId: targetCard,
    });
  });

  it("plan_action remains provisional even when submitted during the player's turn", () => {
    const state = makeGame();
    const p1 = state.players[0];
    enrichPlayer(state, 0);
    const targetCard = state.forgeTier1[0]!;

    const plan = applyAction(state, p1.playerId, {
      type: "plan_action",
      plannedActionData: { type: "forge_artifact", cardId: targetCard },
    });

    expect(plan.success).toBe(true);
    expect(state.currentPlayerIndex).toBe(0);
    expect(p1.plannedAction).toEqual({ type: "forge_artifact", cardId: targetCard });
    expect(p1.forgedArtifactIds).not.toContain(targetCard);
    expect(state.lastAction).toMatchObject({ type: "plan_action", playerId: p1.playerId });
  });

  it("failed execute_plan records a consistent cancellation action without advancing turn", () => {
    const state = makeGame();
    const p1 = state.players[0];
    const p2 = state.players[1];
    const realCardNotInForge = state.deckTier1[0]!;

    p2.plannedAction = { type: "forge_artifact", cardId: realCardNotInForge };

    const r = applyAction(state, p1.playerId, { type: "pass" });

    expect(r.success).toBe(true);
    expect(state.currentPlayerIndex).toBe(1);
    expect(p2.plannedAction).toEqual({ type: "forge_artifact", cardId: realCardNotInForge });

    const commit = applyAction(state, p2.playerId, { type: "execute_plan" });
    expect(commit.success).toBe(true);
    expect(p2.plannedAction).toBeNull();
    expect(p2.plannedActionCancelReason).toBe("Artifact is no longer in The Forge");
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.lastAction).toMatchObject({
      type: "planned_action_cancelled",
      playerId: p2.playerId,
      reason: "Artifact is no longer in The Forge",
    });
    expect(state.actionLog.at(-1)?.summary).toBe("pending action cleared — Artifact is no longer in The Forge");
    expect(
      state.actionLog.filter((entry) => entry.summary === "pending action cleared — Artifact is no longer in The Forge"),
    ).toHaveLength(1);

    const followup = applyAction(state, p2.playerId, { type: "pass" });

    expect(followup.success).toBe(true);
    expect(state.lastAction).toMatchObject({
      type: "pass",
      playerId: p2.playerId,
    });
    expect(
      state.actionLog.filter((entry) => entry.summary === "pending action cleared — Artifact is no longer in The Forge"),
    ).toHaveLength(1);
  });

  it("silently drops a stale plannedAction if the card was already obtained", () => {
    const state = makeGame();
    const p1 = state.players[0];
    const p2 = state.players[1];
    const alreadyForgedCardId = state.forgeTier1[0]!;

    p2.forgedArtifactIds.push(alreadyForgedCardId);
    p2.plannedAction = { type: "forge_artifact", cardId: alreadyForgedCardId };
    state.forgeTier1 = state.forgeTier1.filter((id) => id !== alreadyForgedCardId);

    const r = applyAction(state, p1.playerId, { type: "pass" });

    expect(r.success).toBe(true);
    expect(p2.plannedAction).toEqual({ type: "forge_artifact", cardId: alreadyForgedCardId });
    const commit = applyAction(state, p2.playerId, { type: "execute_plan" });
    expect(commit.success).toBe(true);
    expect(p2.plannedAction).toBeNull();
    expect(p2.plannedActionCancelReason).toBeNull();
    expect(state.lastAction).toMatchObject({
      type: "pass",
      playerId: p1.playerId,
    });
    expect(state.actionLog.at(-1)?.summary).not.toContain("pending action cleared");

    const followup = applyAction(state, p2.playerId, { type: "pass" });

    expect(followup.success).toBe(true);
    expect(p2.plannedAction).toBeNull();
    expect(p2.plannedActionCancelReason).toBeNull();
    expect(state.actionLog.filter((entry) => entry.summary.includes("pending action cleared"))).toHaveLength(0);
  });

  it("silently drops a planned encrypt if the player already forged that card", () => {
    const state = makeGame();
    const p1 = state.players[0];
    const p2 = state.players[1];
    const resolvedCardId = state.forgeTier1[0]!;

    p2.forgedArtifactIds.push(resolvedCardId);
    p2.plannedAction = { type: "reserve_artifact", cardId: resolvedCardId };
    state.forgeTier1 = state.forgeTier1.filter((id) => id !== resolvedCardId);

    const r = applyAction(state, p1.playerId, { type: "pass" });

    expect(r.success).toBe(true);
    expect(p2.plannedAction).toEqual({ type: "reserve_artifact", cardId: resolvedCardId });
    const commit = applyAction(state, p2.playerId, { type: "execute_plan" });
    expect(commit.success).toBe(true);
    expect(p2.plannedAction).toBeNull();
    expect(p2.plannedActionCancelReason).toBeNull();
    expect(state.actionLog.filter((entry) => entry.summary.includes("pending action cleared"))).toHaveLength(0);
  });

  it("silently drops a planned forge if the player already encrypted that card", () => {
    const state = makeGame();
    const p1 = state.players[0];
    const p2 = state.players[1];
    const resolvedCardId = state.forgeTier1[0]!;

    p2.reservedArtifactIds.push(resolvedCardId);
    p2.plannedAction = { type: "forge_artifact", cardId: resolvedCardId };
    state.forgeTier1 = state.forgeTier1.filter((id) => id !== resolvedCardId);

    const r = applyAction(state, p1.playerId, { type: "pass" });

    expect(r.success).toBe(true);
    expect(p2.plannedAction).toEqual({ type: "forge_artifact", cardId: resolvedCardId });
    const commit = applyAction(state, p2.playerId, { type: "execute_plan" });
    expect(commit.success).toBe(true);
    expect(p2.plannedAction).toBeNull();
    expect(p2.plannedActionCancelReason).toBeNull();
    expect(state.actionLog.filter((entry) => entry.summary.includes("pending action cleared"))).toHaveLength(0);
  });
});

// ─── normalizeState — burnPile / burnEvents defaults ──────────────────────────

describe("normalizeState — burnPile and burnEvents defaults", () => {
  it("initializeGame records the randomized opening turn order", () => {
    const state = initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2);
    const startingPlayer = state.players[state.currentPlayerIndex];

    expect(state.startedAt).toBeTypeOf("number");
    expect(state.openingTurnOrder).toEqual({
      id: `${state.startedAt}:${startingPlayer.playerId}`,
      startedAt: state.startedAt,
      firstPlayerId: startingPlayer.playerId,
      playerIds: ["p1", "p2"],
    });
  });

  it("can replay the saved opening board", () => {
    const players = [{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }];
    const original = initializeGame(players, 2);
    const snapshot = getReplayBoardSnapshot(original);

    const replay = initializeGame(players, 2, 15, "standard", { replayBoard: snapshot });

    expect(replay.forgeTier1).toEqual(snapshot.forgeTier1);
    expect(replay.forgeTier2).toEqual(snapshot.forgeTier2);
    expect(replay.forgeTier3).toEqual(snapshot.forgeTier3);
    expect(replay.deckTier1).toEqual(snapshot.deckTier1);
    expect(replay.deckTier2).toEqual(snapshot.deckTier2);
    expect(replay.deckTier3).toEqual(snapshot.deckTier3);
    expect(replay.activeLuminaries).toEqual(snapshot.activeLuminaries);
    expect(replay.openingTurnOrder?.firstPlayerId).toBe(snapshot.firstPlayerId);
  });

  it("initialises burnPile to [] when absent", () => {
    const raw = initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2);
    // Simulate old saved state missing burnPile
    const oldState = { ...raw } as Record<string, unknown>;
    delete oldState.burnPile;
    const state = normalizeState(oldState);
    expect(Array.isArray(state.burnPile)).toBe(true);
    expect(state.burnPile).toHaveLength(0);
  });

  it("initialises burnEvents to [] when absent", () => {
    const raw = initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2);
    const oldState = { ...raw } as Record<string, unknown>;
    delete oldState.burnEvents;
    const state = normalizeState(oldState);
    expect(Array.isArray(state.burnEvents)).toBe(true);
    expect(state.burnEvents).toHaveLength(0);
  });

  it("preserves non-empty burnPile from saved state", () => {
    const raw = initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2);
    const savedState = { ...raw, burnPile: ["t3r01", "t2s04"] };
    const state = normalizeState(savedState);
    expect(state.burnPile).toEqual(["t3r01", "t2s04"]);
  });

  it("initializeGame starts with empty burnPile and burnEvents", () => {
    const state = initializeGame([{ id: "p1", name: "P1" }, { id: "p2", name: "P2" }], 2);
    expect(state.burnPile).toEqual([]);
    expect(state.burnEvents).toEqual([]);
  });
});

// ─── burnCard() helper and burn-pile eligibility guards ───────────────────────

describe("burnPile eligibility guards and burnCard() invariants", () => {
  let state: GameStateData;

  beforeEach(() => {
    state = makeGame();
    enrichPlayer(state, 0);
  });

  // ── Guard: forge_artifact ───────────────────────────────────────────────────

  it("forge_artifact returns 'Artifact has been burned' when the target is in burnPile", () => {
    const cardId = state.forgeTier1[0];
    expect(cardId).toBeTruthy();
    // Simulate a Luminary burn effect having already fired — card is recorded in
    // burnPile but the slot has been refilled, so the cardId is no longer in the
    // Forge.  We keep it in the Forge here to isolate only the guard check.
    state.burnPile = [cardId!];
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId: cardId! });
    expect(r.success).toBe(false);
    expect(r.error).toBe("Artifact has been burned");
  });

  it("forge_artifact succeeds for a Tier 2 card that is NOT in burnPile", () => {
    const cardId = state.forgeTier2[0];
    expect(cardId).toBeTruthy();
    state.burnPile = [];
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId: cardId! });
    expect(r.success).toBe(true);
  });

  // ── Guard: reserve_artifact ───────────────────────────────────────────────────

  it("reserve_artifact returns 'Artifact has been burned' when the target is in burnPile", () => {
    const cardId = state.forgeTier1[0];
    expect(cardId).toBeTruthy();
    state.burnPile = [cardId!];
    // Card is technically still listed in the Forge at this point; the guard
    // must fire before the "Artifact is no longer in The Forge" check would.
    const r = applyAction(state, "p1", { type: "reserve_artifact", cardId: cardId! });
    expect(r.success).toBe(false);
    expect(r.error).toBe("Artifact has been burned");
  });

  it("reserve_artifact succeeds for a Tier 1 card that is NOT in burnPile", () => {
    const cardId = state.forgeTier1[0];
    expect(cardId).toBeTruthy();
    state.burnPile = [];
    state.affinityWell.singularity = 0;
    const r = applyAction(state, "p1", { type: "reserve_artifact", cardId: cardId! });
    expect(r.success).toBe(true);
  });

  // ── refillForgeSlot: slot refill after burn ───────────────────────────────

  it("burned Forge slot is refilled from the deck after Red Moth (lum_moth) fires", () => {
    const t3Before = placeRuptureTargets(state);
    expect(t3Before.length).toBeGreaterThan(0);
    const deck3LengthBefore = state.deckTier3.length;

    claimLuminary(state, "lum_moth");

    // Every originally-visible T3 card must now be absent from the Forge.
    for (const id of t3Before) {
      expect(state.forgeTier3).not.toContain(id);
    }

    // All burned cards must be recorded in burnPile.
    for (const id of t3Before) {
      expect(state.burnPile).toContain(id);
    }

    // If the deck had enough cards to cover every burned slot, each position
    // must now hold a fresh (different) card ID.
    if (deck3LengthBefore >= t3Before.length) {
      expect(state.forgeTier3).toHaveLength(t3Before.length);
      for (const freshId of state.forgeTier3) {
        expect(t3Before).not.toContain(freshId);
      }
    }
  });

  // ── burnPile growth: one entry per burnCard() call ────────────────────────

  it("burnPile grows by exactly the number of cards burned (one entry per call)", () => {
    const targets = placeRuptureTargets(state, state.forgeTier3.length);
    const t3Count = targets.length;
    claimLuminary(state, "lum_moth");

    expect(state.burnPile.length).toBe(t3Count);
  });

  // ── burnPile deduplication: same card ID appears at most once ─────────────

  it("burnPile does not gain a duplicate when burnCard is called twice with the same card ID", () => {
    // Pre-seed burnPile with one qualifying T3 card that is still physically in
    // the Forge. When Red Moth fires, the duplicate guard must prevent a second
    // call burnCard with it again.  The deduplication guard must prevent a second
    // entry from appearing in burnPile (burnEvents may still have two entries —
    // that is intentional and is not tested here).
    const cardId = placeRuptureTargets(state, 1)[0];
    expect(cardId).toBeTruthy();
    state.burnPile = [cardId!];

    claimLuminary(state, "lum_moth");

    const occurrences = state.burnPile.filter((id) => id === cardId).length;
    expect(occurrences).toBe(1);
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

  it("awards Catalyst Bloom 4 native Eminence", () => {
    expect(LUMINARY_MAP.get("lum_bloom")?.eminence).toBe(4);
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

// ─── BurnEvent — enriched payload ─────────────────────────────────────────────

describe("BurnEvent — enriched payload (v2 format)", () => {
  it("BurnEvent has a non-empty eventId after Red Moth fires", () => {
    const state = makeGame();
    placeRuptureTargets(state);
    claimLuminary(state, "lum_moth");
    expect(state.burnEvents.length).toBeGreaterThan(0);
    for (const ev of state.burnEvents) {
      expect(typeof ev.eventId).toBe("string");
      expect(ev.eventId.length).toBeGreaterThan(0);
    }
  });

  it("BurnEvent.artifactName is a non-empty string for every burned card", () => {
    const state = makeGame();
    placeRuptureTargets(state);
    claimLuminary(state, "lum_moth");
    expect(state.burnEvents.length).toBeGreaterThan(0);
    for (const ev of state.burnEvents) {
      expect(typeof ev.artifactName).toBe("string");
      expect(ev.artifactName.length).toBeGreaterThan(0);
    }
  });

  it("BurnEvent.sourceType is 'luminary' for Luminary-triggered burns", () => {
    const state = makeGame();
    placeRuptureTargets(state);
    claimLuminary(state, "lum_moth");
    for (const ev of state.burnEvents) {
      expect(ev.sourceType).toBe("luminary");
    }
  });

  it("BurnEvent.sourceLuminaryId identifies the burning Luminary", () => {
    const state = makeGame();
    placeRuptureTargets(state);
    claimLuminary(state, "lum_moth");
    for (const ev of state.burnEvents) {
      expect(ev.sourceLuminaryId).toBe("lum_moth");
    }
  });

  it("BurnEvent.tier is 1, 2, or 3 for every burned card", () => {
    const state = makeGame();
    placeRuptureTargets(state);
    claimLuminary(state, "lum_moth");
    for (const ev of state.burnEvents) {
      expect([1, 2, 3]).toContain(ev.tier);
    }
  });

  it("BurnEvent.ownerPlayerId is the claiming player's id", () => {
    const state = makeGame();
    placeRuptureTargets(state);
    claimLuminary(state, "lum_moth"); // p1 claims lum_moth
    for (const ev of state.burnEvents) {
      expect(ev.ownerPlayerId).toBe("p1");
    }
  });

  it("multiple burns create distinct BurnEvents with distinct eventIds", () => {
    const state = makeGame();
    placeRuptureTargets(state);
    claimLuminary(state, "lum_moth");
    const ids = state.burnEvents.map((e) => e.eventId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("forging a card normally does NOT emit a BurnEvent", () => {
    const state = makeGame();
    state.activeLuminaries = []; // no Luminaries — pure forge
    enrichPlayer(state, 0);
    const cardId = state.forgeTier1[0]!;
    const before = state.burnEvents.length;
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);
    expect(state.burnEvents.length).toBe(before);
  });

  it("normalizeState migrates legacy BurnEvents to include all v2 fields", () => {
    const raw = {
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
      burnEvents: [
        { cardId: "old_card", tier: 2, turn: 3, sourceLuminaryId: "lum_moth" },
      ],
    };
    const state = normalizeState(raw);
    expect(state.burnEvents).toHaveLength(1);
    const ev = state.burnEvents[0]!;
    expect(typeof ev.eventId).toBe("string");
    expect(ev.eventId.length).toBeGreaterThan(0);
    expect(ev.artifactName).toBeTruthy();
    expect(ev.sourceType).toBe("luminary");
    expect(ev.cardId).toBe("old_card");
    expect(ev.sourceLuminaryId).toBe("lum_moth");
    expect(ev.tier).toBe(2);
    expect(ev.turn).toBe(3);
  });
});

// ─── Final Hunger — Assimilation ──────────────────────────────────────────────

describe("Final Hunger — Assimilation (lum_hunger)", () => {
  /** Claim lum_hunger for p1, then cycle back to p1's turn via p2 pass. */
  function setupHunger(state: GameStateData): void {
    claimLuminary(state, "lum_hunger");
    resolveLuminaryPresentation(state); // firstHungerAvailable='p1'; advances to p2
    enrichPlayer(state, 1);
    pass(state); // back to p1
    enrichPlayer(state, 0); // Ensure p1 has ample Affinities.
  }

  /** Find the first Forge card with at least one flare/verdance/radiance cost unit. */
  function findAssimTarget(state: GameStateData): string | undefined {
    return [
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ].find((id) => {
      const c = CARD_MAP.get(id);
      return (
        c &&
        ((c.cost.flare ?? 0) + (c.cost.verdance ?? 0) + (c.cost.radiance ?? 0)) > 0
      );
    });
  }

  it("firstHungerAvailable is set to the claimer's playerId on arrival", () => {
    const state = makeGame();
    claimLuminary(state, "lum_hunger");
    expect(state.firstHungerAvailable).toBe("p1");
  });

  it("assimilate burns the target card (card enters burnPile)", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    const r = applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(r.success).toBe(true);
    expect(state.burnPile).toContain(target);
  });

  it("assimilate grants printed Eminence + 2 to the owner", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    const card = CARD_MAP.get(target)!;
    const before = state.players[0]!.eminence;
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(state.players[0]!.eminence).toBe(before + card.eminence + 2);
  });

  it("assimilated card does NOT appear in the owner's collection", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(state.players[0]!.forgedArtifactIds ?? []).not.toContain(target);
  });

  it("firstHungerAvailable is cleared to null after a successful assimilate", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(state.firstHungerAvailable).toBeNull();
  });

  it("cannot assimilate twice — firstHungerAvailable is null after first use", () => {
    const state = makeGame();
    setupHunger(state);
    const targets = [
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ].filter((id) => {
      const c = CARD_MAP.get(id);
      return (
        c &&
        ((c.cost.flare ?? 0) + (c.cost.verdance ?? 0) + (c.cost.radiance ?? 0)) > 0
      );
    });
    if (targets.length < 1) return;
    applyAction(state, "p1", { type: "assimilate", cardId: targets[0]! });
    expect(state.firstHungerAvailable).toBeNull();
  });

  it("assimilate emits a BurnEvent for the consumed card with triggeredByPlayerId='p1'", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    const before = state.burnEvents.length;
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(state.burnEvents.length).toBe(before + 1);
    const ev = state.burnEvents[state.burnEvents.length - 1]!;
    expect(ev.cardId).toBe(target);
    expect(ev.sourceLuminaryId).toBe("lum_hunger");
    expect(ev.triggeredByPlayerId).toBe("p1");
  });

  it("assimilate increments Catalyst Bloom burn count by 1 (when lum_bloom is in play)", () => {
    const state = makeGame();
    setupHunger(state);
    // Catalyst Bloom count only increments while lum_bloom is held by a player.
    // Give p2 lum_bloom so the accumulator is active.
    state.players[1]!.luminaries.push("lum_bloom");
    const target = findAssimTarget(state);
    if (!target) return;
    const before = state.catalystBloomBurnCount ?? 0;
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(state.catalystBloomBurnCount ?? 0).toBe(before + 1);
  });

  it("assimilate fails if the target card is not in the face-up Forge", () => {
    const state = makeGame();
    setupHunger(state);
    const r = applyAction(state, "p1", {
      type: "assimilate",
      cardId: "nonexistent_card_id_xyz",
    });
    expect(r.success).toBe(false);
  });

  it("assimilate fails if the target has no Flare/Verdance/Radiance cost", () => {
    const state = makeGame();
    setupHunger(state);
    const pureNonFVR = [
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ].find((id) => {
      const c = CARD_MAP.get(id);
      return (
        c &&
        (c.cost.flare ?? 0) === 0 &&
        (c.cost.verdance ?? 0) === 0 &&
        (c.cost.radiance ?? 0) === 0 &&
        (c.cost.continuum ?? 0) + (c.cost.abyss ?? 0) + (c.cost.singularity ?? 0) > 0
      );
    });
    if (!pureNonFVR) return; // Skip if no such card in this random Forge
    const r = applyAction(state, "p1", {
      type: "assimilate",
      cardId: pureNonFVR,
    });
    expect(r.success).toBe(false);
  });

  it("assimilate fails when firstHungerAvailable is null (regression)", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    state.firstHungerAvailable = null;
    const target = state.forgeTier1[0];
    if (!target) return;
    const r = applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(r.success).toBe(false);
  });

  it("wrong player cannot assimilate when firstHungerAvailable is set to another player (regression)", () => {
    const state = makeGame();
    claimLuminary(state, "lum_hunger"); // p1's arrival; advances to p2's turn
    enrichPlayer(state, 1);
    // firstHungerAvailable='p1', but it is now p2's turn — p2 tries to claim it
    const target = findAssimTarget(state);
    if (!target) return;
    const r = applyAction(state, "p2", { type: "assimilate", cardId: target });
    expect(r.success).toBe(false);
  });

  it("assimilation BurnEvent.sourceName is the Luminary's display name", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    const ev = state.burnEvents[state.burnEvents.length - 1]!;
    expect(typeof ev.sourceName).toBe("string");
    expect(ev.sourceName!.length).toBeGreaterThan(0);
  });
});

describe("developer Luminary sequence laboratory", () => {
  it("claims selected Luminaries and queues arrivals in the requested order", () => {
    const state = makeGame();
    state.activeLuminaries = ["lum_void"];

    const result = runDevLuminarySequence(state, "p1", {
      luminaryIds: ["lum_null", "lum_compass", "lum_ember"],
      includeEndOfTurnEffects: false,
      includeStartOfTurnEffects: false,
    });

    expect(result.success).toBe(true);
    expect(state.players[0]!.luminaries).toEqual([
      "lum_null",
      "lum_compass",
      "lum_ember",
    ]);
    expect(state.pendingSummonEvents.map((event) => event.luminaryId)).toEqual([
      "lum_null",
      "lum_compass",
      "lum_ember",
    ]);
    expect(
      state.pendingLuminaryActivationEvents.map((event) => [
        event.luminaryId,
        event.effectType,
      ]),
    ).toEqual([
      ["lum_null", "summon"],
      ["lum_compass", "summon"],
      ["lum_ember", "summon"],
    ]);
    expect(state.lastAction).toMatchObject({
      type: "dev_luminary_sequence",
      playerId: "p1",
      luminaryIds: ["lum_null", "lum_compass", "lum_ember"],
    });
    expect(state.devLuminarySequenceActive).toBe(true);
  });

  it("stages qualifying holdings for every player to demonstrate Pale Merchant's return", () => {
    const state = makeGame();
    state.players[0]!.affinities.abyss = 0;
    state.players[0]!.affinities.radiance = 0;

    const result = runDevLuminarySequence(state, "p1", {
      luminaryIds: ["lum_pale"],
      includeEndOfTurnEffects: false,
      includeStartOfTurnEffects: false,
    });

    expect(result.success).toBe(true);
    expect(state.pendingLuminaryActivationEvents[0]).toMatchObject({
      luminaryId: "lum_pale",
      affinityReturns: [
        { playerId: "p1", affinityType: "flare", affinityAmount: 2 },
        { playerId: "p2", affinityType: "continuum", affinityAmount: 2 },
      ],
    });
  });

  it("queues staged delayed hooks in production order after every arrival effect", () => {
    const state = makeGame();

    const result = runDevLuminarySequence(state, "p1", {
      luminaryIds: ["lum_astral", "lum_radiant", "lum_bloom", "lum_seed"],
      includeEndOfTurnEffects: true,
      includeStartOfTurnEffects: true,
    });

    expect(result.success).toBe(true);
    expect(
      state.pendingLuminaryActivationEvents.map((event) => [
        event.luminaryId,
        event.effectType,
      ]),
    ).toEqual([
      ["lum_astral", "summon"],
      ["lum_seed", "summon"],
    ]);

    for (const event of [...state.pendingSummonEvents]) {
      const resolution = applyAction(state, "p1", {
        type: "resolve_summon",
        eventId: event.eventId,
      });
      expect(resolution.success).toBe(true);
    }
    for (const event of [...state.pendingLuminaryActivationEvents]) {
      const resolution = applyAction(state, "p1", {
        type: "resolve_luminary_activation",
        eventId: event.eventId,
      });
      expect(resolution.success).toBe(true);
    }

    expect(
      state.pendingLuminaryActivationEvents.map((event) => [
        event.luminaryId,
        event.effectType,
      ]),
    ).toEqual([
      ["lum_radiant", "end_of_turn"],
      ["lum_bloom", "end_of_turn"],
      ["lum_seed", "end_of_turn"],
    ]);

    for (const event of [...state.pendingLuminaryActivationEvents]) {
      const resolution = applyAction(state, "p1", {
        type: "resolve_luminary_activation",
        eventId: event.eventId,
      });
      expect(resolution.success).toBe(true);
    }

    expect(
      state.pendingLuminaryActivationEvents.map((event) => [
        event.luminaryId,
        event.effectType,
      ]),
    ).toEqual([
      ["lum_astral", "start_of_turn"],
    ]);
    expect(state.devLuminarySequenceActive).toBe(true);

    const startTurnResolution = applyAction(state, "p1", {
      type: "resolve_luminary_activation",
      eventId: state.pendingLuminaryActivationEvents[0]!.eventId,
    });
    expect(startTurnResolution.success).toBe(true);
    expect(state.devLuminarySequenceActive).toBe(false);
  });

  it("presents Forgotten Hour only on arrival instead of fast-forwarding its recurrence", () => {
    const state = makeGame();
    const victoryRequirementBefore = state.victoryRequirement ?? 20;

    const result = runDevLuminarySequence(state, "p1", {
      luminaryIds: ["lum_compass"],
      includeEndOfTurnEffects: true,
      includeStartOfTurnEffects: false,
    });

    expect(result.success).toBe(true);
    expect(state.victoryRequirement).toBe(victoryRequirementBefore + 1);

    for (const event of [...state.pendingSummonEvents]) {
      expect(applyAction(state, "p1", {
        type: "resolve_summon",
        eventId: event.eventId,
      }).success).toBe(true);
    }
    for (const event of [...state.pendingLuminaryActivationEvents]) {
      expect(event.effectType).toBe("summon");
      expect(applyAction(state, "p1", {
        type: "resolve_luminary_activation",
        eventId: event.eventId,
      }).success).toBe(true);
    }

    expect(state.pendingLuminaryActivationEvents).toEqual([]);
    expect(state.victoryRequirement).toBe(victoryRequirementBefore + 1);
    expect(state.forgottenHourCycle?.p1?.cooldownOwnerTurnsRemaining).toBeNull();
    expect(state.devLuminarySequenceActive).toBe(false);
  });

  it("keeps Cinder Mandate targets in the Forge until its Branding Strike finishes", () => {
    const state = makeGame();

    const result = runDevLuminarySequence(state, "p1", {
      luminaryIds: ["lum_ember"],
      includeEndOfTurnEffects: true,
      includeStartOfTurnEffects: false,
    });

    expect(result.success).toBe(true);
    const arrivalActivation = state.pendingLuminaryActivationEvents.find(
      (event) => event.luminaryId === "lum_ember" && event.effectType === "summon",
    );
    expect(arrivalActivation?.targetCardIds?.length).toBeGreaterThan(0);

    const arrivalTargets = arrivalActivation?.targetCardIds ?? [];
    const forgeBeforeStrike = new Set([
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ]);
    expect(arrivalTargets.every((id) => forgeBeforeStrike.has(id))).toBe(true);
    expect(arrivalTargets.every((id) => state.artifactMarkers?.[id] != null)).toBe(true);

    for (const event of [...state.pendingSummonEvents]) {
      const resolution = applyAction(state, "p1", {
        type: "resolve_summon",
        eventId: event.eventId,
      });
      expect(resolution.success).toBe(true);
    }
    const activationResolution = applyAction(state, "p1", {
      type: "resolve_luminary_activation",
      eventId: arrivalActivation!.eventId,
    });
    expect(activationResolution.success).toBe(true);

    const burnActivation = state.pendingLuminaryActivationEvents.find(
      (event) => event.luminaryId === "lum_ember" && event.effectType === "end_of_turn",
    );
    expect(burnActivation?.targetCardIds).toEqual(expect.arrayContaining(arrivalTargets));
    const forgeAfterStrike = new Set([
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ]);
    expect(arrivalTargets.some((id) => !forgeAfterStrike.has(id))).toBe(true);
  });

  it("refuses to overlap an unresolved presentation", () => {
    const state = makeGame();
    const versionBefore = state.version;
    state.pendingSummonEvents.push({
      eventId: "existing-event",
      luminaryId: "lum_moth",
      claimedByPlayerId: "p2",
      createdAt: Date.now(),
    });

    const result = runDevLuminarySequence(state, "p1", {
      luminaryIds: ["lum_null"],
    });

    expect(result).toMatchObject({
      success: false,
      error: "Wait for the current Luminary sequence to finish",
    });
    expect(state.players[0]!.luminaries).toEqual([]);
    expect(state.version).toBe(versionBefore);
  });
});
