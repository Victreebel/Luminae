/**
 * gameEngine.test.ts — Luminary Mechanics Update v0.8
 *
 * Covers: markers (Forgotten / Condemned / Nullified / Avatar Seed),
 * on-arrival burn / scry effects, end-of-turn payouts, deferred burns,
 * the Assimilation action, The Glass Orchard bonus, and normalizeState defaults.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SubmitActionBody } from "@workspace/api-zod";
import {
  initializeGame,
  getTurnOrderEminenceCompensation,
  applyAction,
  normalizeState,
  formatGameState,
  getReplayBoardSnapshot,
  LUMINARY_MAP,
  CARD_MAP,
  NATURAL_AFFINITY_KEYS,
  STANDARD_AFFINITY_KEYS,
  LUMINARIES,
  getArtifactBrands,
  markerHasBrand,
  runDevLuminarySequence,
  DEFAULT_BALANCE_RULESET,
  BALANCE_RULESET_CANDIDATES,
  getBalanceRuleset,
  getBalanceRulesetCandidate,
  setBalanceRuleset,
} from "./gameEngine.js";
import type { BalanceRuleset, GameStateData } from "./gameEngine.js";
import { chooseAiAction } from "./aiPlayer.js";
import { GUIDED_LUMII_AVATAR_ID } from "./avatarAssignment.js";

describe("natural Affinity invariants", () => {
  it("keeps Artifact bonuses and Luminary requirements natural-only", () => {
    const naturalAffinities = new Set<string>(NATURAL_AFFINITY_KEYS);

    for (const card of CARD_MAP.values()) {
      expect(naturalAffinities.has(card.bonusAffinity)).toBe(true);
    }
    for (const luminary of LUMINARIES) {
      expect(luminary.requirements.singularity).toBe(0);
      const requiredAffinities = NATURAL_AFFINITY_KEYS.filter(
        (affinity) => luminary.requirements[affinity] > 0,
      );
      expect(requiredAffinities.length).toBeGreaterThan(0);
    }
  });
});

describe("turn-order Eminence compensation", () => {
  const players = Array.from({ length: 4 }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
  }));

  it("uses one point for non-openers, plus one for the last seat in a 4P 20-point game", () => {
    expect([0, 1, 2, 3].map((position) =>
      getTurnOrderEminenceCompensation(position, 4, 15),
    )).toEqual([0, 1, 1, 1]);
    expect([0, 1, 2, 3].map((position) =>
      getTurnOrderEminenceCompensation(position, 4, 20),
    )).toEqual([0, 1, 1, 2]);
    expect(getTurnOrderEminenceCompensation(1, 2, 20)).toBe(1);
  });

  it("applies and explains compensation only when ordinary-match setup requests it", () => {
    const state = initializeGame(players, 4, 20, "standard", {
      applyTurnOrderCompensation: true,
    });
    const openingSeat = state.players.findIndex(
      (player) => player.playerId === state.openingTurnOrder?.firstPlayerId,
    );

    for (const [seat, player] of state.players.entries()) {
      const openingPosition = (seat - openingSeat + state.players.length) % state.players.length;
      expect(player.eminence).toBe(
        getTurnOrderEminenceCompensation(openingPosition, 4, 20),
      );
    }
    expect(state.actionLog.filter((entry) =>
      entry.summary.includes("for acting after the opener"),
    )).toHaveLength(3);

    const guidedState = initializeGame(players.slice(0, 2), 2);
    expect(guidedState.players.map((player) => player.eminence)).toEqual([0, 0]);
    expect(guidedState.actionLog.some((entry) =>
      entry.summary.includes("for acting after the opener"),
    )).toBe(false);
  });

  it("suppresses starting compensation for an attached no-base-Luminary candidate", () => {
    const state = initializeGame(players, 4, 20, "standard", {
      applyTurnOrderCompensation: true,
      balanceRuleset: {
        ...DEFAULT_BALANCE_RULESET,
        id: "no-luminary-eminence",
        luminaryBaseEminence: "none",
      },
    });

    expect(state.players.map((player) => player.eminence)).toEqual([0, 0, 0, 0]);
    expect(state.actionLog.some((entry) =>
      entry.summary.includes("for acting after the opener"),
    )).toBe(false);
  });
});

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
  if (raw.openingTurnOrder) {
    raw.openingTurnOrder = {
      ...raw.openingTurnOrder,
      id: `${raw.openingTurnOrder.startedAt}:${raw.players[0]!.playerId}`,
      firstPlayerId: raw.players[0]!.playerId,
    };
  }
  if (raw.initialBoard) raw.initialBoard.firstPlayerId = raw.players[0]!.playerId;
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
  let safety = state.players.length + 1;
  while (state.phase !== "finished" && safety-- > 0) pass(state);
  expect(state.phase).toBe("finished");
  expect(state.finishReason).toBe("frontier_exhaustion");
}

function experimentalRuleset(
  id: string,
  changes: Partial<Omit<BalanceRuleset, "id">>,
): BalanceRuleset {
  return { ...DEFAULT_BALANCE_RULESET, id, ...changes };
}

describe("action request hardening", () => {
  it("rejects the retired tutorial fast-forward action at both API and engine boundaries", () => {
    expect(SubmitActionBody.safeParse({
      sessionToken: "session-token",
      type: "tutorial_fast_forward",
    }).success).toBe(false);

    const state = makeGame();
    const initialVersion = state.version;
    const result = applyAction(state, "p1", {
      type: "tutorial_fast_forward",
    } as never);

    expect(result).toEqual({ success: false, error: "Unknown action type" });
    expect(state.version).toBe(initialVersion);
    expect(state.players[0].eminence).toBe(0);
    expect(state.players[0].forgedArtifactIds).toHaveLength(0);

    const nestedResult = applyAction(state, "p2", {
      type: "plan_action",
      plannedActionData: { type: "tutorial_fast_forward" } as never,
    });
    expect(nestedResult.success).toBe(false);
    expect(state.players[1].plannedAction).toBeNull();
  });

  it("rejects fractional return counts in the public request schema", () => {
    expect(SubmitActionBody.safeParse({
      sessionToken: "session-token",
      type: "reserve_artifact",
      cardId: "t1r01",
      returnAffinities: {
        flare: 0.2,
        continuum: 0.2,
        verdance: 0.2,
        abyss: 0.2,
        radiance: 0.2,
      },
    }).success).toBe(false);
  });
});

describe("Affinity return validation", () => {
  it("rejects fractional reserve returns without mutating the game", () => {
    const state = makeGame();
    const player = state.players[0];
    for (const affinity of NATURAL_AFFINITY_KEYS) player.affinities[affinity] = 2;
    const cardId = state.forgeTier1[0]!;
    const holdingsBefore = { ...player.affinities };
    const wellBefore = { ...state.affinityWell };

    const result = applyAction(state, "p1", {
      type: "reserve_artifact",
      cardId,
      returnAffinities: {
        flare: 0.2,
        continuum: 0.2,
        verdance: 0.2,
        abyss: 0.2,
        radiance: 0.2,
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("whole numbers");
    expect(player.affinities).toEqual(holdingsBefore);
    expect(state.affinityWell).toEqual(wellBefore);
    expect(player.reservedArtifactIds).toHaveLength(0);
    expect(state.forgeTier1).toContain(cardId);
  });

  it("accepts an exact one-token reserve return and preserves the holding limit", () => {
    const state = makeGame();
    const player = state.players[0];
    for (const affinity of NATURAL_AFFINITY_KEYS) player.affinities[affinity] = 2;
    const cardId = state.forgeTier1[0]!;

    const result = applyAction(state, "p1", {
      type: "reserve_artifact",
      cardId,
      returnAffinities: { flare: 1 },
    });

    expect(result.success).toBe(true);
    expect(player.reservedArtifactIds).toContain(cardId);
    expect(Object.values(player.affinities).reduce((sum, count) => sum + count, 0)).toBe(10);
    expect(player.affinities.flare).toBe(1);
    expect(player.affinities.singularity).toBe(1);
  });

  it("rejects over-returning from a three-Affinity Harness and rolls back the take", () => {
    const state = makeGame();
    const player = state.players[0];
    for (const affinity of NATURAL_AFFINITY_KEYS) player.affinities[affinity] = 2;
    const holdingsBefore = { ...player.affinities };
    const wellBefore = { ...state.affinityWell };

    const result = applyAction(state, "p1", {
      type: "harness_three_affinities",
      affinities: { flare: 1, continuum: 1, verdance: 1 },
      returnAffinities: { flare: 2, continuum: 2 },
    });

    expect(result).toEqual({
      success: false,
      error: "Must return exactly 3 Affinities to stay within the 10-Affinity limit",
    });
    expect(player.affinities).toEqual(holdingsBefore);
    expect(state.affinityWell).toEqual(wellBefore);
  });

  it("rejects a broad Harness unless it contains exactly three different Affinities", () => {
    const state = makeGame();
    const holdingsBefore = { ...state.players[0].affinities };
    const wellBefore = { ...state.affinityWell };

    const result = applyAction(state, "p1", {
      type: "harness_three_affinities",
      affinities: { flare: 1, continuum: 1 },
    });

    expect(result).toEqual({
      success: false,
      error: "Must select exactly 3 different affinities",
    });
    expect(state.players[0].affinities).toEqual(holdingsBefore);
    expect(state.affinityWell).toEqual(wellBefore);
  });

  it("rejects over-returning from a same-Affinity Harness and rolls back the take", () => {
    const state = makeGame();
    const player = state.players[0];
    player.affinities.radiance = 9;
    const holdingsBefore = { ...player.affinities };
    const wellBefore = { ...state.affinityWell };

    const result = applyAction(state, "p1", {
      type: "harness_two_affinities",
      affinity: "flare",
      returnAffinities: { radiance: 2 },
    });

    expect(result).toEqual({
      success: false,
      error: "Must return exactly 1 Affinity to stay within the 10-Affinity limit",
    });
    expect(player.affinities).toEqual(holdingsBefore);
    expect(state.affinityWell).toEqual(wellBefore);
  });
});

describe("Luminary card effect copy", () => {
  it("provides a current full rules description for every active Luminary", () => {
    const activeIds = [
      "lum_moth", "lum_tide", "lum_verdant", "lum_void", "lum_radiant",
      "lum_astral", "lum_bloom", "lum_forge", "lum_compass", "lum_seed",
      "lum_orchard", "lum_pale", "lum_ember", "lum_hunger", "lum_null",
    ];

    for (const id of activeIds) {
      const luminary = LUMINARY_MAP.get(id);
      expect(luminary?.effectName, id).toBeTruthy();
      expect(luminary?.effectDescription, id).toBeTruthy();
      expect(luminary?.effectDescription, id).not.toMatch(/\bcards?\b/i);
    }
  });

  it("keeps recently revised mechanics out of obsolete card copy", () => {
    expect(LUMINARY_MAP.get("lum_tide")?.effectDescription).toContain("top Artifact of each Archive");
    expect(LUMINARY_MAP.get("lum_radiant")?.effectDescription).toContain("at least 10");
    expect(LUMINARY_MAP.get("lum_compass")?.effectDescription).toContain(
      "without raising the victory requirement",
    );
    expect(LUMINARY_MAP.get("lum_seed")?.effectDescription).toContain(
      "each unseeded Artifact",
    );
    expect(LUMINARY_MAP.get("lum_orchard")?.effectDescription).toContain(
      "second permanent bonus Affinity",
    );
    expect(LUMINARY_MAP.get("lum_orchard")?.effectDescription).not.toMatch(
      /cheapest|free copy/i,
    );
    expect(LUMINARY_MAP.get("lum_pale")?.effectDescription).toContain(
      "including Singularity",
    );
    expect(LUMINARY_MAP.get("lum_ember")?.effectDescription).toContain(
      "end of your next turn",
    );
  });
});

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

describe("civilization usage history", () => {
  it("records successful Forge actions independently of the current tableau", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    const cardId = state.forgeTier1[0]!;

    const result = applyAction(state, "p1", { type: "forge_artifact", cardId });

    expect(result.success).toBe(true);
    expect(state.players[0].artifactForgeCounts).toEqual({ [cardId]: 1 });
    state.players[0].forgedArtifactIds = [];
    expect(state.players[0].artifactForgeCounts).toEqual({ [cardId]: 1 });
  });

  it("records every Luminary alliance when it is committed", () => {
    const state = makeGame();

    claimLuminary(state, "lum_void");

    expect(state.players[0].luminaryAllianceCounts).toEqual({ lum_void: 1 });
  });
});

describe("game ending and victory ranking", () => {
  it("allows surrender to end a head-to-head match", () => {
    const state = makeGame();

    const result = applyAction(state, "p1", { type: "surrender" });

    expect(result.success).toBe(true);
    expect(state.phase).toBe("finished");
    expect(state.finishReason).toBe("surrender");
    expect(state.winnerId).toBe("p2");
  });

  it("rejects surrender without mutating a three-player match", () => {
    const state = normalizeState(initializeGame(
      [
        { id: "p1", name: "Player 1" },
        { id: "p2", name: "Player 2" },
        { id: "p3", name: "Player 3" },
      ],
      3,
    ));
    state.currentPlayerIndex = 0;
    const turnCountBefore = state.turnCount;

    const result = applyAction(state, "p1", { type: "surrender" });

    expect(result).toEqual({
      success: false,
      error: "Surrender is only available in two-player matches",
    });
    expect(state.phase).toBe("playing");
    expect(state.winnerId).toBeNull();
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnCount).toBe(turnCountBefore);
  });

  it("gives every later seat one final turn when the frontier is exhausted", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);
    state.players[0].eminence = 8;
    state.players[1].eminence = 11;
    const finalArtifactId = state.forgeTier1[0]!;
    const reservedArtifactId = [...CARD_MAP.values()].find(
      (card) => card.tier === 1 && card.id !== finalArtifactId,
    )!.id;
    state.players[1].reservedArtifactIds = [reservedArtifactId];
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
    expect(state.phase).toBe("last_round");
    expect(state.finishReason).toBe("frontier_exhaustion");
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.roundNumber).toBe(roundBefore);

    const finalSeatResult = applyAction(state, "p2", {
      type: "forge_reserved_artifact",
      cardId: reservedArtifactId,
    });

    expect(finalSeatResult.success).toBe(true);
    expect(state.phase).toBe("finished");
    expect(state.finishReason).toBe("frontier_exhaustion");
    expect(state.players[1].forgedArtifactIds).toContain(reservedArtifactId);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.roundNumber).toBe(roundBefore);
    expect(state.pendingTurnTransition).toBeNull();
  });

  it("closes frontier exhaustion at the recorded opener rather than seat zero", () => {
    const state = normalizeState(initializeGame(
      [
        { id: "p1", name: "Player 1" },
        { id: "p2", name: "Player 2" },
        { id: "p3", name: "Player 3" },
      ],
      3,
    ));
    state.currentPlayerIndex = 1;
    state.openingTurnOrder = {
      id: `${state.startedAt}:p2`,
      startedAt: state.startedAt!,
      firstPlayerId: "p2",
      playerIds: ["p1", "p2", "p3"],
    };
    state.initialBoard!.firstPlayerId = "p2";
    emptyForgeAndArchives(state);

    pass(state); // p2 -> p3
    expect(state.phase).toBe("last_round");
    expect(state.currentPlayerIndex).toBe(2);
    pass(state); // p3 -> p1; crossing seat zero is not the boundary
    expect(state.phase).toBe("last_round");
    expect(state.currentPlayerIndex).toBe(0);
    pass(state); // p1 -> p2

    expect(state.phase).toBe("finished");
    expect(state.finishReason).toBe("frontier_exhaustion");
    expect(state.turnCount).toBe(3);
  });

  it("does not refill the frontier from Phoenix recurrence during an exhaustion close", () => {
    const state = makeGame();
    const burnedCardId = state.forgeTier1[0]!;
    emptyForgeAndArchives(state);
    state.burnPile = [burnedCardId];
    state.players[1].luminaries = ["lum_astral"];
    state.phoenixRecurrence = {
      ownerId: "p2",
      summonedAtTurnCount: 0,
      recoveryPending: true,
    };

    pass(state); // p1 exhausts; p2 start effects would normally recover the card

    expect(state.phase).toBe("last_round");
    expect(state.finishReason).toBe("frontier_exhaustion");
    expect(state.burnPile).toEqual([burnedCardId]);
    expect(state.deckTier1).toEqual([]);
    expect(state.forgeTier1).toEqual([]);
    expect(state.phoenixRecurrence?.recoveryPending).toBe(true);
  });

  it("records frontier exhaustion when it occurs during an Eminence closing round", () => {
    const state = makeGame();
    state.players[0].eminence = 15;

    pass(state);
    expect(state.phase).toBe("last_round");
    expect(state.finishReason).toBeUndefined();

    emptyForgeAndArchives(state);
    pass(state);

    expect(state.phase).toBe("finished");
    expect(state.finishReason).toBe("frontier_exhaustion");
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
    expect(state.finishReason).toBe("win");
    expect(state.winnerId).toBe("p2");
  });

  it("resumes play when a raised victory requirement invalidates the final round", () => {
    const state = makeGame();
    state.players[0].eminence = 15;

    pass(state);
    expect(state.phase).toBe("last_round");
    expect(state.currentPlayerIndex).toBe(1);

    state.victoryRequirement = 20;
    state.winTriggerLuminaryId = "lum_verdant";
    pass(state);

    expect(state.phase).toBe("playing");
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.winnerId).toBeNull();
    expect(state.winTriggerLuminaryId).toBeNull();

    state.players[0].eminence = 20;
    pass(state);
    expect(state.phase).toBe("last_round");
    pass(state);
    expect(state.phase).toBe("finished");
    expect(state.winnerId).toBe("p1");
  });

  it("completes the final round at the actual opening player's seat", () => {
    const state = initializeGame(
      [
        { id: "p1", name: "Player 1" },
        { id: "p2", name: "Player 2" },
        { id: "p3", name: "Player 3" },
      ],
      3,
    );
    state.currentPlayerIndex = 1;
    state.openingTurnOrder = {
      id: `${state.startedAt}:p2`,
      startedAt: state.startedAt!,
      firstPlayerId: "p2",
      playerIds: ["p1", "p2", "p3"],
    };
    state.initialBoard!.firstPlayerId = "p2";
    state.players[1]!.eminence = 15;

    pass(state); // p2 -> p3
    expect(state.phase).toBe("last_round");
    expect(state.currentPlayerIndex).toBe(2);

    pass(state); // p3 -> p1; crossing seat 0 must not end the game
    expect(state.phase).toBe("last_round");
    expect(state.currentPlayerIndex).toBe(0);

    pass(state); // p1 -> p2; all three players have now acted once
    expect(state.phase).toBe("finished");
    expect(state.turnCount).toBe(3);
    expect(state.winnerId).toBe("p2");
  });

  it("increments rounds when play returns to the actual opening player", () => {
    const state = initializeGame(
      [
        { id: "p1", name: "Player 1" },
        { id: "p2", name: "Player 2" },
        { id: "p3", name: "Player 3" },
      ],
      3,
    );
    state.currentPlayerIndex = 1;
    state.openingTurnOrder = {
      id: `${state.startedAt}:p2`,
      startedAt: state.startedAt!,
      firstPlayerId: "p2",
      playerIds: ["p1", "p2", "p3"],
    };
    state.initialBoard!.firstPlayerId = "p2";

    pass(state); // p2 -> p3
    pass(state); // p3 -> p1
    expect(state.roundNumber).toBe(1);

    pass(state); // p1 -> p2
    expect(state.roundNumber).toBe(2);
    expect(state.currentPlayerIndex).toBe(1);
  });
});

describe("experimental BalanceRuleset semantics", () => {
  it("exposes stable defaults, named candidates, and nonserialized ruleset attachment", () => {
    const state = makeGame();

    expect(getBalanceRuleset(state)).toEqual(DEFAULT_BALANCE_RULESET);
    expect(DEFAULT_BALANCE_RULESET.blueprintSlots).toBe(2);
    expect(getBalanceRulesetCandidate("reach-gate")).toEqual(
      BALANCE_RULESET_CANDIDATES.reach_gate,
    );
    expect(BALANCE_RULESET_CANDIDATES.luminary_relationship).toMatchObject({
      luminaryBaseEminence: "none",
      luminaryEligibility: "effective_bonuses",
      luminaryClaimLimitPerAction: null,
      luminaryContact: "exclusive",
    });
    expect(BALANCE_RULESET_CANDIDATES.luminary_artifact_eligibility).toMatchObject({
      luminaryBaseEminence: "none",
      luminaryEligibility: "artifact_bonuses",
      luminaryClaimLimitPerAction: 1,
      luminaryContact: "exclusive",
    });
    expect(BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact).toMatchObject({
      luminaryBaseEminence: "none",
      luminaryEligibility: "artifact_bonuses",
      luminaryClaimLimitPerAction: 1,
      luminaryContact: "nonexclusive",
    });
    expect(BALANCE_RULESET_CANDIDATES.integrated.luminaryContact).toBe("exclusive");

    const ruleset = experimentalRuleset("attachment-test", {
      encryptReward: "none",
    });
    setBalanceRuleset(state, ruleset);
    expect(getBalanceRuleset(state)).toEqual(ruleset);
    expect(JSON.parse(JSON.stringify(state))).not.toHaveProperty("balanceRuleset");

    setBalanceRuleset(state, null);
    expect(getBalanceRuleset(state)).toEqual(DEFAULT_BALANCE_RULESET);
  });

  it("limits explicitly configured Blueprint setups to the candidate slot count", () => {
    const players = [
      { id: "p1", name: "Player 1" },
      { id: "p2", name: "Player 2" },
    ];
    const blueprintSetups = {
      p1: {
        blueprintIds: [
          "bp_mantle_to_orbit_foundry",
          "bp_worldshield_covenant",
        ] as const,
      },
    };
    const oneSlot = initializeGame(players, 2, 15, "standard", {
      balanceRuleset: experimentalRuleset("one-blueprint", { blueprintSlots: 1 }),
      blueprintSetups: blueprintSetups as never,
    });
    const twoSlots = initializeGame(players, 2, 15, "standard", {
      balanceRuleset: DEFAULT_BALANCE_RULESET,
      blueprintSetups: blueprintSetups as never,
    });

    expect(oneSlot.players[0].blueprintPrivateStates).toHaveLength(1);
    expect(twoSlots.players[0].blueprintPrivateStates).toHaveLength(2);
  });

  it.each([
    { target: 15, tierThree: 0, closes: true },
    { target: 20, tierThree: 0, closes: false },
    { target: 20, tierThree: 1, closes: true },
    { target: 24, tierThree: 1, closes: true },
    { target: 25, tierThree: 1, closes: false },
    { target: 25, tierThree: 2, closes: true },
  ])(
    "requires $tierThree Tier III implementation(s) at a $target-Eminence Reach gate",
    ({ target, tierThree, closes }) => {
      const state = makeGame();
      state.activeLuminaries = [];
      state.victoryRequirement = target;
      state.players[0].eminence = target;
      state.players[0].forgedArtifactIds = ["t3r01", "t3s01"].slice(0, tierThree);
      setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.reach_gate);

      pass(state);

      expect(state.phase).toBe(closes ? "last_round" : "playing");
    },
  );

  it("keeps Reach mastery after a Tier III implementation leaves the current tableau", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    state.victoryRequirement = 20;
    state.players[0].eminence = 20;
    state.players[0].forgedArtifactIds = [];
    state.players[0].artifactForgeCounts = { t3r01: 1 };
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.reach_gate);

    pass(state);

    expect(state.phase).toBe("last_round");
  });

  it("restricts a Reach-gated score ending to civilizations that satisfy both gates", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    state.victoryRequirement = 20;
    state.players[0].eminence = 20;
    state.players[0].forgedArtifactIds = ["t3r01"];
    state.players[1].eminence = 25;
    state.players[1].forgedArtifactIds = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.reach_gate);

    pass(state); // p1 triggers the equal-turn closing round.
    pass(state); // p2 receives its equal turn, but still lacks Tier III Reach.

    expect(state.phase).toBe("finished");
    expect(state.finishReason).toBe("win");
    expect(state.winnerId).toBe("p1");
  });

  it("still ranks every civilization when a Reach-gated game ends by frontier exhaustion", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    state.victoryRequirement = 20;
    state.players[0].eminence = 20;
    state.players[0].forgedArtifactIds = ["t3r01"];
    state.players[1].eminence = 25;
    state.players[1].forgedArtifactIds = [];
    emptyForgeAndArchives(state);
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.reach_gate);

    pass(state);
    pass(state);

    expect(state.phase).toBe("finished");
    expect(state.finishReason).toBe("frontier_exhaustion");
    expect(state.winnerId).toBe("p2");
  });

  it("forms a Luminary relationship without awarding printed base Eminence", () => {
    const state = makeGame();
    state.activeLuminaries = ["lum_verdant"];
    state.players[0].bonuses.verdance = 5;
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.luminary_relationship);

    const result = applyAction(state, "p1", {
      type: "harness_three_affinities",
      affinities: { flare: 1, continuum: 1, radiance: 1 },
    });

    expect(result.success).toBe(true);
    expect(state.players[0].luminaries).toContain("lum_verdant");
    expect(state.players[0].eminence).toBe(0);
  });

  it("can exclude Fixed Bonds from Luminary eligibility", () => {
    const prepare = (eligibility: BalanceRuleset["luminaryEligibility"]) => {
      const state = makeGame();
      state.activeLuminaries = ["lum_moth"];
      state.turnCount = 2;
      state.players[0].bonuses.flare = 5;
      state.players[0].luminaries = ["lum_tide"];
      state.luminaryAffinities = [{
        luminaryId: "lum_tide",
        ownerId: "p1",
        activeAffinity: "flare",
        eligibleAffinities: ["flare"],
        summonedAtTurnCount: 0,
      }];
      setBalanceRuleset(state, experimentalRuleset(`eligibility-${eligibility}`, {
        luminaryEligibility: eligibility,
      }));
      const result = applyAction(state, "p1", {
        type: "harness_three_affinities",
        affinities: { continuum: 1, verdance: 1, abyss: 1 },
      });
      expect(result.success).toBe(true);
      return state;
    };

    expect(prepare("effective_bonuses").players[0].luminaries).toContain("lum_moth");
    expect(prepare("artifact_bonuses").players[0].luminaries).not.toContain("lum_moth");
  });

  it("resolves only the selected Luminary and leaves other candidates available", () => {
    const state = makeGame();
    state.activeLuminaries = ["lum_moth", "lum_tide"];
    state.players[0].bonuses.flare = 6;
    state.players[0].bonuses.continuum = 6;
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.luminary_artifact_eligibility);

    expect(applyAction(state, "p1", {
      type: "harness_three_affinities",
      affinities: { verdance: 1, abyss: 1, radiance: 1 },
    }).success).toBe(true);
    expect(state.pendingLuminaryChoice?.candidates).toEqual(["lum_moth", "lum_tide"]);

    const choice = applyAction(state, "p1", {
      type: "choose_luminary_order",
      orderedIds: ["lum_tide"],
    });

    expect(choice.success).toBe(true);
    expect(state.players[0].luminaries).toEqual(["lum_tide"]);
    expect(state.activeLuminaries).toContain("lum_moth");
  });

  it("registers nonexclusive relationships without replaying the first contact effect", () => {
    const state = makeGame();
    state.currentPlayerIndex = 1;
    state.activeLuminaries = ["lum_verdant"];
    state.players[0].luminaries = ["lum_verdant"];
    state.players[1].bonuses.verdance = 5;
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);

    const result = applyAction(state, "p2", {
      type: "harness_three_affinities",
      affinities: { flare: 1, continuum: 1, abyss: 1 },
    });

    expect(result.success).toBe(true);
    expect(state.players[1].luminaries).toContain("lum_verdant");
    expect(state.players[1].eminence).toBe(0);
    expect(state.players[1].affinities.verdance).toBe(0);
    expect(state.luminaryAffinities).toContainEqual(expect.objectContaining({
      luminaryId: "lum_verdant",
      ownerId: "p2",
    }));
    expect(state.activeLuminaries).not.toContain("lum_verdant");
    expect(state.experimentalBalanceState?.contactedLuminaryIds).toContain("lum_verdant");
  });

  it("tracks nonexclusive Concordance milestones independently by civilization", () => {
    const radianceArtifactIds = [...CARD_MAP.values()]
      .filter((card) => card.bonusAffinity === "radiance")
      .slice(0, 8)
      .map((card) => card.id);
    expect(radianceArtifactIds).toHaveLength(8);

    const state = makeGame();
    state.activeLuminaries = [];
    state.players[0].luminaries = ["lum_radiant"];
    state.players[1].luminaries = ["lum_radiant"];
    state.players[0].forgedArtifactIds = [...radianceArtifactIds];
    state.players[1].forgedArtifactIds = [...radianceArtifactIds];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);

    const p1Before = state.players[0].eminence;
    pass(state);
    expect(state.players[0].eminence).toBe(p1Before + 2);
    expect(
      state.experimentalBalanceState?.luminaryOwnerStateByPlayerId?.p1
        ?.concordanceMandalaTriggered,
    ).toBe(true);
    expect(
      state.experimentalBalanceState?.luminaryOwnerStateByPlayerId?.p2
        ?.concordanceMandalaTriggered,
    ).not.toBe(true);

    state.pendingLuminaryActivationEvents = [];
    state.pendingTurnTransition = null;
    state.coreActionUsed = false;
    state.currentPlayerIndex = 1;
    const p2Before = state.players[1].eminence;
    pass(state);
    expect(state.players[1].eminence).toBe(p2Before + 2);
    expect(
      state.experimentalBalanceState?.luminaryOwnerStateByPlayerId?.p2
        ?.concordanceMandalaTriggered,
    ).toBe(true);
    expect(state.concordanceMandalaTriggered).toBe(false);
  });

  it("keeps nonexclusive Bloom counters and Ember attribution owner-relative", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    state.currentPlayerIndex = 1;
    state.players[0].luminaries = ["lum_bloom"];
    state.players[1].luminaries = ["lum_bloom", "lum_ember"];
    state.luminaryAffinities = [{
      luminaryId: "lum_ember",
      ownerId: "p2",
      activeAffinity: "flare",
      eligibleAffinities: ["flare"],
      summonedAtTurnCount: -1,
    }];
    const condemnedId = state.forgeTier1[0]!;
    state.artifactMarkers = {
      [condemnedId]: {
        type: "condemned",
        ownerId: "p2",
        summonedAtTurnCount: -1,
      },
    };
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);

    pass(state);

    expect(state.burnEvents).toContainEqual(expect.objectContaining({
      cardId: condemnedId,
      ownerPlayerId: "p2",
      triggeredByPlayerId: "p2",
    }));
    expect(
      state.experimentalBalanceState?.luminaryOwnerStateByPlayerId?.p1
        ?.catalystBloomBurnCount,
    ).toBe(1);
    expect(
      state.experimentalBalanceState?.luminaryOwnerStateByPlayerId?.p2
        ?.catalystBloomBurnCount,
    ).toBe(1);
    expect(state.catalystBloomBurnCount).toBe(0);
  });

  it("allows each nonexclusive Glass Orchard owner one replication", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    state.currentPlayerIndex = 1;
    state.players[0].luminaries = ["lum_orchard"];
    state.players[1].luminaries = ["lum_orchard"];
    enrichPlayer(state, 1);
    const target = [...CARD_MAP.values()].find(
      (card) => card.tier === 1 && (card.cost.verdance > 0 || card.cost.radiance > 0),
    )!;
    state.forgeTier1[0] = target.id;
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);
    state.experimentalBalanceState = {
      rulesetId: "luminary_nonexclusive_contact",
      luminaryOwnerStateByPlayerId: {
        p1: { glassOrchardTriggered: true },
      },
    };

    const before = state.players[1].bonuses[target.bonusAffinity];
    expect(applyAction(state, "p2", { type: "forge_artifact", cardId: target.id }).success).toBe(true);

    expect(state.players[1].bonuses[target.bonusAffinity]).toBe(before + 2);
    expect(
      state.experimentalBalanceState.luminaryOwnerStateByPlayerId?.p2
        ?.glassOrchardTriggered,
    ).toBe(true);
    expect(state.experimentalBalanceState.luminaryOwnerStateByPlayerId?.p1
      ?.glassOrchardTriggered).toBe(true);
    expect(state.glassOrchardTriggered).toBe(false);
  });

  it("grants later Tide and Hunger relationships their per-civilization entitlements", () => {
    const tideState = makeGame();
    tideState.activeLuminaries = ["lum_tide"];
    tideState.currentPlayerIndex = 1;
    tideState.players[0].luminaries = ["lum_tide"];
    tideState.players[1].bonuses.continuum = 6;
    setBalanceRuleset(tideState, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);

    expect(applyAction(tideState, "p2", {
      type: "harness_three_affinities",
      affinities: { flare: 1, continuum: 1, verdance: 1 },
    }).success).toBe(true);
    expect(tideState.players[1].tideArchiveForgeAvailable).toBe(true);

    const hungerState = makeGame();
    hungerState.activeLuminaries = ["lum_hunger"];
    hungerState.currentPlayerIndex = 1;
    hungerState.players[0].luminaries = ["lum_hunger"];
    hungerState.players[1].bonuses.flare = 3;
    hungerState.players[1].bonuses.verdance = 3;
    hungerState.players[1].bonuses.radiance = 3;
    setBalanceRuleset(hungerState, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);

    expect(applyAction(hungerState, "p2", {
      type: "harness_three_affinities",
      affinities: { continuum: 1, verdance: 1, abyss: 1 },
    }).success).toBe(true);
    expect(
      hungerState.experimentalBalanceState?.luminaryOwnerStateByPlayerId?.p2
        ?.firstHungerAvailable,
    ).toBe(true);

    hungerState.pendingSummonEvents = [];
    hungerState.pendingTurnTransition = null;
    hungerState.coreActionUsed = false;
    hungerState.currentPlayerIndex = 1;
    hungerState.players[1].bonuses = {
      flare: 0,
      continuum: 0,
      verdance: 0,
      abyss: 0,
      radiance: 0,
      singularity: 0,
    };
    const targetId = hungerState.forgeTier1[0]!;
    expect(chooseAiAction(hungerState, "p2", "hard")).toMatchObject({
      type: "assimilate",
    });
    expect(applyAction(hungerState, "p2", { type: "assimilate", cardId: targetId }).success).toBe(true);
    expect(
      hungerState.experimentalBalanceState?.luminaryOwnerStateByPlayerId?.p2
        ?.firstHungerAvailable,
    ).not.toBe(true);
  });

  it("shares persistent Seed benefits across nonexclusive allies", () => {
    const state = initializeGame([
      { id: "p1", name: "One" },
      { id: "p2", name: "Two" },
      { id: "p3", name: "Three" },
    ], 3);
    state.currentPlayerIndex = 2;
    state.activeLuminaries = [];
    state.players[0].luminaries = ["lum_seed"];
    state.players[1].luminaries = ["lum_seed"];
    enrichPlayer(state, 2);
    const targetId = state.forgeTier1[0]!;
    const target = CARD_MAP.get(targetId)!;
    state.artifactMarkers = {
      [targetId]: {
        type: "avatar_seed",
        ownerId: "p1",
        summonedAtTurnCount: 0,
      },
    };
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);
    const p1Before = state.players[0].bonuses[target.bonusAffinity];
    const p2Before = state.players[1].bonuses[target.bonusAffinity];

    expect(applyAction(state, "p3", { type: "forge_artifact", cardId: targetId }).success).toBe(true);

    expect(state.players[0].bonuses[target.bonusAffinity]).toBe(p1Before + 1);
    expect(state.players[1].bonuses[target.bonusAffinity]).toBe(p2Before + 1);
    expect(state.pendingLuminaryActivationEvents.filter(
      (event) => event.luminaryId === "lum_seed" && event.effectType === "action",
    )).toHaveLength(2);
  });

  it("treats later Compass and Null relationships as allied for persistent exemptions", () => {
    const compassState = makeGame();
    compassState.currentPlayerIndex = 1;
    compassState.activeLuminaries = [];
    compassState.players[0].luminaries = ["lum_compass"];
    compassState.players[1].luminaries = ["lum_compass"];
    compassState.forgottenHourCycle = {
      p1: { lastAppliedTurnCount: 0, cooldownOwnerTurnsRemaining: null },
    };
    setBalanceRuleset(compassState, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);
    expect(applyAction(compassState, "p2", {
      type: "reserve_artifact",
      cardId: compassState.forgeTier1[0]!,
    }).success).toBe(true);

    const nullState = makeGame();
    nullState.currentPlayerIndex = 1;
    nullState.activeLuminaries = [];
    nullState.players[0].luminaries = ["lum_null"];
    nullState.players[1].luminaries = ["lum_null"];
    enrichPlayer(nullState, 1);
    const nullifiedId = nullState.forgeTier1[0]!;
    const nullifiedCard = CARD_MAP.get(nullifiedId)!;
    nullState.artifactMarkers = {
      [nullifiedId]: {
        type: "nullified",
        ownerId: "p1",
        summonedAtTurnCount: 0,
      },
    };
    setBalanceRuleset(nullState, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);
    const eminenceBefore = nullState.players[1].eminence;

    expect(applyAction(nullState, "p2", {
      type: "forge_artifact",
      cardId: nullifiedId,
    }).success).toBe(true);
    expect(nullState.nullifiedFirstForge).toEqual({
      cardId: nullifiedId,
      playerId: "p2",
      exempt: true,
    });
    expect(nullState.players[1].eminence).toBe(eminenceBefore + nullifiedCard.eminence);
  });

  it("preserves owner-relative Luminary state across a JSON/database round-trip", () => {
    const state = makeGame();
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);
    state.experimentalBalanceState = {
      rulesetId: "luminary_nonexclusive_contact",
      contactedLuminaryIds: ["lum_radiant"],
      luminaryOwnerStateByPlayerId: {
        p1: {
          concordanceMandalaTriggered: true,
          catalystBloomBurnCount: 2,
          glassOrchardTriggered: true,
          firstHungerAvailable: true,
        },
      },
    };

    const resumed = normalizeState(JSON.parse(JSON.stringify(state)));
    setBalanceRuleset(resumed, BALANCE_RULESET_CANDIDATES.luminary_nonexclusive_contact);

    expect(resumed.experimentalBalanceState).toEqual({
      rulesetId: "luminary_nonexclusive_contact",
      contactedLuminaryIds: ["lum_radiant"],
      luminaryOwnerStateByPlayerId: {
        p1: {
          concordanceMandalaTriggered: true,
          catalystBloomBurnCount: 2,
          glassOrchardTriggered: true,
          firstHungerAvailable: true,
        },
      },
    });
  });

  it.each(["visible", "blind"] as const)(
    "binds Focus to a %s encrypted Artifact across a JSON round-trip",
    (source) => {
      const state = makeGame();
      state.activeLuminaries = [];
      const ruleset = BALANCE_RULESET_CANDIDATES.focus;
      setBalanceRuleset(state, ruleset);
      const cardId = source === "visible" ? state.forgeTier1[0]! : state.deckTier1[0]!;
      const card = CARD_MAP.get(cardId)!;
      for (const affinity of NATURAL_AFFINITY_KEYS) {
        state.players[0].bonuses[affinity] = card.cost[affinity];
      }
      const focusedAffinity = NATURAL_AFFINITY_KEYS.find(
        (affinity) => card.cost[affinity] > 0,
      )!;
      state.players[0].bonuses[focusedAffinity]--;
      const singularityBefore = state.affinityWell.singularity;

      const encrypted = source === "visible"
        ? applyAction(state, "p1", { type: "reserve_artifact", cardId })
        : applyAction(state, "p1", { type: "reserve_artifact", tier: 1 });
      expect(encrypted.success).toBe(true);
      expect(state.players[0].affinities.singularity).toBe(0);
      expect(state.affinityWell.singularity).toBe(singularityBefore);
      expect(formatGameState(
        "balance-room",
        "playing",
        state,
        new Set(["p1", "p2"]),
      )).not.toHaveProperty("experimentalBalanceState");

      const resumed = normalizeState(JSON.parse(JSON.stringify(state)));
      setBalanceRuleset(resumed, ruleset);
      pass(resumed); // p2 -> p1
      const forged = applyAction(resumed, "p1", {
        type: "forge_reserved_artifact",
        cardId,
      });

      expect(forged.success).toBe(true);
      expect(resumed.players[0].forgedArtifactIds).toContain(cardId);
      expect(
        resumed.experimentalBalanceState?.focusedReservationIdsByPlayerId?.p1,
      ).toBeUndefined();
    },
  );

  it("requires a valid Focus target when multiple discounted printed requirements remain", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.focus);
    const cardId = "t1r01";
    const card = CARD_MAP.get(cardId)!;
    const player = state.players[0]!;
    state.forgeTier1 = state.forgeTier1.filter((id) => id !== cardId);
    state.deckTier1 = state.deckTier1.filter((id) => id !== cardId);
    player.reservedArtifactIds = [cardId];
    state.experimentalBalanceState!.focusedReservationIdsByPlayerId = { p1: [cardId] };
    enrichPlayer(state, 0);
    player.affinities.singularity = 0;
    // Radiance is printed on the Artifact, but an ordinary permanent discount
    // has already reduced that component to zero before Focus is applied.
    player.bonuses.radiance = card.cost.radiance;

    expect(applyAction(state, "p1", {
      type: "forge_reserved_artifact",
      cardId,
    })).toEqual({
      success: false,
      error: "Choose which natural Artifact requirement Focus reduces",
    });
    expect(applyAction(state, "p1", {
      type: "forge_reserved_artifact",
      cardId,
      affinity: "radiance",
    })).toEqual({
      success: false,
      error: "Focus must target a remaining natural Artifact requirement",
    });
    expect(state.experimentalBalanceState?.focusedReservationIdsByPlayerId?.p1).toEqual([cardId]);

    const heldBefore = { ...player.affinities };
    const forged = applyAction(state, "p1", {
      type: "forge_reserved_artifact",
      cardId,
      affinity: "verdance",
    });

    expect(forged.success).toBe(true);
    expect(player.affinities.verdance).toBe(heldBefore.verdance);
    expect(player.affinities.abyss).toBe(heldBefore.abyss - card.cost.abyss);
    expect(player.affinities.radiance).toBe(heldBefore.radiance);
    expect(state.experimentalBalanceState?.focusedReservationIdsByPlayerId?.p1).toBeUndefined();
  });

  it("auto-resolves a sole Focus target and consumes a no-op Focus harmlessly", () => {
    const prepareFocusedReserve = (leaveUnpaid: "verdance" | null) => {
      const state = makeGame();
      state.activeLuminaries = [];
      setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.focus);
      const cardId = "t1r01";
      const card = CARD_MAP.get(cardId)!;
      const player = state.players[0]!;
      state.forgeTier1 = state.forgeTier1.filter((id) => id !== cardId);
      state.deckTier1 = state.deckTier1.filter((id) => id !== cardId);
      player.reservedArtifactIds = [cardId];
      state.experimentalBalanceState!.focusedReservationIdsByPlayerId = { p1: [cardId] };
      for (const affinity of NATURAL_AFFINITY_KEYS) {
        player.bonuses[affinity] = card.cost[affinity];
        player.affinities[affinity] = 0;
      }
      if (leaveUnpaid) player.bonuses[leaveUnpaid]--;
      player.affinities.singularity = 0;
      return { state, cardId };
    };

    const sole = prepareFocusedReserve("verdance");
    expect(applyAction(sole.state, "p1", {
      type: "forge_reserved_artifact",
      cardId: sole.cardId,
    }).success).toBe(true);
    expect(sole.state.experimentalBalanceState?.focusedReservationIdsByPlayerId?.p1).toBeUndefined();

    const noOp = prepareFocusedReserve(null);
    expect(applyAction(noOp.state, "p1", {
      type: "forge_reserved_artifact",
      cardId: noOp.cardId,
    }).success).toBe(true);
    expect(noOp.state.experimentalBalanceState?.focusedReservationIdsByPlayerId?.p1).toBeUndefined();
  });

  it("preserves Focus during planned-action clone validation", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.focus);
    const cardId = state.forgeTier1[0]!;
    const card = CARD_MAP.get(cardId)!;
    for (const affinity of NATURAL_AFFINITY_KEYS) {
      state.players[0].bonuses[affinity] = card.cost[affinity];
    }
    const focusedAffinity = NATURAL_AFFINITY_KEYS.find(
      (affinity) => card.cost[affinity] > 0,
    )!;
    state.players[0].bonuses[focusedAffinity]--;
    expect(applyAction(state, "p1", { type: "reserve_artifact", cardId }).success).toBe(true);

    const planned = applyAction(state, "p1", {
      type: "plan_action",
      plannedActionData: { type: "forge_reserved_artifact", cardId },
    });

    expect(planned.success).toBe(true);
    expect(state.players[0].plannedAction).toEqual({
      type: "forge_reserved_artifact",
      cardId,
    });
  });

  it("destroys Focus when its Artifact leaves reserve without being Forged", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.focus);
    const cardId = state.forgeTier1[0]!;
    expect(applyAction(state, "p1", { type: "reserve_artifact", cardId }).success).toBe(true);
    expect(state.experimentalBalanceState?.focusedReservationIdsByPlayerId?.p1).toContain(cardId);

    state.players[0].reservedArtifactIds = [];
    pass(state);

    expect(state.experimentalBalanceState?.focusedReservationIdsByPlayerId?.p1).toBeUndefined();
  });

  it("gives Encrypt no resource or bound discount in the no-reward candidate", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.encrypt_none);
    const cardId = state.forgeTier1[0]!;
    const card = CARD_MAP.get(cardId)!;
    for (const affinity of NATURAL_AFFINITY_KEYS) {
      state.players[0].bonuses[affinity] = card.cost[affinity];
    }
    const unpaidAffinity = NATURAL_AFFINITY_KEYS.find(
      (affinity) => card.cost[affinity] > 0,
    )!;
    state.players[0].bonuses[unpaidAffinity]--;
    const singularityBefore = state.affinityWell.singularity;

    expect(applyAction(state, "p1", { type: "reserve_artifact", cardId }).success).toBe(true);
    expect(state.players[0].affinities.singularity).toBe(0);
    expect(state.affinityWell.singularity).toBe(singularityBefore);
    expect(state.experimentalBalanceState).toEqual({ rulesetId: "encrypt_none" });
    pass(state); // p2 -> p1
    expect(applyAction(state, "p1", {
      type: "forge_reserved_artifact",
      cardId,
    })).toEqual({ success: false, error: "Cannot afford this Artifact" });
  });

  it("does not require an overflow return when Encrypt awards Focus", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.focus);
    for (const affinity of NATURAL_AFFINITY_KEYS) state.players[0].affinities[affinity] = 2;
    const cardId = state.forgeTier1[0]!;

    const result = applyAction(state, "p1", { type: "reserve_artifact", cardId });

    expect(result.success).toBe(true);
    expect(Object.values(state.players[0].affinities).reduce((sum, value) => sum + value, 0)).toBe(10);
  });

  it("requires and auto-spends a held natural Affinity for a zero-cost advanced Forge", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.payment_floor);
    const cardId = "t2r01";
    const card = CARD_MAP.get(cardId)!;
    state.forgeTier2 = [cardId];
    state.deckTier2 = state.deckTier2.filter((id) => id !== cardId);
    for (const affinity of NATURAL_AFFINITY_KEYS) {
      state.players[0].bonuses[affinity] = card.cost[affinity];
    }
    state.players[0].affinities.singularity = 5;

    expect(applyAction(state, "p1", { type: "forge_artifact", cardId })).toEqual({
      success: false,
      error: "Cannot afford this Artifact",
    });

    const flareInWellBefore = state.affinityWell.flare;
    state.players[0].affinities.flare = 1;
    expect(applyAction(state, "p1", { type: "forge_artifact", cardId }).success).toBe(true);
    expect(state.players[0].affinities.flare).toBe(0);
    expect(state.affinityWell.flare).toBe(flareInWellBefore + 1);
    expect(state.players[0].affinities.singularity).toBe(5);
    expect(state.players[0].discountedForgeIds).not.toContain(cardId);
  });

  it("waives the advanced payment floor when a fully discounted Artifact has a Built On predecessor", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.lineage_floor);
    const cardId = "t2r01";
    const card = CARD_MAP.get(cardId)!;
    state.forgeTier2 = [cardId];
    state.deckTier2 = state.deckTier2.filter((id) => id !== cardId);
    state.players[0].forgedArtifactIds = ["t1s04"];
    for (const affinity of NATURAL_AFFINITY_KEYS) {
      state.players[0].bonuses[affinity] = card.cost[affinity];
    }

    const result = applyAction(state, "p1", { type: "forge_artifact", cardId });

    expect(result.success).toBe(true);
    expect(state.players[0].forgedArtifactIds).toContain(cardId);
    expect(state.players[0].discountedForgeIds).toContain(cardId);
  });

  it("waives the payment floor when Built On substitutes the last natural requirement", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.lineage_floor);
    const cardId = "t2r01";
    const card = CARD_MAP.get(cardId)!;
    state.forgeTier2 = [cardId];
    state.deckTier2 = state.deckTier2.filter((id) => id !== cardId);
    state.players[0].forgedArtifactIds = ["t1s04"];
    for (const affinity of NATURAL_AFFINITY_KEYS) {
      state.players[0].bonuses[affinity] = card.cost[affinity];
    }
    state.players[0].bonuses.continuum--;
    state.players[0].affinities.singularity = 5;

    const result = applyAction(state, "p1", { type: "forge_artifact", cardId });

    expect(result.success).toBe(true);
    expect(state.players[0].affinities.continuum).toBe(0);
    expect(state.players[0].affinities.singularity).toBe(5);
    expect(state.players[0].discountedForgeIds).toContain(cardId);
  });

  it("applies the natural-only payment floor to an ordinary reserved Tier II Forge", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.payment_floor);
    const cardId = "t2r01";
    const card = CARD_MAP.get(cardId)!;
    state.players[0].reservedArtifactIds = [cardId];
    for (const affinity of NATURAL_AFFINITY_KEYS) {
      state.players[0].bonuses[affinity] = card.cost[affinity];
    }
    state.players[0].affinities.singularity = 5;

    expect(applyAction(state, "p1", {
      type: "forge_reserved_artifact",
      cardId,
    })).toEqual({ success: false, error: "Cannot afford this Artifact" });

    state.players[0].affinities.verdance = 1;
    expect(applyAction(state, "p1", {
      type: "forge_reserved_artifact",
      cardId,
    }).success).toBe(true);
    expect(state.players[0].affinities.verdance).toBe(0);
    expect(state.players[0].affinities.singularity).toBe(5);
  });

  it("does not apply the advanced payment floor to Tier I Artifacts", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    setBalanceRuleset(state, BALANCE_RULESET_CANDIDATES.payment_floor);
    const cardId = state.forgeTier1[0]!;
    const card = CARD_MAP.get(cardId)!;
    for (const affinity of NATURAL_AFFINITY_KEYS) {
      state.players[0].bonuses[affinity] = card.cost[affinity];
    }

    expect(applyAction(state, "p1", { type: "forge_artifact", cardId }).success).toBe(true);
    expect(state.players[0].discountedForgeIds).toContain(cardId);
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

  it("projects the reserved Lumii avatar for passive AI only", () => {
    const state = makeGame();
    const formatted = formatGameState(
      "room-test",
      "playing",
      state,
      new Set(["p1", "p2"]),
      new Map([
        ["p1", "stargazer"],
        ["p2", "oracle"],
      ]),
      new Map([
        ["p1", { isAi: false, aiDifficulty: null }],
        ["p2", { isAi: true, aiDifficulty: "passive" }],
      ]),
    );

    expect(formatted.players.find(player => player.playerId === "p1")?.avatarId).toBe("stargazer");
    expect(formatted.players.find(player => player.playerId === "p2")?.avatarId).toBe(GUIDED_LUMII_AVATAR_ID);
  });
});

// ─── Normalisation ────────────────────────────────────────────────────────────

describe("normalizeState — v0.8 field defaults", () => {
  it("normalizes legacy finished games and projects scenario finish metadata", () => {
    const state = makeGame();
    state.phase = "finished";
    state.finishReason = "withdrawal";
    const formatted = formatGameState(
      "room-test",
      "finished",
      state,
      new Set(),
      undefined,
      undefined,
      "blueprint_clearance_lumii",
    );

    expect(formatted.scenarioId).toBe("blueprint_clearance_lumii");
    expect(formatted.finishReason).toBe("withdrawal");
    expect(formatted.lumiiThresholdApproach).toBe("inquiry");

    state.lumiiThresholdApproach = "dominion";
    expect(formatGameState(
      "room-test",
      "finished",
      state,
      new Set(),
      undefined,
      undefined,
      "blueprint_clearance_lumii",
    ).lumiiThresholdApproach).toBe("dominion");

    const legacy = { ...state } as GameStateData;
    delete legacy.finishReason;
    expect(normalizeState(legacy as unknown as Record<string, unknown>).finishReason).toBe("win");

    const exhausted = { ...state, finishReason: "frontier_exhaustion" as const };
    const normalizedExhausted = normalizeState(exhausted);
    expect(normalizedExhausted.finishReason).toBe("frontier_exhaustion");
    expect(formatGameState(
      "room-test",
      "finished",
      normalizedExhausted,
      new Set(),
    ).finishReason).toBe("frontier_exhaustion");
  });
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
    expect(state.concordanceMandalaFinalTriggered).toBe(false);
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

  it("clears legacy Void Seal ownership during normalization", () => {
    const state = makeGame();
    state.players[0]!.luminaries.push("lum_void");
    state.voidSealOwnerId = "p1";

    normalizeState(state);
    expect(state.voidSealOwnerId).toBeNull();
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

  it("recovers usage counts from legacy player arrays when absent", () => {
    const state = makeGame();
    const player = state.players[0];
    player.forgedArtifactIds = ["t1r01", "t1r01", "t2p02"];
    player.luminaries = ["lum_tide", "lum_void"];
    delete player.artifactForgeCounts;
    delete player.luminaryAllianceCounts;

    normalizeState(state);

    expect(state.players[0].artifactForgeCounts).toEqual({ t1r01: 2, t2p02: 1 });
    expect(state.players[0].luminaryAllianceCounts).toEqual({ lum_tide: 1, lum_void: 1 });
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
        affinities: { flare: 1, continuum: 1, verdance: 1 },
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
    const earlyBloomEvent = state.pendingLuminaryActivationEvents[0]!;

    expect(state.pendingTurnTransition?.stage).toBe("after_action");
    expect(state.catalystBloomBurnCount).toBe(2);
    expect(earlyBloomEvent).toMatchObject({
      luminaryId: "lum_verdant",
      effectType: "summon",
      affinityType: "verdance",
    });

    expect(applyAction(state, "p1", {
      type: "resolve_summon",
      eventId: summonEvent.eventId,
    }).success).toBe(true);

    expect(state.pendingTurnTransition?.stage).toBe("after_action");
    expect(state.catalystBloomBurnCount).toBe(2);

    expect(applyAction(state, "p1", {
      type: "resolve_luminary_activation",
      eventId: earlyBloomEvent.eventId,
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

describe("Verdant Oracle — Early Bloom", () => {
  it("takes one Verdance token from the Well on arrival", () => {
    const state = makeGame();
    const player = state.players[0];

    claimLuminary(state, "lum_verdant", (preparedState) => {
      for (const affinity of STANDARD_AFFINITY_KEYS) {
        player.affinities[affinity] = 1;
      }
      player.affinities.singularity = 4;
      preparedState.affinityWell.verdance = 4;
    });

    expect(player.affinities.verdance).toBe(2);
    expect(state.affinityWell.verdance).toBe(3);
    expect(state.pendingLuminaryActivationEvents).toContainEqual(
      expect.objectContaining({
        luminaryId: "lum_verdant",
        effectType: "summon",
        triggeringPlayerId: player.playerId,
        affinityType: "verdance",
        affinityAmount: 1,
      }),
    );
    expect(state.actionLog.some((entry) => entry.summary.includes("gained 1 Verdance"))).toBe(true);
  });

  it("resolves without creating a token when the Verdance supply is empty", () => {
    const state = makeGame();
    const player = state.players[0];

    claimLuminary(state, "lum_verdant", (preparedState) => {
      for (const affinity of STANDARD_AFFINITY_KEYS) {
        player.affinities[affinity] = 1;
      }
      player.affinities.singularity = 4;
      preparedState.affinityWell.verdance = 0;
    });

    expect(state.affinityWell.verdance).toBe(0);
    expect(state.pendingLuminaryActivationEvents).toContainEqual(
      expect.objectContaining({
        luminaryId: "lum_verdant",
        effectType: "summon",
        affinityType: "verdance",
        affinityAmount: 0,
      }),
    );
    expect(state.actionLog.some((entry) => entry.summary.includes("no token gained"))).toBe(true);
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
      [cardId]: { type: "nullified", ownerId: "p2", summonedAtTurnCount: 0 },
    };
    const eminenceBefore = state.players[0].eminence;
    const r = applyAction(state, "p1", { type: "forge_artifact", cardId });
    expect(r.success).toBe(true);
    expect(state.players[0].eminence).toBe(eminenceBefore);
    expect(state.players[0].blueprintBlockedCardIds).toContain(cardId);
    expect(state.nullifiedFirstForge).toEqual({ cardId, playerId: "p1", exempt: false });
  });

  it("the allied player ignores Nullified on the first Nullified Artifact forged in the game", () => {
    const cardId = state.forgeTier3.find((id) => (CARD_MAP.get(id)?.eminence ?? 0) > 0);
    if (!cardId) return;
    const printedEminence = CARD_MAP.get(cardId)!.eminence;
    state.artifactMarkers = {
      [cardId]: { type: "nullified", ownerId: "p1", summonedAtTurnCount: 0 },
    };

    const eminenceBefore = state.players[0].eminence;
    const result = applyAction(state, "p1", { type: "forge_artifact", cardId });

    expect(result.success).toBe(true);
    expect(state.players[0].eminence).toBe(eminenceBefore + printedEminence);
    expect(state.players[0].blueprintBlockedCardIds).not.toContain(cardId);
    expect(state.nullifiedFirstForge).toEqual({ cardId, playerId: "p1", exempt: true });
  });

  it("does not exempt a later allied forge after the first Nullified forge was consumed", () => {
    const cardId = state.forgeTier3.find((id) => (CARD_MAP.get(id)?.eminence ?? 0) > 0);
    if (!cardId) return;
    state.nullifiedFirstForge = { cardId: "earlier-card", playerId: "p2", exempt: false };
    state.artifactMarkers = {
      [cardId]: { type: "nullified", ownerId: "p1", summonedAtTurnCount: 0 },
    };

    const eminenceBefore = state.players[0].eminence;
    const result = applyAction(state, "p1", { type: "forge_artifact", cardId });

    expect(result.success).toBe(true);
    expect(state.players[0].eminence).toBe(eminenceBefore);
    expect(state.players[0].blueprintBlockedCardIds).toContain(cardId);
    expect(state.nullifiedFirstForge).toEqual({ cardId: "earlier-card", playerId: "p2", exempt: false });
  });

  it("prevents a face-up Nullified Artifact from being Encrypted", () => {
    const cardId = state.forgeTier3[0]!;
    state.artifactMarkers = {
      [cardId]: { type: "nullified", ownerId: "p2", summonedAtTurnCount: 0 },
    };
    state.affinityWell.singularity = 0;

    const result = applyAction(state, "p1", { type: "reserve_artifact", cardId });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Nullified Artifacts cannot be Encrypted");
    expect(state.forgeTier3).toContain(cardId);
    expect(state.players[0].reservedArtifactIds).not.toContain(cardId);
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

  it("Forgotten Hour blocks opponents from encrypting face-up and hidden Artifacts", () => {
    const cardId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.eminence ?? 0) > 0);
    if (!cardId) return;

    state.artifactMarkers = {
      [cardId]: { type: "forgotten", ownerId: "p2", summonedAtTurnCount: 0 },
    };
    state.affinityWell.singularity = 0;

    const reserveResult = applyAction(state, "p1", { type: "reserve_artifact", cardId });
    expect(reserveResult.success).toBe(false);
    expect(reserveResult.error).toBe("Cannot encrypt during The Forgotten Hour");

    state.artifactMarkers = {
      [cardId]: { type: "forgotten", ownerId: "p2", summonedAtTurnCount: 0 },
    };
    const blindReserveResult = applyAction(state, "p1", { type: "reserve_artifact", tier: 1 });
    expect(blindReserveResult.success).toBe(false);
    expect(blindReserveResult.error).toBe("Cannot encrypt during The Forgotten Hour");

    state.artifactMarkers = {};
    state.forgottenHourCycle = {
      p2: { lastAppliedTurnCount: state.turnCount, cooldownOwnerTurnsRemaining: null },
    };
    const cycleOnlyReserveResult = applyAction(state, "p1", { type: "reserve_artifact", cardId });
    expect(cycleOnlyReserveResult.success).toBe(false);
    expect(cycleOnlyReserveResult.error).toBe("Cannot encrypt during The Forgotten Hour");
  });

  it("allows the ally of ??? to Encrypt during their own Forgotten Hour", () => {
    const cardId = state.forgeTier1[0]!;
    state.artifactMarkers = {
      [cardId]: { type: "forgotten", ownerId: "p1", summonedAtTurnCount: 0 },
    };
    state.forgottenHourCycle = {
      p1: { lastAppliedTurnCount: state.turnCount, cooldownOwnerTurnsRemaining: null },
    };
    state.affinityWell.singularity = 0;

    const result = applyAction(state, "p1", { type: "reserve_artifact", cardId });

    expect(result.success).toBe(true);
    expect(state.players[0]!.reservedArtifactIds).toContain(cardId);
  });

  it("??? awards 1 native Eminence and raises the victory requirement with its Forgotten branding", () => {
    const player = state.players[0];
    const eminenceBefore = player.eminence;
    const victoryBefore = state.victoryRequirement ?? 15;
    const forgedEminence = CARD_MAP.get(state.forgeTier1[0]!)?.eminence ?? 0;

    claimLuminary(state, "lum_compass");

    expect(player.eminence).toBe(eminenceBefore + forgedEminence + 1);
    expect(state.victoryRequirement).toBe(victoryBefore + 1);
    const activation = state.pendingLuminaryActivationEvents.find(
      (event) => event.luminaryId === "lum_compass" && event.effectType === "summon",
    );
    expect(activation?.targetCardIds?.length).toBeGreaterThan(0);
    expect(activation).toMatchObject({
      victoryRequirementBefore: victoryBefore,
      victoryRequirementAfter: victoryBefore + 1,
      victoryRequirementChange: 1,
    });
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

// ─── Avatar Seeds ─────────────────────────────────────────────────────────────

describe("Seed Beyond Seasons — permanent Avatar Seed molds", () => {
  const marker = (ownerId = "p2") => ({
    type: "avatar_seed" as const,
    ownerId,
    summonedAtTurnCount: 0,
  });

  it("marks one random mold in every tier on arrival", () => {
    const state = makeGame();

    claimLuminary(state, "lum_seed");

    const moldSlots = state.avatarSeedState?.moldSlots ?? [];
    expect(moldSlots).toHaveLength(3);
    expect(new Set(moldSlots.map((slot) => Number(slot.split("-")[0])))).toEqual(
      new Set([1, 2, 3]),
    );
    for (const slot of moldSlots) {
      const [tierText, indexText] = slot.split("-");
      const tier = Number(tierText) as 1 | 2 | 3;
      const index = Number(indexText);
      const row = tier === 1 ? state.forgeTier1 : tier === 2 ? state.forgeTier2 : state.forgeTier3;
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(row.length);
    }
    expect(state.pendingLuminaryActivationEvents).toEqual([
      expect.objectContaining({
        luminaryId: "lum_seed",
        effectType: "summon",
        triggeringPlayerId: "p1",
        targetSlotIds: expect.arrayContaining(moldSlots),
      }),
    ]);
  });

  it("brands only unseeded Artifacts occupying Avatar Seed molds at end of turn", () => {
    const state = makeGame();
    state.avatarSeedState = {
      ownerId: "p2",
      summonedAtTurnCount: 0,
      moldSlots: ["1-0", "2-1", "3-2"],
    };
    const targetIds = [state.forgeTier1[0]!, state.forgeTier2[1]!, state.forgeTier3[2]!];

    pass(state);

    for (const cardId of targetIds) {
      expect(markerHasBrand(state.artifactMarkers?.[cardId], "avatar_seed", "p2")).toBe(true);
    }
    expect(state.pendingLuminaryActivationEvents).toContainEqual(
      expect.objectContaining({
        luminaryId: "lum_seed",
        effectType: "end_of_turn",
        triggeringPlayerId: "p2",
        targetCardIds: expect.arrayContaining(targetIds),
      }),
    );
  });

  it("does not queue a branding strike for empty molds or already Seeded Artifacts", () => {
    const state = makeGame();
    const tier2Card = state.forgeTier2[0]!;
    const tier3Card = state.forgeTier3[0]!;
    state.forgeTier1 = [];
    state.avatarSeedState = {
      ownerId: "p2",
      summonedAtTurnCount: 0,
      moldSlots: ["1-0", "2-0", "3-0"],
    };
    state.artifactMarkers = {
      [tier2Card]: marker(),
      [tier3Card]: marker(),
    };

    pass(state);

    expect(state.pendingLuminaryActivationEvents).not.toContainEqual(
      expect.objectContaining({ luminaryId: "lum_seed", effectType: "end_of_turn" }),
    );
  });

  it("grants the allied player the Seeded Artifact's matching permanent Affinity", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);
    state.activeLuminaries = [];
    state.affinityWell.singularity = 0;
    const seededCardId = state.forgeTier1[0]!;
    const seededCard = CARD_MAP.get(seededCardId)!;
    state.avatarSeedState = {
      ownerId: "p2",
      summonedAtTurnCount: 0,
      moldSlots: ["1-0", "2-0", "3-0"],
    };
    state.artifactMarkers = { [seededCardId]: marker() };
    const bonusBefore = state.players[1].bonuses[seededCard.bonusAffinity];

    const result = applyAction(state, "p1", { type: "forge_artifact", cardId: seededCardId });

    expect(result.success).toBe(true);
    expect(state.players[1].bonuses[seededCard.bonusAffinity]).toBe(bonusBefore + 1);
    expect(state.pendingLuminaryActivationEvents).toContainEqual(
      expect.objectContaining({
        luminaryId: "lum_seed",
        effectType: "action",
        triggeringPlayerId: "p2",
        targetCardIds: [seededCardId],
        targetSlotIds: ["1-0"],
        affinityType: seededCard.bonusAffinity,
        affinityAmount: 1,
      }),
    );
    const seedEventsBeforeResolution = state.pendingLuminaryActivationEvents.filter(
      (event) => event.luminaryId === "lum_seed",
    );
    expect(seedEventsBeforeResolution.map((event) => event.effectType)).toEqual(["action"]);

    const resolveResult = applyAction(state, "p1", {
      type: "resolve_luminary_activation",
      eventId: seedEventsBeforeResolution[0]!.eventId,
    });
    expect(resolveResult.success).toBe(true);
    expect(state.pendingLuminaryActivationEvents.filter(
      (event) => event.luminaryId === "lum_seed",
    ).map((event) => event.effectType)).toEqual(["end_of_turn"]);
    expect(state.avatarSeedState?.moldSlots).toEqual(["1-0", "2-0", "3-0"]);
  });

  it("does not grant an extra bonus when the allied player forges their own Seeded Artifact", () => {
    const state = makeGame();
    state.currentPlayerIndex = 1;
    enrichPlayer(state, 1);
    state.activeLuminaries = [];
    const seededCardId = state.forgeTier1[0]!;
    const seededCard = CARD_MAP.get(seededCardId)!;
    state.avatarSeedState = {
      ownerId: "p2",
      summonedAtTurnCount: 0,
      moldSlots: ["1-0", "2-0", "3-0"],
    };
    state.artifactMarkers = { [seededCardId]: marker() };
    const bonusBefore = state.players[1].bonuses[seededCard.bonusAffinity];

    const result = applyAction(state, "p2", { type: "forge_artifact", cardId: seededCardId });

    expect(result.success).toBe(true);
    expect(state.players[1].bonuses[seededCard.bonusAffinity]).toBe(bonusBefore + 1);
    expect(state.pendingLuminaryActivationEvents).not.toContainEqual(
      expect.objectContaining({ luminaryId: "lum_seed", effectType: "action" }),
    );
  });

  it("keeps the Seeded brand through reservation and imbues on an opponent's later forge", () => {
    const state = makeGame();
    enrichPlayer(state, 0);
    enrichPlayer(state, 1);
    state.activeLuminaries = [];
    state.affinityWell.singularity = 0;
    const seededCardId = state.forgeTier1[0]!;
    const seededCard = CARD_MAP.get(seededCardId)!;
    state.avatarSeedState = {
      ownerId: "p2",
      summonedAtTurnCount: 0,
      moldSlots: ["1-1", "2-1", "3-1"],
    };
    state.artifactMarkers = { [seededCardId]: marker() };

    expect(applyAction(state, "p1", { type: "reserve_artifact", cardId: seededCardId }).success).toBe(true);
    expect(markerHasBrand(state.artifactMarkers?.[seededCardId], "avatar_seed", "p2")).toBe(true);

    resolveLuminaryPresentation(state);
    state.currentPlayerIndex = 0;
    state.coreActionUsed = false;
    const bonusBefore = state.players[1].bonuses[seededCard.bonusAffinity];
    expect(applyAction(state, "p1", { type: "forge_reserved_artifact", cardId: seededCardId }).success).toBe(true);
    expect(state.players[1].bonuses[seededCard.bonusAffinity]).toBe(bonusBefore + 1);
    expect(state.artifactMarkers?.[seededCardId]).toBeUndefined();
  });

  it("migrates legacy Seed state to one deterministic valid mold per tier", () => {
    const legacy = makeGame() as unknown as Record<string, unknown>;
    legacy.avatarSeedState = {
      ownerId: "p1",
      summonedAtTurnCount: 4,
      pendingEminence: 3,
      deckSeeds: ["legacy-card"],
      payoutDone: false,
    };

    const normalized = normalizeState(legacy);

    expect(normalized.avatarSeedState?.moldSlots).toHaveLength(3);
    expect(normalized.avatarSeedState).not.toHaveProperty("pendingEminence");
    expect(normalized.avatarSeedState).not.toHaveProperty("deckSeeds");
    expect(normalized.avatarSeedState).not.toHaveProperty("payoutDone");
  });

  it("does not strand a legacy Seed save when Forge rows are missing", () => {
    const normalized = normalizeState({
      players: [],
      activeLuminaries: [],
      luminaryAffinities: [],
      pendingSummonEvents: [],
      avatarSeedState: {
        ownerId: "p1",
        summonedAtTurnCount: 4,
        moldSlots: ["1-0", "2-0", "3-0"],
      },
    });

    expect(normalized.avatarSeedState?.moldSlots).toEqual([]);
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

describe("Concordance Mandala — Perfect Coherence milestones", () => {
  const radianceArtifactIds = (count: number) => [...CARD_MAP.values()]
    .filter((card) => card.bonusAffinity === "radiance")
    .slice(0, count)
    .map((card) => card.id);

  it("awards 3 native Eminence", () => {
    expect(LUMINARY_MAP.get("lum_radiant")?.eminence).toBe(3);
  });

  it("grants +2 Eminence once at 8 Radiance Artifacts", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    state.players[0].forgedArtifactIds = radianceArtifactIds(8);

    const eminenceBefore = state.players[0].eminence;
    pass(state);
    expect(state.players[0].eminence).toBe(eminenceBefore + 2);
    expect(state.concordanceMandalaTriggered).toBe(true);
    expect(state.concordanceMandalaFinalTriggered).toBe(false);
  });

  it("grants the second +2 Eminence once at 10 Radiance Artifacts", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    state.concordanceMandalaTriggered = true;
    state.players[0].forgedArtifactIds = radianceArtifactIds(10);

    const eminenceBefore = state.players[0].eminence;
    pass(state);
    expect(state.players[0].eminence).toBe(eminenceBefore + 2);
    expect(state.concordanceMandalaFinalTriggered).toBe(true);
  });

  it("grants both milestones with distinct activation events when first checked at 10", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    state.players[0].forgedArtifactIds = radianceArtifactIds(10);

    const eminenceBefore = state.players[0].eminence;
    pass(state);

    expect(state.players[0].eminence).toBe(eminenceBefore + 4);
    expect(state.concordanceMandalaTriggered).toBe(true);
    expect(state.concordanceMandalaFinalTriggered).toBe(true);
    const activationIds = state.pendingLuminaryActivationEvents
      .filter((event) => event.luminaryId === "lum_radiant")
      .map((event) => event.eventId);
    expect(activationIds).toHaveLength(2);
    expect(new Set(activationIds).size).toBe(2);
  });

  it("does not fire either milestone again once both have triggered", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    state.concordanceMandalaTriggered = true;
    state.concordanceMandalaFinalTriggered = true;
    state.players[0].forgedArtifactIds = radianceArtifactIds(10);

    const eminenceBefore = state.players[0].eminence;
    pass(state);
    expect(state.players[0].eminence).toBe(eminenceBefore);
  });

  it("does not fire when fewer than 8 Radiance Artifacts", () => {
    const state = makeGame();
    state.players[0].luminaries = ["lum_radiant"];
    state.players[0].forgedArtifactIds = radianceArtifactIds(7);

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
    expect(state.pendingLuminaryActivationEvents).toContainEqual(
      expect.objectContaining({
        luminaryId: "lum_orchard",
        effectType: "action",
        triggeringPlayerId: "p1",
        targetCardIds: [card.id],
        affinityType: card.bonusAffinity,
        affinityAmount: 1,
      }),
    );
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

describe("Assimilation — Final Hunger one-time Forge replacement", () => {
  let state: GameStateData;

  beforeEach(() => {
    state = makeGame();
    enrichPlayer(state, 0);
    state.firstHungerAvailable = "p1";
  });

  it("removes the target from the Forge, grants its bonus Affinity, and grants no Eminence", () => {
    const targetId = [...state.forgeTier1, ...state.forgeTier2, ...state.forgeTier3][0];
    if (!targetId) return;
    const card = CARD_MAP.get(targetId)!;
    const eminenceBefore = state.players[0].eminence;
    const bonusBefore = state.players[0].bonuses[card.bonusAffinity];

    const r = applyAction(state, "p1", { type: "assimilate", cardId: targetId });
    expect(r.success).toBe(true);

    // Card must be gone from the Forge.
    expect(state.forgeTier1).not.toContain(targetId);
    expect(state.forgeTier2).not.toContain(targetId);
    expect(state.forgeTier3).not.toContain(targetId);

    expect(state.players[0].eminence).toBe(eminenceBefore);
    expect(state.players[0].bonuses[card.bonusAffinity]).toBe(bonusBefore + 1);

    // Assimilation consumed.
    expect(state.firstHungerAvailable).toBeNull();

    // Assimilated Artifacts are not added to forgedArtifactIds.
    expect(state.players[0].forgedArtifactIds).not.toContain(targetId);
    expect(state.players[0].assimilatedArtifactIds).toContain(targetId);
    expect(state.burnPile).not.toContain(targetId);
  });

  it("rejects assimilate when firstHungerAvailable is null", () => {
    state.firstHungerAvailable = null;
    const cardId = state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0)
      ?? state.forgeTier1[0]!;
    const r = applyAction(state, "p1", { type: "assimilate", cardId });
    expect(r.success).toBe(false);
  });

  it("allows any face-up Artifact regardless of its cost colors", () => {
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
    expect(r.success).toBe(true);
    expect(state.players[0].assimilatedArtifactIds).toContain(pureAbyss.id);
  });

  it("arrival sets flag but does not auto-execute the ability", () => {
    // The lum_hunger arrival handler sets firstHungerAvailable to the claimer's ID;
    // it must NOT queue an activation until the player explicitly uses it.
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
    expect(
      freshState.pendingLuminaryActivationEvents.some(event => event.luminaryId === "lum_hunger"),
    ).toBe(false);

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

  it("does not require the player to hold any Affinity", () => {
    const target = [...CARD_MAP.values()].find(
      (c) => c.tier === 1 && c.cost.flare > 0 && (c.cost.continuum > 0 || c.cost.abyss > 0),
    );
    if (!target) return; // skip if card catalog changes
    state.forgeTier1[0] = target.id;
    for (const affinity of STANDARD_AFFINITY_KEYS) {
      state.players[0].affinities[affinity] = 0;
    }
    state.players[0].affinities.singularity = 0;

    const r = applyAction(state, "p1", { type: "assimilate", cardId: target.id });
    expect(r.success).toBe(true);
  });

  it("does not move held Affinity or Affinity Well tokens", () => {
    const targetId = [...state.forgeTier1, ...state.forgeTier2, ...state.forgeTier3][0];
    if (!targetId) return;
    const affinitiesBefore = { ...state.players[0].affinities };
    const wellBefore = { ...state.affinityWell };

    const assimilated = applyAction(state, "p1", { type: "assimilate", cardId: targetId });

    expect(assimilated.success).toBe(true);
    expect(state.players[0].affinities).toEqual(affinitiesBefore);
    expect(state.affinityWell).toEqual(wellBefore);
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

    const secondCard =
      state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0) ??
      state.forgeTier1[0]!;
    const r2 = applyAction(state, "p1", { type: "assimilate", cardId: secondCard });
    expect(r2.success).toBe(false);
  });

  it("records Blueprint-only ownership and changes only the Artifact's bonus Affinity", () => {
    const targetId =
      state.forgeTier1.find((id) => (CARD_MAP.get(id)?.cost.flare ?? 0) > 0) ??
      state.forgeTier1[0]!;
    const bonusesBefore = { ...state.players[0].bonuses };
    const cardCountBefore = state.players[0].forgedArtifactIds.length;

    applyAction(state, "p1", { type: "assimilate", cardId: targetId });

    expect(state.players[0].forgedArtifactIds.length).toBe(cardCountBefore);
    expect(state.players[0].assimilatedArtifactIds).toContain(targetId);
    const targetAffinity = CARD_MAP.get(targetId)!.bonusAffinity;
    for (const c of STANDARD_AFFINITY_KEYS) {
      expect(state.players[0].bonuses[c]).toBe(
        bonusesBefore[c] + (c === targetAffinity ? 1 : 0),
      );
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

  it("counts a multi-card Cinder resolution as one Catalyst Bloom burn effect", () => {
    const state = makeGame();
    const condemnedIds = state.forgeTier1.slice(0, 2);
    expect(condemnedIds).toHaveLength(2);
    state.artifactMarkers = Object.fromEntries(condemnedIds.map((cardId) => [
      cardId,
      { type: "condemned" as const, ownerId: "p1", summonedAtTurnCount: 0 },
    ]));
    state.luminaryAffinities = [{
      luminaryId: "lum_ember",
      ownerId: "p1",
      activeAffinity: "flare",
      eligibleAffinities: ["flare"],
      summonedAtTurnCount: 0,
    }];
    state.players[0].luminaries = ["lum_ember"];
    state.players[1].luminaries = ["lum_bloom"];
    state.catalystBloomBurnCount = 0;
    state.turnCount = 0;

    pass(state);
    pass(state);
    pass(state);

    const remainingForgeIds = [
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ];
    for (const cardId of condemnedIds) {
      expect(remainingForgeIds).not.toContain(cardId);
    }
    expect(state.catalystBloomBurnCount).toBe(1);
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

describe("Worldshield Covenant hostile-effect protection", () => {
  function equipVigilantWorldshield(state: GameStateData, cardId: string) {
    const protectedPlayer = state.players[1]!;
    enrichPlayer(state, 1);
    protectedPlayer.manifestedBlueprintDevices = [{
      blueprintId: "bp_worldshield_covenant",
      ownerPlayerId: protectedPlayer.playerId,
      slotIndex: 0,
      state: "vigilant",
      covenantState: "intact",
      presentationVariant: "armored",
    }];
    protectedPlayer.plannedAction = { type: "forge_artifact", cardId };
    return protectedPlayer;
  }

  it("prevents Red Moth from Burning a legal planned claim", () => {
    const state = makeGame();
    const [targetCardId] = placeRuptureTargets(state, 1);
    const protectedPlayer = equipVigilantWorldshield(state, targetCardId!);

    claimLuminary(state, "lum_moth");

    expect(state.forgeTier3).toContain(targetCardId);
    expect(state.burnEvents.some((event) => event.cardId === targetCardId)).toBe(false);
    expect(protectedPlayer.manifestedBlueprintDevices?.[0]?.state).toBe("spent");
    expect(state.pendingBlueprintDetonationEvents).toContainEqual(
      expect.objectContaining({
        blueprintId: "bp_worldshield_covenant",
        targetCardId,
        hostileEffect: "burn",
      }),
    );
    const activation = state.pendingLuminaryActivationEvents.find(
      (event) => event.luminaryId === "lum_moth",
    );
    expect(activation?.targetCardIds ?? []).not.toContain(targetCardId);
  });

  it("prevents Null Sovereign from Nullifying a legal planned Tier III claim", () => {
    const state = makeGame();
    const targetCard = [...CARD_MAP.values()].find((card) =>
      card.tier === 3 && (
        card.cost.continuum === 0 ||
        card.cost.abyss === 0 ||
        card.cost.radiance === 0
      ),
    );
    expect(targetCard).toBeDefined();
    const targetCardId = targetCard!.id;
    if (!state.forgeTier3.includes(targetCardId)) {
      const displaced = state.forgeTier3[0];
      state.deckTier3 = state.deckTier3.filter((cardId) => cardId !== targetCardId);
      if (displaced) state.deckTier3.push(displaced);
      state.forgeTier3[0] = targetCardId;
    }
    const protectedPlayer = equipVigilantWorldshield(state, targetCardId);

    claimLuminary(state, "lum_null");

    expect(markerHasBrand(state.artifactMarkers?.[targetCardId], "nullified")).toBe(false);
    expect(protectedPlayer.manifestedBlueprintDevices?.[0]?.state).toBe("spent");
    expect(state.pendingBlueprintDetonationEvents).toContainEqual(
      expect.objectContaining({ targetCardId, hostileEffect: "nullification" }),
    );
  });

  it("keeps a legal planned claim in its slot during Iron Harbinger's reset", () => {
    const state = makeGame();
    const protectedSlot = 1;
    const targetCardId = state.forgeTier2[protectedSlot]!;
    const protectedPlayer = equipVigilantWorldshield(state, targetCardId);

    claimLuminary(state, "lum_forge");

    expect(state.forgeTier2[protectedSlot]).toBe(targetCardId);
    expect(protectedPlayer.manifestedBlueprintDevices?.[0]?.state).toBe("spent");
    expect(state.pendingBlueprintDetonationEvents).toContainEqual(
      expect.objectContaining({ targetCardId, hostileEffect: "claim_cancellation" }),
    );
    const activation = state.pendingLuminaryActivationEvents.find(
      (event) => event.luminaryId === "lum_forge",
    );
    expect(activation?.targetCardIds).not.toContain(targetCardId);
  });

  it("does not spend Worldshield when the affected Artifact has no legal planned claim", () => {
    const state = makeGame();
    const [targetCardId] = placeRuptureTargets(state, 1);
    const protectedPlayer = equipVigilantWorldshield(state, targetCardId!);
    protectedPlayer.plannedAction = null;

    claimLuminary(state, "lum_moth");

    expect(state.forgeTier3).not.toContain(targetCardId);
    expect(protectedPlayer.manifestedBlueprintDevices?.[0]?.state).toBe("vigilant");
    expect(state.pendingBlueprintDetonationEvents).toHaveLength(0);
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
      const originalTier3Ids: string[] = [...qualifying.map((card) => card.id), boundary.id];
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
    expect(state.pendingLuminaryActivationEvents).not.toContainEqual(
      expect.objectContaining({
        luminaryId: "lum_astral",
        effectType: "summon",
      }),
    );
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
    expect(recurrenceBurns.length).toBeGreaterThan(1);
    expect(state.catalystBloomBurnCount).toBe(1);
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
    expect(recoveryEvent?.targetSlotIds).toEqual(["1-0"]);
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

describe("Observer Effect (lum_tide) — Archive sight and one-use Forge", () => {
  it("grants one Archive-top Forge without reordering an Archive or prompting on arrival", () => {
    const state = makeGame();
    const tier2Before = [...state.deckTier2];

    claimLuminary(state, "lum_tide");

    expect(state.players[0].tideArchiveForgeAvailable).toBe(true);
    expect(state.deckTier2).toEqual(tier2Before);
    expect(state.pendingLuminaryChoice).toBeNull();
  });

  it("forges the current Archive top at normal cost and consumes the privilege", () => {
    const state = makeGame();
    const player = state.players[0];
    enrichPlayer(state, 0);
    player.luminaries.push("lum_tide");
    player.tideArchiveForgeAvailable = true;
    const topCardId = state.deckTier2[0]!;
    const nextCardId = state.deckTier2[1]!;
    const topCard = CARD_MAP.get(topCardId)!;
    const forgedBefore = player.forgedArtifactIds.length;
    const affinitiesBefore = STANDARD_AFFINITY_KEYS.reduce(
      (total, affinity) => total + player.affinities[affinity],
      0,
    );

    const result = applyAction(state, player.playerId, {
      type: "forge_artifact",
      cardId: topCardId,
      luminaryId: "lum_tide",
    });

    expect(result.success).toBe(true);
    expect(player.forgedArtifactIds).toContain(topCardId);
    expect(player.forgedArtifactIds).toHaveLength(forgedBefore + 1);
    expect(state.deckTier2[0]).toBe(nextCardId);
    expect(player.tideArchiveForgeAvailable).toBe(false);
    const affinitiesAfter = STANDARD_AFFINITY_KEYS.reduce(
      (total, affinity) => total + player.affinities[affinity],
      0,
    );
    const expectedCost = STANDARD_AFFINITY_KEYS.reduce(
      (total, affinity) => total + topCard.cost[affinity],
      0,
    );
    expect(affinitiesBefore - affinitiesAfter).toBe(expectedCost);
  });

  it("formats all three Archive tops for Tide's ally even after the Forge is used", () => {
    const state = makeGame();
    const player = state.players[0];
    player.luminaries.push("lum_tide");
    player.tideArchiveForgeAvailable = false;

    const formatted = formatGameState("room-test", "playing", state, new Set());
    const formattedPlayer = formatted.players.find((candidate) => candidate.playerId === player.playerId);

    expect(formattedPlayer?.tideArchiveTopCards).toMatchObject({
      tier1: { id: state.deckTier1[0] },
      tier2: { id: state.deckTier2[0] },
      tier3: { id: state.deckTier3[0] },
    });
    expect(formattedPlayer?.tideArchiveForgeAvailable).toBe(false);
  });

  it("rejects a non-top Archive card and a second Archive Forge", () => {
    const state = makeGame();
    const player = state.players[0];
    enrichPlayer(state, 0);
    player.luminaries.push("lum_tide");
    player.tideArchiveForgeAvailable = true;

    const nonTopResult = applyAction(state, player.playerId, {
      type: "forge_artifact",
      cardId: state.deckTier2[1]!,
      luminaryId: "lum_tide",
    });
    expect(nonTopResult.success).toBe(false);

    expect(applyAction(state, player.playerId, {
      type: "forge_artifact",
      cardId: state.deckTier2[0]!,
      luminaryId: "lum_tide",
    }).success).toBe(true);

    state.pendingTurnTransition = null;
    state.pendingSummonEvents = [];
    state.pendingLuminaryActivationEvents = [];
    state.coreActionUsed = false;
    state.currentPlayerIndex = 0;
    const secondResult = applyAction(state, player.playerId, {
      type: "forge_artifact",
      cardId: state.deckTier3[0]!,
      luminaryId: "lum_tide",
    });
    expect(secondResult.success).toBe(false);
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
  it("rejects duplicate IDs without consuming a pending claim-order choice", () => {
    const state = makeGame();
    state.activeLuminaries = ["lum_bloom", "lum_astral"];
    state.pendingLuminaryChoice = {
      playerId: "p1",
      candidates: ["lum_bloom", "lum_astral"],
      createdAt: Date.now(),
    };
    const startingEminence = state.players[0].eminence;

    const result = applyAction(state, "p1", {
      type: "choose_luminary_order",
      orderedIds: ["lum_bloom", "lum_bloom"],
    });

    expect(result).toEqual({
      success: false,
      error: "orderedIds must list all candidates exactly once",
    });
    expect(state.pendingLuminaryChoice?.candidates).toEqual([
      "lum_bloom",
      "lum_astral",
    ]);
    expect(state.players[0].luminaries).toHaveLength(0);
    expect(state.players[0].eminence).toBe(startingEminence);
    expect(state.pendingSummonEvents).toHaveLength(0);
  });

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

  it("allows the incoming player to order start-of-turn claims before the seat advances", () => {
    const state = makeGame();
    state.currentPlayerIndex = 0;
    state.pendingTurnTransition = {
      stage: "after_start_effects",
      endingPlayerId: "p1",
      nextPlayerIndex: 1,
    };
    state.activeLuminaries = ["lum_verdant", "lum_tide"];
    state.pendingLuminaryChoice = {
      playerId: "p2",
      candidates: ["lum_verdant", "lum_tide"],
      createdAt: Date.now(),
    };

    const result = applyAction(state, "p2", {
      type: "choose_luminary_order",
      orderedIds: ["lum_tide", "lum_verdant"],
    });

    expect(result.success).toBe(true);
    expect(state.players[1].luminaries).toEqual(expect.arrayContaining(["lum_tide", "lum_verdant"]));
    expect(state.pendingLuminaryChoice).toBeNull();
  });

  it("allows only the named player to resolve an off-turn effect choice", () => {
    const state = makeGame();
    state.currentPlayerIndex = 0;
    state.activeLuminaries = ["lum_verdant", "lum_tide"];
    state.pendingLuminaryChoice = {
      playerId: "p2",
      candidates: ["lum_verdant", "lum_tide"],
      createdAt: Date.now(),
    };

    const wrongPlayer = applyAction(state, "p1", {
      type: "choose_luminary_order",
      orderedIds: ["lum_tide", "lum_verdant"],
    });
    expect(wrongPlayer.success).toBe(false);

    const owner = applyAction(state, "p2", {
      type: "choose_luminary_order",
      orderedIds: ["lum_tide", "lum_verdant"],
    });
    expect(owner.success).toBe(true);
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

    // lum_verdant: +1 Eminence and lum_void: +0 Eminence.
    // Oblivion then adds +5 to the shared victory requirement.
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
    expect(state.voidSealOwnerId).toBeNull();
    expect(state.pendingLuminaryActivationEvents.find(
      (event) => event.luminaryId === "lum_void" && event.effectType === "summon",
    )).toMatchObject({
      victoryRequirementBefore: 15,
      victoryRequirementAfter: 20,
      victoryRequirementChange: 5,
    });
  });

  it("ignores legacy Void Seal state and payloads", () => {
    const state = makeGame();
    const player = state.players[0]!;
    const cardId = state.forgeTier1.find((id) => {
      const card = CARD_MAP.get(id);
      return card && STANDARD_AFFINITY_KEYS.some((affinity) => card.cost[affinity] > 0);
    })!;

    player.affinities = { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 };
    player.bonuses = { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 };
    state.voidSealOwnerId = player.playerId;

    expect(applyAction(state, player.playerId, {
      type: "forge_artifact",
      cardId,
      voidSealAffinity: "flare",
    })).toMatchObject({ success: false, error: "Cannot afford this Artifact" });
    expect(player.forgedArtifactIds).not.toContain(cardId);
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

  /** Find the first face-up Forge Artifact. */
  function findAssimTarget(state: GameStateData): string | undefined {
    return [
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ].find((id) => CARD_MAP.has(id));
  }

  it("firstHungerAvailable is set to the claimer's playerId on arrival", () => {
    const state = makeGame();
    claimLuminary(state, "lum_hunger");
    expect(state.firstHungerAvailable).toBe("p1");
  });

  it("assimilate records the target separately without Burning it", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    const r = applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(r.success).toBe(true);
    expect(state.burnPile).not.toContain(target);
    expect(state.players[0]!.assimilatedArtifactIds).toContain(target);
    expect(state.players[0]!.forgedArtifactIds).not.toContain(target);
  });

  it("assimilate grants zero Eminence and +1 of the Artifact's bonus Affinity", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    const card = CARD_MAP.get(target)!;
    const before = state.players[0]!.eminence;
    const bonusBefore = state.players[0]!.bonuses[card.bonusAffinity];
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(state.players[0]!.eminence).toBe(before);
    expect(state.players[0]!.bonuses[card.bonusAffinity]).toBe(bonusBefore + 1);
  });

  it("assimilated Artifact is excluded from the forged collection", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(state.players[0]!.forgedArtifactIds ?? []).not.toContain(target);
    expect(state.players[0]!.assimilatedArtifactIds ?? []).toContain(target);
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

  it("assimilate emits an action activation with the target and gained Affinity", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    const card = CARD_MAP.get(target)!;
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    const event = state.pendingLuminaryActivationEvents.find(
      candidate => candidate.luminaryId === "lum_hunger" && candidate.effectType === "action",
    );
    expect(event?.targetCardIds).toEqual([target]);
    expect(event?.affinityType).toBe(card.bonusAffinity);
    expect(event?.affinityAmount).toBe(1);
    expect(event?.triggeringPlayerId).toBe("p1");
  });

  it("holds the turn until the Assimilation presentation is acknowledged", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;

    const result = applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(result.success).toBe(true);
    expect(state.players[state.currentPlayerIndex]!.playerId).toBe("p1");
    expect(state.pendingTurnTransition?.stage).toBe("after_action");

    const event = state.pendingLuminaryActivationEvents.find(
      candidate => candidate.luminaryId === "lum_hunger" && candidate.effectType === "action",
    );
    expect(event).toBeDefined();
    const resolved = applyAction(state, "p1", {
      type: "resolve_luminary_activation",
      eventId: event!.eventId,
    });

    expect(resolved.success).toBe(true);
    expect(state.pendingLuminaryActivationEvents).not.toContainEqual(event);
    expect(state.players[state.currentPlayerIndex]!.playerId).toBe("p2");
  });

  it("assimilate does not increment Catalyst Bloom because it is not a Burn", () => {
    const state = makeGame();
    setupHunger(state);
    // Catalyst Bloom count only increments while lum_bloom is held by a player.
    // Give p2 lum_bloom so the accumulator is active.
    state.players[1]!.luminaries.push("lum_bloom");
    const target = findAssimTarget(state);
    if (!target) return;
    const before = state.catalystBloomBurnCount ?? 0;
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(state.catalystBloomBurnCount ?? 0).toBe(before);
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

  it("assimilate accepts a target even when the owner cannot pay its printed cost", () => {
    const state = makeGame();
    setupHunger(state);
    for (const affinity of STANDARD_AFFINITY_KEYS) {
      state.players[0]!.affinities[affinity] = 0;
    }
    state.players[0]!.affinities.singularity = 0;
    const target = [
      ...state.forgeTier1,
      ...state.forgeTier2,
      ...state.forgeTier3,
    ].find((id) => {
      const c = CARD_MAP.get(id);
      return c && Object.values(c.cost).some((amount) => amount > 0);
    });
    if (!target) return;
    const r = applyAction(state, "p1", {
      type: "assimilate",
      cardId: target,
    });
    expect(r.success).toBe(true);
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

  it("assimilation creates no BurnEvent", () => {
    const state = makeGame();
    setupHunger(state);
    const target = findAssimTarget(state);
    if (!target) return;
    const before = state.burnEvents.length;
    applyAction(state, "p1", { type: "assimilate", cardId: target });
    expect(state.burnEvents).toHaveLength(before);
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

  it("queues every next-turn effect in production order after every arrival effect", () => {
    const state = makeGame();

    const result = runDevLuminarySequence(state, "p1", {
      luminaryIds: ["lum_astral", "lum_radiant", "lum_bloom", "lum_seed", "lum_ember"],
      includeNextTurnEffects: true,
    });

    expect(result.success).toBe(true);
    expect(
      state.pendingLuminaryActivationEvents.map((event) => [
        event.luminaryId,
        event.effectType,
      ]),
    ).toEqual([
      ["lum_seed", "summon"],
      ["lum_ember", "summon"],
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
      ["lum_ember", "end_of_turn"],
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
    expect(state.pendingLuminaryActivationEvents[0]?.targetSlotIds).toEqual([
      "1-3",
      "2-3",
      "3-3",
    ]);
    expect(state.pendingLuminaryActivationEvents[0]?.targetCardIds).toHaveLength(3);
    expect(state.forgeTier1).toHaveLength(4);
    expect(state.forgeTier2).toHaveLength(4);
    expect(state.forgeTier3).toHaveLength(4);
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
