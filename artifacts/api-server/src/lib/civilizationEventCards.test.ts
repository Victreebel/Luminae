import { describe, expect, it, vi } from "vitest";
import {
  getCivilizationLegacyProgress,
  deriveOperationalArtifactCapabilityIds,
  deriveHistoricalArtifactCapabilityIds,
  GENERAL_CIVILIZATION_EVENT_CARD_IDS,
  CIVILIZATION_EVENT_CARD_DEFINITIONS,
  STANDARD_AFFINITY_KEYS,
  isCivilizationEventCardId,
  type CivilizationEventCardId,
  type CivilizationArtifactLifecycleState,
} from "@workspace/game-types";
import {
  CARD_MAP,
  applyAction,
  formatGameState,
  effectiveAffinityBonuses,
  initializeGame,
  normalizeState,
  type GameStateData,
  type PlayerGameState,
} from "./gameEngine.js";
import { filterStateForPlayer } from "./stateProjection.js";
import { chooseAiAction } from "./aiPlayer.js";
import { drainSimulationPresentationEvents } from "../scripts/simulationPresentation.js";

function makeGame(): GameStateData {
  const state = normalizeState(initializeGame(
    [
      { id: "p1", name: "Player 1" },
      { id: "p2", name: "Player 2" },
    ],
    2,
    20,
    "standard",
    { eventContentProfile: "general_v1" },
  ));
  // Individual effect fixtures control their reveals explicitly.
  state.deckTier1 = state.deckTier1.filter((id) => !isCivilizationEventCardId(id));
  state.deckTier2 = state.deckTier2.filter((id) => !isCivilizationEventCardId(id));
  state.deckTier3 = state.deckTier3.filter((id) => !isCivilizationEventCardId(id));
  state.currentPlayerIndex = 0;
  state.openingTurnOrder = null;
  state.players[0].civilization.scale.historicalMaturity = "stellar";
  return state;
}

function addOperationalArtifact(
  player: PlayerGameState,
  artifactId: string,
): void {
  const lifecycle: CivilizationArtifactLifecycleState = {
    artifactId,
    firstMasteredTurnCount: 0,
    masteryCount: 1,
    implementationState: "operational",
    implementationStateChangedTurnCount: 0,
    implementationChangeSource: { sourceType: "system", sourceId: "event-test" },
    historyEvidence: "recorded",
  };
  player.civilization.artifacts[artifactId] = lifecycle;
}

function revealEvent(state: GameStateData, definitionId: CivilizationEventCardId): void {
  const tier = CIVILIZATION_EVENT_CARD_DEFINITIONS[definitionId].tier;
  const forge = tier === 1 ? state.forgeTier1 : tier === 2 ? state.forgeTier2 : state.forgeTier3;
  const deck = tier === 1 ? state.deckTier1 : tier === 2 ? state.deckTier2 : state.deckTier3;
  const displaced = forge[0];
  if (displaced) deck.push(displaced);
  forge[0] = definitionId;
}

function triggerFirstContact(state: GameStateData): void {
  revealEvent(state, "event_stellar_containment_cascade");
  expect(applyAction(state, "p1", { type: "pass" })).toEqual({ success: true });
  expect(state.pendingCivilizationEventCards).toHaveLength(1);
}

function completeEvent(state: GameStateData): string {
  const eventId = state.pendingCivilizationEventCards[0].eventId;
  expect(applyAction(state, "p1", { type: "resolve_civilization_event", eventId })).toEqual({ success: true });
  return eventId;
}

describe("Civilization Event cards", () => {
  it("resolves protected and exposed branches from actual operational manifestations", () => {
    const state = makeGame();
    addOperationalArtifact(state.players[0], "t1p01");

    triggerFirstContact(state);

    const event = state.pendingCivilizationEventCards[0];
    expect(event.definitionId).toBe("event_stellar_containment_cascade");
    expect(event.phase).toBe("reveal");
    expect(event.outcomesByPlayerId.p1).toMatchObject({
      outcomeId: "protected",
      capabilityCoverage: "strong",
      appliedConditionType: null,
      stabilityPressure: 0,
      respondingManifestations: [
        {
          sourceType: "artifact",
          sourceId: "t1p01",
          capabilityIds: ["artifact:system_stabilization"],
        },
      ],
    });
    expect(event.outcomesByPlayerId.p2).toMatchObject({
      outcomeId: "exposed",
      capabilityCoverage: "none",
      appliedConditionType: "disrupted",
      stabilityPressure: 10,
      respondingManifestations: [],
    });
    expect(Object.values(state.players[1].civilization.conditions)).toEqual([]);
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.pendingTurnTransition).not.toBeNull();
    expect(applyAction(state, "p1", { type: "pass" })).toEqual({
      success: false,
      error: "Complete the Luminary resolution sequence before acting",
    });
    completeEvent(state);
    expect(Object.values(state.players[1].civilization.conditions)).toEqual([
      expect.objectContaining({ type: "disrupted", coreType: "disrupted" }),
    ]);
  });

  it("uses supporting capabilities for the partial branch without inventing a manifestation", () => {
    const state = makeGame();
    addOperationalArtifact(state.players[0], "t1s01");

    triggerFirstContact(state);

    expect(state.pendingCivilizationEventCards[0].outcomesByPlayerId.p1).toMatchObject({
      outcomeId: "partial",
      capabilityCoverage: "partial",
      appliedConditionType: null,
      stabilityPressure: 3,
      respondingManifestations: [
        {
          sourceType: "artifact",
          sourceId: "t1s01",
          capabilityIds: ["artifact:hazard_detection"],
        },
      ],
    });
    completeEvent(state);
    expect(Object.values(state.players[0].civilization.conditions)).toHaveLength(0);
  });

  it("survives projection and reconnect, acknowledges idempotently, and fires once", () => {
    const state = makeGame();
    triggerFirstContact(state);
    const eventId = state.pendingCivilizationEventCards[0].eventId;

    const formatted = formatGameState("room", "playing", state, new Set(["p1", "p2"]));
    const projected = filterStateForPlayer(formatted, "p2");
    expect(projected.pendingCivilizationEventCards?.[0]).toMatchObject({
      eventId,
      definitionId: "event_stellar_containment_cascade",
      affectedPlayerIds: ["p1", "p2"],
    });

    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.pendingCivilizationEventCards[0].eventId).toBe(eventId);
    expect(applyAction(restored, "p2", {
      type: "resolve_civilization_event",
      eventId,
    })).toEqual({ success: true });
    expect(restored.pendingCivilizationEventCards).toEqual([]);
    expect(restored.civilizationEventDeck.completedEventIds).toContain(eventId);
    expect(restored.currentPlayerIndex).toBe(1);

    const version = restored.version;
    expect(applyAction(restored, "p1", {
      type: "resolve_civilization_event",
      eventId,
    })).toEqual({ success: true });
    expect(restored.version).toBe(version);

    restored.currentPlayerIndex = 1;
    restored.pendingTurnTransition = null;
    expect(applyAction(restored, "p2", { type: "pass" })).toEqual({ success: true });
    expect(restored.pendingCivilizationEventCards).toEqual([]);
    expect(restored.civilizationEventDeck.firedWindows).toEqual([]);
  });

  it("records the pressure Event as a real Defining Trial", () => {
    const state = makeGame();
    triggerFirstContact(state);
    const eventId = completeEvent(state);

    for (const player of state.players) {
      expect(player.civilization.events).toEqual([
        expect.objectContaining({
          eventId,
          source: {
            sourceType: "scenario",
            sourceId: "event_stellar_containment_cascade",
          },
          pressureTags: ["disruption"],
        }),
      ]);
      const progress = getCivilizationLegacyProgress(player.civilization);
      expect(progress.criteria.find((criterion) => criterion.id === "defining_trial"))
        .toMatchObject({ current: 1, achieved: true });
    }
  });
});


describe("deck-inserted cosmic Events", () => {
  it("preserves the legacy full pool and replays the exact board", () => {
    const state = initializeGame([{ id: "p1", name: "One" }, { id: "p2", name: "Two" }], 2,
      20, "standard", { eventContentProfile: "general_v1" });
    for (const tier of [1, 2, 3] as const) {
      const forge = tier === 1 ? state.forgeTier1 : tier === 2 ? state.forgeTier2 : state.forgeTier3;
      const deck = tier === 1 ? state.deckTier1 : tier === 2 ? state.deckTier2 : state.deckTier3;
      expect(forge).toHaveLength(4);
      expect(forge.some(isCivilizationEventCardId)).toBe(false);
      expect(deck.filter(isCivilizationEventCardId).sort()).toEqual(
        GENERAL_CIVILIZATION_EVENT_CARD_IDS.filter((id) => CIVILIZATION_EVENT_CARD_DEFINITIONS[id].tier === tier).sort(),
      );
    }
    const replay = initializeGame([{ id: "p1", name: "One" }, { id: "p2", name: "Two" }], 2, 20, "standard", {
      replayBoard: state.initialBoard,
    });
    expect(replay.deckTier1).toEqual(state.deckTier1);
    expect(replay.deckTier2).toEqual(state.deckTier2);
    expect(replay.deckTier3).toEqual(state.deckTier3);
  });

  it("does not trigger from civilization maturity alone", () => {
    const state = makeGame();
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it("holds both consecutive Forge reveals and the incoming turn until each receipt completes", () => {
    const state = makeGame();
    const first = "event_planetary_affinity_bloom";
    const second = "event_planetary_forge_drift";
    const removed = state.forgeTier1[0];
    const replacement = state.deckTier1[0];
    state.deckTier1 = [first, second, ...state.deckTier1];
    expect(applyAction(state, "p1", { type: "reserve_artifact", cardId: removed }).success).toBe(true);
    const firstReceipt = state.pendingCivilizationEventCards[0];
    expect(firstReceipt).toMatchObject({ definitionId: first, sourceCard: { id: first, tier: 1, forgeSlotIndex: 0 } });
    expect(state.lastAction?.type).toBe("reserve_artifact");
    expect(state.forgeTier1[0]).toBe(first);
    expect(state.currentPlayerIndex).toBe(0);
    expect(applyAction(state, "p2", { type: "resolve_civilization_event", eventId: firstReceipt.eventId }).success).toBe(true);
    expect(state.pendingCivilizationEventCards[0].definitionId).toBe(second);
    expect(state.forgeTier1[0]).toBe(second);
    expect(state.currentPlayerIndex).toBe(0);
    expect(applyAction(state, "p2", { type: "pass" }).success).toBe(false);
    const secondId = state.pendingCivilizationEventCards[0].eventId;
    expect(applyAction(state, "p1", { type: "resolve_civilization_event", eventId: secondId }).success).toBe(true);
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(state.forgeTier1).toContain(replacement);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.pendingTurnTransition).toBeNull();
  });

  it("does not resolve an Event's consequences before prior activation presentation finishes", () => {
    const state = makeGame();
    revealEvent(state, "event_stellar_containment_cascade");
    state.pendingTurnTransition = { stage: "after_action", endingPlayerId: "p1" };
    state.pendingLuminaryActivationEvents = [{
      eventId: "prior-activation", luminaryId: "lum_orchard", effectType: "action",
      triggeringPlayerId: "p1", targetCardIds: [], createdAt: Date.now(),
    }];
    expect(state.players[1].civilization.conditions).toEqual({});
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(false);
    expect(applyAction(state, "p2", { type: "resolve_luminary_activation", eventId: "prior-activation" }).success).toBe(true);
    expect(state.pendingCivilizationEventCards).toHaveLength(1);
    expect(Object.values(state.players[1].civilization.conditions)).toEqual([]);
    expect(state.pendingTurnTransition?.stage).toBe("after_action");
    completeEvent(state);
    expect(Object.values(state.players[1].civilization.conditions)).toEqual([
      expect.objectContaining({ type: "disrupted" }),
    ]);
  });

  it("reveals blind Archive Events beside the Forge without Encrypting or leaking their successor", () => {
    const state = makeGame();
    const secret = state.deckTier3[0];
    const originalForge = [...state.forgeTier3];
    state.deckTier3 = ["event_galactic_entropy_storm", secret, ...state.deckTier3.slice(1)];
    state.players[0].affinities.verdance = 4;
    const wellBefore = state.affinityWell.verdance;
    expect(applyAction(state, "p1", { type: "reserve_artifact", tier: 3 }).success).toBe(true);
    const receipt = state.pendingCivilizationEventCards[0];
    expect(receipt.sourceCard?.forgeSlotIndex).toBeNull();
    expect(state.players[0].reservedArtifactIds).toEqual([secret]);
    expect(state.players[0].affinities.verdance).toBe(4);
    const projected = filterStateForPlayer(formatGameState("room", "playing", state, new Set(["p1", "p2"])), "p2");
    expect(JSON.stringify(projected.pendingCivilizationEventCards)).not.toContain(secret);
    expect(projected.civilizationEventDeck?.definitionIds).toEqual([]);
    expect(JSON.stringify(projected.actionLog)).not.toContain(secret);
    expect(applyAction(state, "p1", { type: "resolve_civilization_event", eventId: receipt.eventId }).success).toBe(true);
    expect(state.players[0].reservedArtifactIds).toEqual([]);
    expect(state.players[0].privateReservedArtifactIds).toEqual([]);
    expect(state.players[0].affinities.verdance).toBe(1);
    expect(state.affinityWell.verdance).toBe(wellBefore + 3);
    expect(state.deckTier3.at(-1)).toBe(secret);
    expect(state.forgeTier3).toEqual(originalForge);
  });

  it("returns a concentrated holding while rewarding a balanced player and conserves the Well", () => {
    const state = makeGame();
    state.players[0].affinities.abyss = 4;
    const abyssBefore = state.affinityWell.abyss;
    revealEvent(state, "event_stellar_affinity_inversion");
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
    expect(state.pendingCivilizationEventCards[0].outcomesByPlayerId.p1.outcomeId).toBe("exposed");
    expect(state.pendingCivilizationEventCards[0].outcomesByPlayerId.p2.outcomeId).toBe("protected");
    expect(state.players[0].affinities.abyss).toBe(4);
    completeEvent(state);
    expect(state.players[0].affinities.abyss).toBe(2);
    expect(state.affinityWell.abyss).toBe(abyssBefore + 2);
    expect(STANDARD_AFFINITY_KEYS.reduce((sum, key) => sum + state.players[1].affinities[key], 0)).toBe(1);
  });

  it("does not overfill a hand or create tokens when the Well is empty", () => {
    const state = makeGame();
    state.players[0].affinities.verdance = 10;
    for (const key of STANDARD_AFFINITY_KEYS) state.affinityWell[key] = 0;
    revealEvent(state, "event_planetary_affinity_bloom");
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
    completeEvent(state);
    expect(state.players[0].affinities.verdance).toBe(10);
    expect(Object.values(state.players[1].affinities).reduce((sum, value) => sum + value, 0)).toBe(0);
  });

  it("recovers one Burned Artifact per tier once and preserves the active Event's Forge slot", () => {
    const state = makeGame();
    const burned = [state.deckTier1.shift()!, state.deckTier2.shift()!, state.deckTier3.shift()!];
    state.burnPile = [...burned];
    revealEvent(state, "event_galactic_terminus_tide");
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
    expect(state.burnPile).toEqual(burned);
    expect(state.forgeTier3[0]).toBe("event_galactic_terminus_tide");
    completeEvent(state);
    expect(state.burnPile).toEqual([]);
    expect(state.forgeTier1).toContain(burned[0]);
    expect(state.forgeTier2).toContain(burned[1]);
    expect(state.forgeTier3).toContain(burned[2]);
    expect(state.players.map((p) => p.affinities.singularity)).toEqual([1, 1]);
  });
});


describe("Artifact damage Events", () => {
  function giveForgedArtifact(state: GameStateData, playerIndex: number, artifactId: string): void {
    const player = state.players[playerIndex];
    const card = CARD_MAP.get(artifactId)!;
    for (const row of [state.forgeTier1, state.forgeTier2, state.forgeTier3,
      state.deckTier1, state.deckTier2, state.deckTier3]) {
      const index = row.indexOf(artifactId);
      if (index !== -1) row.splice(index, 1);
    }
    player.forgedArtifactIds.push(artifactId);
    player.artifactForgeCounts = { ...player.artifactForgeCounts, [artifactId]: 1 };
    player.bonuses[card.bonusAffinity]++;
    player.eminence += card.eminence;
    addOperationalArtifact(player, artifactId);
  }

  it("keeps the current final-round boundary after late damage without inventing a repair turn", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    state.phase = "last_round";
    state.currentPlayerIndex = 1;
    giveForgedArtifact(state, 0, "t3r01");
    const bonuses = { ...state.players[0].bonuses };
    revealEvent(state, "event_galactic_fracture_wave");
    expect(applyAction(state, "p2", { type: "pass" })).toEqual({ success: true });
    expect(state.phase).toBe("last_round");
    expect(applyAction(state, "p1", { type: "repair_artifacts", artifactIds: ["t3r01"] }).success).toBe(false);
    completeEvent(state);
    // Characterization: a repair opportunity before terminal scoring is not
    // guaranteed by the current turn rules; selection does not add one.
    expect(state.phase).toBe("finished");
    expect(state.players[0].civilization.artifacts.t3r01.implementationState).toBe("damaged");
    expect(state.players[0].bonuses).toEqual(bonuses);
    expect(applyAction(state, "p1", { type: "repair_artifacts", artifactIds: ["t3r01"] }).success).toBe(false);
  });

  it("previews the newest actual operational Artifact per player, commits after reconnect, and preserves mastery", () => {
    let state = makeGame();
    state.activeLuminaries = [];
    giveForgedArtifact(state, 0, "t3r01");
    giveForgedArtifact(state, 0, "t1p01");
    giveForgedArtifact(state, 1, "t2e01");
    // A lifecycle-only historical record is not an active owned implementation.
    addOperationalArtifact(state.players[0], "t3e01");
    const before = JSON.stringify(state.players.map((player) => ({
      civilization: player.civilization, bonuses: player.bonuses,
      forged: player.forgedArtifactIds, eminence: player.eminence,
    })));
    revealEvent(state, "event_stellar_system_shock");
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
    const preview = structuredClone(state.pendingCivilizationEventCards[0]);
    expect(preview.outcomesByPlayerId.p1.damagedArtifactIds).toEqual(["t1p01"]);
    expect(preview.outcomesByPlayerId.p2.damagedArtifactIds).toEqual(["t2e01"]);
    expect(JSON.stringify(state.players.map((player) => ({
      civilization: player.civilization, bonuses: player.bonuses,
      forged: player.forgedArtifactIds, eminence: player.eminence,
    })))).toBe(before);
    expect(applyAction(state, "p1", { type: "repair_artifacts", artifactIds: ["t1p01"] }).success).toBe(false);

    state = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(state.pendingCivilizationEventCards[0].outcomesByPlayerId).toEqual(preview.outcomesByPlayerId);
    const eventId = completeEvent(state);
    const player = state.players[0];
    expect(player.civilization.artifacts.t1p01).toMatchObject({
      implementationState: "damaged", masteryCount: 1,
      firstMasteredTurnCount: 0,
      implementationChangeSource: { sourceType: "scenario", sourceId: "event_stellar_system_shock" },
    });
    expect(player.forgedArtifactIds).toEqual(["t3r01", "t1p01"]);
    expect(player.eminence).toBe(CARD_MAP.get("t3r01")!.eminence + CARD_MAP.get("t1p01")!.eminence);
    expect(deriveOperationalArtifactCapabilityIds(player.civilization)).not.toContain("artifact:system_stabilization");
    expect(deriveHistoricalArtifactCapabilityIds(player.civilization)).toContain("artifact:system_stabilization");
    const committed = JSON.stringify(state);
    expect(applyAction(state, "p1", { type: "resolve_civilization_event", eventId }).success).toBe(true);
    expect(JSON.stringify(state)).toBe(committed);
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.players[0].civilization.artifacts.t1p01.implementationState).toBe("damaged");
    expect(formatGameState("room", "playing", restored, new Set()).players[0].civilization.artifacts.t1p01.implementationState).toBe("damaged");
  });

  it("Fracture Wave hits at most two highest-tier operational Artifacts, newest first, with explicit empty outcomes", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    for (const id of ["t3r01", "t3e01", "t2r01", "t1p01", "t3p01"]) giveForgedArtifact(state, 0, id);
    state.players[0].civilization.artifacts.t3p01.implementationState = "damaged";
    // Archived, annihilated, and Encrypted classes never enter this target set.
    addOperationalArtifact(state.players[0], "t3s01");
    state.players[0].civilization.artifacts.t3s01.implementationState = "archived";
    addOperationalArtifact(state.players[0], "t3f01");
    state.players[0].civilization.artifacts.t3f01.implementationState = "annihilated";
    state.players[0].reservedArtifactIds = ["t3s01"];
    revealEvent(state, "event_galactic_fracture_wave");
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
    const outcomes = state.pendingCivilizationEventCards[0].outcomesByPlayerId;
    expect(outcomes.p1.damagedArtifactIds).toEqual(["t3e01", "t3r01"]);
    expect(outcomes.p2).toMatchObject({ damagedArtifactIds: [], outcomeId: "protected", appliedConditionType: null });
    completeEvent(state);
    expect(state.players[0].civilization.artifacts.t2r01.implementationState).toBe("operational");
    expect(state.players[0].civilization.artifacts.t1p01.implementationState).toBe("operational");
    expect(Object.values(state.players[0].civilization.conditions)).toHaveLength(2);
  });

  it("preserves Artifact and Living Affinity bonuses through damage, reload, and one-time end-of-turn repair", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    state.turnCount = 2;
    giveForgedArtifact(state, 0, "t1p01");
    const player = state.players[0];
    const affinity = CARD_MAP.get("t1p01")!.bonusAffinity;
    // Damage preserves the printed Artifact bonus and separately awarded bonuses alike.
    player.bonuses[affinity] += 2;
    state.luminaryAffinities = [{ luminaryId: "lum_radiant", ownerId: "p1", activeAffinity: affinity,
      eligibleAffinities: [affinity], summonedAtTurnCount: 0 }];
    revealEvent(state, "event_stellar_system_shock");
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
    completeEvent(state);
    expect(player.bonuses[affinity]).toBe(3);
    expect(effectiveAffinityBonuses(state, player)[affinity]).toBe(4);
    expect(formatGameState("room", "playing", state, new Set()).players[0].bonuses[affinity]).toBe(3);
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(effectiveAffinityBonuses(restored, restored.players[0])[affinity]).toBe(4);
    expect(formatGameState("room", "playing", restored, new Set()).players[0].bonuses[affinity]).toBe(3);
    expect(applyAction(state, "p1", { type: "repair_artifacts", artifactIds: ["t1p01", "t1p01"] }).success).toBe(true);
    const version = state.version;
    expect(applyAction(state, "p1", { type: "repair_artifacts", artifactIds: ["t1p01"] }).success).toBe(true);
    expect(state.version).toBe(version);
    expect(applyAction(state, "p2", { type: "pass" }).success).toBe(true);
    expect(player.civilization.artifacts.t1p01.implementationState).toBe("damaged");
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
    expect(player.civilization.artifacts.t1p01.implementationState).toBe("operational");
    expect(effectiveAffinityBonuses(state, player)[affinity]).toBe(4);
    expect(player.bonuses[affinity]).toBe(3);
    expect(deriveOperationalArtifactCapabilityIds(player.civilization)).toContain("artifact:system_stabilization");
    expect(Object.values(player.civilization.conditions).every((condition) => condition.resolvedTurnCount !== null)).toBe(true);
    expect(player.pendingArtifactRepairIds).toEqual([]);
  });

  it("allows a Forge that depends on a damaged Artifact's Affinity bonus without requiring repair", () => {
    const state = makeGame();
    state.activeLuminaries = [];
    giveForgedArtifact(state, 0, "t1p01");
    const player = state.players[0];
    const affinity = CARD_MAP.get("t1p01")!.bonusAffinity;
    const target = state.forgeTier1.map((id) => CARD_MAP.get(id)!).find((card) => card.cost[affinity] > 0)
      ?? state.deckTier1.map((id) => CARD_MAP.get(id)!).find((card) => card.cost[affinity] > 0)!;
    if (!state.forgeTier1.includes(target.id)) {
      state.deckTier1 = state.deckTier1.filter((id) => id !== target.id);
      state.forgeTier1.push(target.id);
    }
    for (const key of STANDARD_AFFINITY_KEYS) player.affinities[key] = target.cost[key];
    player.affinities[affinity]--;
    revealEvent(state, "event_stellar_system_shock");
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
    completeEvent(state);
    expect(applyAction(state, "p2", { type: "pass" }).success).toBe(true);
    expect(applyAction(state, "p1", { type: "forge_artifact", cardId: target.id }).success).toBe(true);
    expect(player.forgedArtifactIds).toContain(target.id);
    expect(player.civilization.artifacts.t1p01.implementationState).toBe("damaged");
  });
});

describe("Event match integration", () => {
  it.each([2, 4])("completes a %i-player AI match after every Event without deadlocking", (playerCount) => {
    let seed = 2709 + playerCount;
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    });
    try {
      const state = initializeGame(Array.from({ length: playerCount }, (_, index) => ({
        id: `p${index + 1}`, name: `Player ${index + 1}`,
      })), playerCount, 20, "standard", { eventContentProfile: "general_v1" });
      state.openingTurnOrder = null;
      // Exercise every Event using legal Archive draws, then continue ordinary AI play.
      for (const tier of [1, 2, 3] as const) {
        const deck = tier === 1 ? state.deckTier1 : tier === 2 ? state.deckTier2 : state.deckTier3;
        deck.sort((a, b) => Number(isCivilizationEventCardId(b)) - Number(isCivilizationEventCardId(a)));
        const actorId = state.players[state.currentPlayerIndex].playerId;
        expect(applyAction(state, actorId, { type: "reserve_artifact", tier }).success).toBe(true);
        drainSimulationPresentationEvents(state);
        expect(state.pendingTurnTransition).toBeNull();
      }
      expect(state.civilizationEventDeck.completedEventIds).toHaveLength(GENERAL_CIVILIZATION_EVENT_CARD_IDS.length);
      for (let turn = 0; turn < 400 && state.phase !== "finished"; turn++) {
        const actorId = state.players[state.currentPlayerIndex].playerId;
        const action = chooseAiAction(state, actorId, "hard");
        const result = applyAction(state, actorId, action);
        expect(result, JSON.stringify(action)).toEqual({ success: true });
        drainSimulationPresentationEvents(state);
        expect(state.pendingTurnTransition).toBeNull();
        expect(state.pendingCivilizationEventCards).toEqual([]);
        for (const player of state.players) {
          expect(player.reservedArtifactIds.some(isCivilizationEventCardId)).toBe(false);
          expect(player.forgedArtifactIds.some(isCivilizationEventCardId)).toBe(false);
        }
      }
      expect(state.phase).toBe("finished");
      expect(state.winnerId).not.toBeNull();
    } finally {
      random.mockRestore();
    }
  });
});


it("validates a planned Forge against previewed Event consequences without mutating the live game", () => {
  const state = makeGame();
  const card = CARD_MAP.get(state.forgeTier1[0])!;
  const player = state.players[1];
  for (const key of STANDARD_AFFINITY_KEYS) player.affinities[key] = card.cost[key];
  const dominant = [...STANDARD_AFFINITY_KEYS].sort((a, b) => player.affinities[b] - player.affinities[a])[0];
  player.affinities[dominant] += 3;
  revealEvent(state, "event_galactic_entropy_storm");
  expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
  const before = { ...player.affinities };
  expect(applyAction(state, "p2", {
    type: "plan_action", plannedActionData: { type: "forge_artifact", cardId: card.id },
  })).toEqual({ success: true });
  expect(player.affinities).toEqual(before);
  expect(state.pendingCivilizationEventCards).toHaveLength(1);
  expect(state.forgeTier3).toContain("event_galactic_entropy_storm");
});


it("does not reapply an already-committed legacy receipt after reconnect", () => {
  const state = makeGame();
  triggerFirstContact(state);
  const event = state.pendingCivilizationEventCards[0];
  event.phase = "receipt";
  delete event.sourceCard;
  state.forgeTier2[0] = state.deckTier2.shift()!;
  const restored = normalizeState(JSON.parse(JSON.stringify(state)));
  const before = JSON.stringify(restored.players.map((player) => player.civilization));
  completeEvent(restored);
  expect(JSON.stringify(restored.players.map((player) => player.civilization))).toBe(before);
  expect(restored.pendingCivilizationEventCards).toEqual([]);
});
