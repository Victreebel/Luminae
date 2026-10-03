import { describe, expect, it } from "vitest";
import {
  ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  CIVILIZATION_EVENT_CARD_DEFINITIONS,
  GENERAL_CIVILIZATION_EVENT_CARD_IDS,
  LORE_PILOT_CIVILIZATION_EVENT_CARD_IDS,
  STANDARD_AFFINITY_KEYS,
  isCivilizationEventCardId,
  type CivilizationEventCardId,
  type CivilizationEventContentProfile,
} from "@workspace/game-types";
import {
  applyAction, CARD_MAP, configureTraceScenario, effectiveAffinityBonuses, formatGameState,
  getReplayBoardSnapshot, initializeGame, normalizeState,
  type GameStateData,
} from "./gameEngine.js";
import { buildFrozenLoreEventPlan } from "./loreEventPlan.js";
import { filterStateForPlayer } from "./stateProjection.js";

function fixture(profile: CivilizationEventContentProfile = "lore_pilot_v1") {
  const state = normalizeState(initializeGame([{ id: "p1", name: "One" }, { id: "p2", name: "Two" }],
    2, 20, "standard", { eventContentProfile: profile }));
  state.currentPlayerIndex = 0;
  state.openingTurnOrder = null;
  state.activeLuminaries = [];
  for (const row of [state.deckTier1, state.deckTier2, state.deckTier3]) {
    row.splice(0, row.length, ...row.filter((id) => !isCivilizationEventCardId(id)));
  }
  return state;
}

function give(state: GameStateData, playerIndex: number, artifactId: string) {
  const player = state.players[playerIndex];
  for (const row of [state.forgeTier1, state.forgeTier2, state.forgeTier3,
    state.deckTier1, state.deckTier2, state.deckTier3]) {
    const index = row.indexOf(artifactId);
    if (index >= 0) row.splice(index, 1);
  }
  player.forgedArtifactIds.push(artifactId);
  const card = CARD_MAP.get(artifactId)!;
  player.bonuses[card.bonusAffinity]++;
  player.eminence += card.eminence;
  player.civilization.artifacts[artifactId] = {
    artifactId, firstMasteredTurnCount: 0, masteryCount: 1,
    implementationState: "operational", implementationStateChangedTurnCount: 0,
    implementationChangeSource: { sourceType: "system", sourceId: "lore-pilot-test" },
    historyEvidence: "recorded",
  };
}

function reveal(state: GameStateData, id: CivilizationEventCardId) {
  const definition = CIVILIZATION_EVENT_CARD_DEFINITIONS[id];
  const forge = definition.tier === 1 ? state.forgeTier1 : state.forgeTier2;
  const deck = definition.tier === 1 ? state.deckTier1 : state.deckTier2;
  if (forge[0]) deck.push(forge[0]);
  forge[0] = id;
  const actor = state.players[state.currentPlayerIndex].playerId;
  expect(applyAction(state, actor, { type: "pass" })).toEqual({ success: true });
  return state.pendingCivilizationEventCards[0];
}

function acknowledge(state: GameStateData, eventId = state.pendingCivilizationEventCards[0].eventId) {
  return applyAction(state, "p1", { type: "resolve_civilization_event", eventId });
}

const signal = "event_planetary_signal_clarity";
const shear = "event_stellar_synchronization_shear";

describe("explicit lore Event pools", () => {
  it("keeps all eight general Events and limits pilots to an explicit fixed profile", () => {
    for (const [profile, expected] of [["general_v1", GENERAL_CIVILIZATION_EVENT_CARD_IDS],
      ["lore_pilot_v1", LORE_PILOT_CIVILIZATION_EVENT_CARD_IDS]] as const) {
      const state = initializeGame([{ id: "p1", name: "One" }, { id: "p2", name: "Two" }],
        2, 20, "standard", { eventContentProfile: profile });
      const cards = [...state.deckTier1, ...state.deckTier2, ...state.deckTier3].filter(isCivilizationEventCardId);
      expect(cards.sort()).toEqual([...expected].sort());
      const replay = initializeGame([{ id: "p1", name: "One" }, { id: "p2", name: "Two" }],
        2, 20, "standard", { replayBoard: getReplayBoardSnapshot(state) });
      expect(replay.deckTier1).toEqual(state.deckTier1);
      expect(replay.deckTier2).toEqual(state.deckTier2);
      expect(replay.civilizationEventDeck.contentProfile).toBe(profile);
      expect(formatGameState("room", "playing", replay, new Set()).eventCardPool).toEqual(expected);
    }
  });

  it("does not inject pilots into an old save lacking a profile", () => {
    const state = fixture("general_v1");
    delete state.civilizationEventDeck.contentProfile;
    delete state.civilizationEventDeck.rulesVersion;
    delete state.pendingCivilizationEventPlans;
    const deckBefore = JSON.stringify([state.deckTier1, state.deckTier2, state.deckTier3]);
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.civilizationEventDeck.contentProfile).toBe("general_v1");
    expect(JSON.stringify([restored.deckTier1, restored.deckTier2, restored.deckTier3])).toBe(deckBefore);
    expect(restored.pendingCivilizationEventPlans).toEqual({});
  });

  it("announces the persisted pool without adding later cards or showing Events in protected Chronicles", () => {
    const state = fixture("general_v1");
    const oldSix = GENERAL_CIVILIZATION_EVENT_CARD_IDS.filter((id) =>
      id !== "event_stellar_system_shock" && id !== "event_galactic_fracture_wave");
    state.civilizationEventDeck.definitionIds = [...oldSix].reverse();
    expect(formatGameState("room", "playing", state, new Set()).eventCardPool).toEqual(oldSix);
    configureTraceScenario(state, "p1", "p2", "rehearsal");
    expect(formatGameState("room", "playing", state, new Set()).eventCardPool).toEqual([]);
  });

  it("cannot activate a newly inserted pilot outside its explicit profile", () => {
    const state = fixture("general_v1");
    give(state, 0, "t1s04");
    reveal(state, shear);
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(state.forgeTier2).not.toContain(shear);
    expect(state.players[0].civilization.artifacts.t1s04.implementationState).toBe("operational");
  });
});

describe("capability-based Signal Clarity", () => {
  it("rewards the Spindle's explicit signal translation and records a public explanation", () => {
    const state = fixture();
    give(state, 0, "t2e04");
    const event = reveal(state, signal);
    const playerPlan = state.pendingCivilizationEventPlans![event.eventId].players[0];
    const affinity = playerPlan.grantedAffinity!;
    expect(affinity).not.toBeNull();
    expect(event.outcomesByPlayerId.p1.targetEvidence).toEqual([
      expect.objectContaining({ artifactId: "t2e04", role: "responder", match: {
        kind: "capability", id: "artifact:signal_interpretation",
      } }),
    ]);
    const supply = state.affinityWell[affinity];
    expect(acknowledge(state)).toEqual({ success: true });
    expect(state.players[0].affinities[affinity]).toBe(1);
    expect(state.affinityWell[affinity]).toBe(supply - 1);
  });

  it("uses operational public forged responders, newest first, without mutating the planning snapshot", () => {
    const state = fixture();
    give(state, 0, "t1p03");
    give(state, 0, "t1p05"); // Also an interpreter; the cap remains one per player.
    give(state, 1, "t1p08"); // Preserved patterns do not imply signal interpretation.
    const before = JSON.stringify(state);
    const plan = buildFrozenLoreEventPlan(state, "signal-test", signal)!;
    expect(JSON.stringify(state)).toBe(before);
    expect(plan.players[0].outcome.respondingManifestations).toEqual([{ sourceType: "artifact", sourceId: "t1p05", capabilityIds: ["artifact:signal_interpretation"] }]);
    expect(plan.players[0].grantedAffinity).not.toBeNull();
    expect(plan.players[1].grantedAffinity).toBeNull();
    expect(plan.players[1].outcome.targetEvidence).toEqual([]);
  });

  it("excludes damaged, archived, annihilated, Encrypted and lifecycle-only records", () => {
    const state = fixture();
    const matching = Object.entries(ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID)
      .filter(([, ids]) => (ids as readonly string[]).includes("artifact:signal_interpretation"))
      .map(([id]) => id);
    for (const id of matching.slice(0, 5)) give(state, 0, id);
    const player = state.players[0];
    player.civilization.artifacts[matching[0]].implementationState = "damaged";
    player.civilization.artifacts[matching[1]].implementationState = "archived";
    player.civilization.artifacts[matching[2]].implementationState = "annihilated";
    player.reservedArtifactIds.push(matching[3]);
    player.forgedArtifactIds = player.forgedArtifactIds.filter((id) => id !== matching[4]);
    const plan = buildFrozenLoreEventPlan(state, "none", signal)!;
    expect(plan.players[0].grantedAffinity).toBeNull();
    expect(plan.players[0].outcome.respondingManifestations).toEqual([]);
  });

  it("freezes scarce supply in seating order, respects full hands, and conserves tokens", () => {
    const state = fixture();
    give(state, 0, "t1p03");
    give(state, 1, "t1p05");
    for (const key of STANDARD_AFFINITY_KEYS) state.affinityWell[key] = 0;
    state.affinityWell.abyss = 1;
    state.currentPlayerIndex = 1;
    const event = reveal(state, signal);
    const plans = state.pendingCivilizationEventPlans![event.eventId].players;
    expect(plans.map((plan) => plan.grantedAffinity)).toEqual(["abyss", null]);
    expect(state.affinityWell.abyss).toBe(1);
    expect(acknowledge(state)).toEqual({ success: true });
    expect(state.players.map((player) => player.affinities.abyss)).toEqual([1, 0]);
    expect(state.affinityWell.abyss).toBe(0);
    state.players[0].affinities.abyss = 10;
    state.affinityWell.flare = 2;
    expect(buildFrozenLoreEventPlan(state, "full", signal)!.players[0].grantedAffinity).toBeNull();
  });
});

describe("reviewed synchronization dependency", () => {
  it("targets regional stellar steering without treating a single-star collector ecology as synchronized", () => {
    const state = fixture();
    give(state, 0, "t3r01");
    give(state, 1, "t2r04");
    const plan = buildFrozenLoreEventPlan(state, "tier-audit-shear", shear)!;
    expect(plan.players[0].outcome.damagedArtifactIds).toEqual(["t3r01"]);
    expect(plan.players[1].outcome.damagedArtifactIds).toEqual([]);
    state.players[0].civilization.artifacts.t3r01.implementationState = "damaged";
    expect(buildFrozenLoreEventPlan(state, "tier-audit-damaged", shear)!.players[0].outcome.damagedArtifactIds).toEqual([]);
  });

  it("leaves historical ordering intact while damaging a live timing dependency", () => {
    const state = fixture();
    give(state, 0, "t1s04");
    give(state, 0, "t3s04"); // Newer shared history must not displace the actual target.
    give(state, 1, "t2e04"); // Translation is not live synchronization either.
    const event = reveal(state, shear);
    expect(event.outcomesByPlayerId.p1.damagedArtifactIds).toEqual(["t1s04"]);
    expect(event.outcomesByPlayerId.p2.damagedArtifactIds).toEqual([]);
    expect(acknowledge(state)).toEqual({ success: true });
    expect(state.players[0].civilization.artifacts.t1s04.implementationState).toBe("damaged");
    expect(state.players[0].civilization.artifacts.t3s04.implementationState).toBe("operational");
    expect(state.players[1].civilization.artifacts.t2e04.implementationState).toBe("operational");
  });

  it("caps damage at one unprotected newest dependency and makes own protection explicit", () => {
    const state = fixture();
    give(state, 0, "t1s04");
    give(state, 0, "t1p06");
    give(state, 0, "t2p05"); // Newest, but self-protected, never civilization-wide immunity.
    give(state, 1, "t1p08");
    const plan = buildFrozenLoreEventPlan(state, "shear-test", shear)!;
    expect(plan.players[0].outcome.damagedArtifactIds).toEqual(["t1p06"]);
    expect(plan.players[0].outcome.targetEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ artifactId: "t1p06", role: "target", match: { kind: "event_fact", id: "dependency:distributed_synchronization" } }),
      expect.objectContaining({ artifactId: "t2p05", role: "mitigator", match: { kind: "capability", id: "artifact:resilient_computation" } }),
    ]));
    expect(plan.players[1].outcome).toMatchObject({ damagedArtifactIds: [], outcomeId: "protected" });
  });

  it("preserves the frozen plan through reload and later selector changes, with one-time damage and repair", () => {
    let state = fixture();
    give(state, 0, "t1s04");
    give(state, 0, "t1p08");
    const event = reveal(state, shear);
    const preview = structuredClone(event.outcomesByPlayerId);
    expect(event.rulesText).toBe(CIVILIZATION_EVENT_CARD_DEFINITIONS[shear].rulesText);
    const savedPlan = structuredClone(state.pendingCivilizationEventPlans![event.eventId]);
    expect(state.players[0].civilization.artifacts.t1s04.implementationState).toBe("operational");
    state = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(state.pendingCivilizationEventPlans![event.eventId]).toEqual(savedPlan);
    // A hypothetical catalog update/reordering after reveal cannot replace the target.
    give(state, 0, "t1p06");
    const beforeBonuses = effectiveAffinityBonuses(state, state.players[0]);
    expect(acknowledge(state, event.eventId)).toEqual({ success: true });
    expect(state.players[0].civilization.artifacts.t1s04.implementationState).toBe("damaged");
    expect(state.players[0].civilization.artifacts.t1p06.implementationState).toBe("operational");
    expect(effectiveAffinityBonuses(state, state.players[0])).toEqual(beforeBonuses);
    const history = state.players[0].civilization.events.find((entry) => entry.eventId === event.eventId)!;
    expect(history).toMatchObject({ definitionId: shear, rulesVersion: "lore-events-v1", targetEvidence: preview.p1.targetEvidence });
    expect(history.history["target_reason:t1s04"]).toContain("synchron");
    expect(state.pendingCivilizationEventPlans).toEqual({});
    const after = JSON.stringify(state);
    expect(acknowledge(state, event.eventId)).toEqual({ success: true });
    expect(JSON.stringify(state)).toBe(after);
    state = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(state.players[0].civilization.events.find((entry) => entry.eventId === event.eventId)?.targetEvidence).toEqual(preview.p1.targetEvidence);
    expect(applyAction(state, "p1", { type: "repair_artifacts", artifactIds: ["t1s04"] }).success).toBe(true);
    expect(applyAction(state, "p2", { type: "pass" }).success).toBe(true);
    expect(applyAction(state, "p1", { type: "pass" }).success).toBe(true);
    expect(state.players[0].civilization.artifacts.t1s04.implementationState).toBe("operational");
    expect(effectiveAffinityBonuses(state, state.players[0])).toEqual(beforeBonuses);
  });

  it("fails closed on an unavailable or incompatible saved pilot plan instead of retargeting", () => {
    for (const missing of [true, false]) {
      const state = fixture();
      give(state, 0, "t1s04");
      const event = reveal(state, shear);
      if (missing) delete state.pendingCivilizationEventPlans![event.eventId];
      else Object.assign(state.pendingCivilizationEventPlans![event.eventId], { schemaVersion: 99 });
      const before = JSON.stringify(state.players);
      expect(acknowledge(state).success).toBe(false);
      expect(JSON.stringify(state.players)).toBe(before);
      expect(state.pendingCivilizationEventCards[0].eventId).toBe(event.eventId);
    }
  });

  it("publishes causal receipts/history without private plan, encrypted identities, or hidden projects", () => {
    const state = fixture();
    give(state, 0, "t1s04");
    const secret = "t3r03";
    state.players[0].reservedArtifactIds = [secret];
    state.players[0].privateReservedArtifactIds = [secret];
    const event = reveal(state, shear);
    const projected = filterStateForPlayer(formatGameState("room", "playing", state, new Set()), "p2");
    expect(projected).not.toHaveProperty("pendingCivilizationEventPlans");
    expect(JSON.stringify(projected.pendingCivilizationEventCards)).not.toContain(secret);
    expect(projected.pendingCivilizationEventCards?.[0].outcomesByPlayerId.p1.targetEvidence)
      .toEqual(event.outcomesByPlayerId.p1.targetEvidence);
    expect(acknowledge(state)).toEqual({ success: true });
    const after = filterStateForPlayer(formatGameState("room", "playing", state, new Set()), "p2");
    expect(after.players[0].civilization!.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ definitionId: shear, rulesVersion: "lore-events-v1", targetEvidence: event.outcomesByPlayerId.p1.targetEvidence }),
    ]));
  });
});
