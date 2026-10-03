import { describe, expect, it } from "vitest";
import { CIVILIZATION_EVENT_CARD_DEFINITIONS, REGULAR_CIVILIZATION_EVENT_CARD_IDS, isCivilizationEventCardId, type CivilizationEventCardId, type EventFrequency } from "@workspace/game-types";
import { applyAction, CARD_MAP, formatGameState, getEventForecast, getReplayBoardSnapshot, initializeGame, normalizeState, type GameStateData } from "./gameEngine.js";

function game(count = 2, frequency: EventFrequency = "standard", openingSeat = count - 1) {
  const players = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));
  const state = initializeGame(players, count, 100, "standard", { eventFrequency: frequency });
  state.currentPlayerIndex = openingSeat;
  state.openingTurnOrder = null;
  state.activeLuminaries = [];
  state.players.forEach((player) => {
    player.bonuses = { flare: 20, continuum: 20, verdance: 20, abyss: 20, radiance: 20, singularity: 0 };
  });
  return state;
}
function readyEvent(state: GameStateData, definitionId: CivilizationEventCardId) {
  state.civilizationEventDeck.definitionIds = [definitionId];
  state.civilizationEventDeck.scheduled = {
    queue: [definitionId], roundFloors: [0], nextQueueIndex: 0,
    dueAfterTurnCount: 0, lastEventTurnCount: null, readyCardId: null,
  };
}
const currentId = (state: GameStateData) => state.players[state.currentPlayerIndex].playerId;
function pass(state: GameStateData, count = 1) {
  for (let i = 0; i < count; i++) expect(applyAction(state, currentId(state), { type: "pass" })).toEqual({ success: true });
}
function forge(state: GameStateData, cardId = state.forgeTier1.find((id) => CARD_MAP.has(id))!) {
  return applyAction(state, currentId(state), { type: "forge_artifact", cardId });
}
function resolve(state: GameStateData) {
  const eventId = state.pendingCivilizationEventCards[0]?.eventId;
  expect(eventId).toBeTruthy();
  expect(applyAction(state, currentId(state), { type: "resolve_civilization_event", eventId })).toEqual({ success: true });
  return eventId!;
}
function resolvePriorPresentations(state: GameStateData) {
  for (let safety = 0; safety < 20; safety++) {
    const summon = state.pendingSummonEvents[0];
    const activation = state.pendingLuminaryActivationEvents[0];
    if (!summon && !activation) return;
    expect(applyAction(state, currentId(state), summon
      ? { type: "resolve_summon", eventId: summon.eventId }
      : { type: "resolve_luminary_activation", eventId: activation!.eventId })).toEqual({ success: true });
  }
  throw new Error("Prior presentations did not settle");
}

describe("separate Event countdown", () => {
  it.each([2, 3, 4])("uses %i-player complete cycles from any opening seat and exposes player-relative warnings", (count) => {
    for (let openingSeat = 0; openingSeat < count; openingSeat++) {
      const state = game(count, "standard", openingSeat);
      expect(getEventForecast(state)).toMatchObject({ status: "countdown", tier: 1, roundsRemaining: 4 });
      expect(getEventForecast(state)?.turnsRemainingByPlayerId[currentId(state)]).toBe(4);
      pass(state, count);
      expect(state.currentPlayerIndex).toBe(openingSeat);
      expect(getEventForecast(state)?.turnsRemainingByPlayerId[currentId(state)]).toBe(3);
      pass(state, count * 3 - 1);
      expect(getEventForecast(state)?.status).toBe("countdown");
      expect(getEventForecast(state)?.turnsRemainingByPlayerId[currentId(state)]).toBe(1);
      pass(state);
      expect(state.currentPlayerIndex).toBe(openingSeat);
      expect(getEventForecast(state)).toMatchObject({ status: "armed", roundsRemaining: 0 });
      expect(Object.values(getEventForecast(state)!.turnsRemainingByPlayerId).every((n) => n === 0)).toBe(true);
      expect(state.pendingCivilizationEventCards).toEqual([]);
    }
  });

  it("keeps all Archives Artifact-only, and publishes candidates without selection or hidden order", () => {
    const state = game();
    expect([state.deckTier1, state.deckTier2, state.deckTier3].flat().some(isCivilizationEventCardId)).toBe(false);
    const api = formatGameState("room", "playing", state, new Set());
    expect(api.eventCardPool).toEqual(REGULAR_CIVILIZATION_EVENT_CARD_IDS);
    expect(state.civilizationEventDeck.definitionIds).toHaveLength(3);
    expect(api.civilizationEventDeck.definitionIds).toEqual([]);
    expect(api.civilizationEventDeck).not.toHaveProperty("scheduled");
    expect(api).not.toHaveProperty("initialBoard");
    expect(api.eventDelivery).toBe("scheduled_forge_v1");
  });

  it("does not reuse the Forge that empties the countdown, then waits indefinitely for a successful next Forge", () => {
    const state = game();
    pass(state, 7);
    expect(forge(state)).toEqual({ success: true });
    expect(state.turnCount).toBe(8);
    expect(getEventForecast(state)?.status).toBe("armed");
    expect(state.pendingCivilizationEventCards).toEqual([]);
    pass(state, 30);
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(applyAction(state, currentId(state), { type: "forge_artifact", cardId: "not-an-artifact" }).success).toBe(false);
    expect(getEventForecast(state)?.status).toBe("armed");
    const beforeRows = [state.forgeTier1.length, state.forgeTier2.length, state.forgeTier3.length];
    expect(forge(state)).toEqual({ success: true });
    expect(state.pendingCivilizationEventCards).toHaveLength(1);
    const event = state.pendingCivilizationEventCards[0];
    expect(event.sourceCard).toMatchObject({ tier: 1, forgeSlotIndex: 0, origin: "scheduled" });
    expect(event.definitionId).toBe(state.civilizationEventDeck.scheduled?.queue[0]);
    expect(state.currentPlayerIndex).toBe(1);
    const api = formatGameState("room", "playing", state, new Set());
    expect([api.forgeTier1.length, api.forgeTier2.length, api.forgeTier3.length]).toEqual(beforeRows);
    expect(getEventForecast(state)?.status).toBe("resolving");
    resolve(state);
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(state.civilizationEventDeck.scheduled?.nextQueueIndex).toBe(1);
    expect(getEventForecast(state)?.status).toBe("countdown");
  });

  it("Encryption cannot arm the queue, and an Encrypted Forge waits for the next real vacancy", () => {
    const state = game();
    pass(state, 8);
    const playerId = currentId(state);
    const cardId = state.deckTier3[0];
    expect(applyAction(state, playerId, { type: "reserve_artifact", tier: 3 })).toEqual({ success: true });
    expect(state.players.find((p) => p.playerId === playerId)?.reservedArtifactIds).toContain(cardId);
    expect(getEventForecast(state)?.status).toBe("armed");
    expect(state.pendingCivilizationEventCards).toEqual([]);
    pass(state);
    const beforeRows = structuredClone([state.forgeTier1, state.forgeTier2, state.forgeTier3]);
    expect(applyAction(state, playerId, { type: "forge_reserved_artifact", cardId })).toEqual({ success: true });
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(state.civilizationEventDeck.scheduled?.readyCardId).toBeTruthy();
    expect([state.forgeTier1, state.forgeTier2, state.forgeTier3]).toEqual(beforeRows);
    expect(getEventForecast(state)?.status).toBe("armed");
    const archiveBeforeVacancy = [...state.deckTier2];
    expect(applyAction(state, currentId(state), {
      type: "reserve_artifact", cardId: state.forgeTier2[2],
    })).toEqual({ success: true });
    expect(state.pendingCivilizationEventCards).toHaveLength(1);
    expect(state.pendingCivilizationEventCards[0].sourceCard).toMatchObject({ tier: 2, forgeSlotIndex: 2 });
    expect(state.deckTier2).toEqual(archiveBeforeVacancy);
  });

  it("a Tide Archive Forge arms an Event without replacing any occupied Forge mold", () => {
    const state = game();
    pass(state, 8);
    const player = state.players[state.currentPlayerIndex];
    player.luminaries.push("lum_tide");
    player.tideArchiveForgeAvailable = true;
    const beforeRows = structuredClone([state.forgeTier1, state.forgeTier2, state.forgeTier3]);
    expect(forge(state, state.deckTier2[0])).toEqual({ success: true });
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect([state.forgeTier1, state.forgeTier2, state.forgeTier3]).toEqual(beforeRows);
    expect(getEventForecast(state)?.status).toBe("armed");
    expect(forge(state, state.forgeTier3[1])).toEqual({ success: true });
    expect(state.pendingCivilizationEventCards).toHaveLength(1);
    expect(state.pendingCivilizationEventCards[0].sourceCard).toMatchObject({ tier: 3, forgeSlotIndex: 1 });
  });

  it("a Foundry recovery Forge arms an Event and preserves the rows until a later departure", () => {
    const state = game();
    readyEvent(state, "event_planetary_affinity_bloom");
    const player = state.players[state.currentPlayerIndex];
    const cardId = state.deckTier1.shift()!;
    player.reservedArtifactIds.push(cardId);
    player.blueprintPrivateStates = [{
      blueprintId: "bp_mantle_to_orbit_foundry", slotIndex: 0,
      manifested: true, matchedComponentIds: [], secretTargetCardId: null,
      safePreManifestActionPlayerIds: [], foundryStoredArtifactIds: [cardId],
    }];
    player.manifestedBlueprintDevices = [{
      blueprintId: "bp_mantle_to_orbit_foundry", ownerPlayerId: player.playerId,
      slotIndex: 0, state: "recovering", presentationVariant: "armored",
    }];
    const beforeRows = structuredClone([state.forgeTier1, state.forgeTier2, state.forgeTier3]);
    expect(applyAction(state, player.playerId, {
      type: "forge_artifact", cardId, blueprintAction: "foundry_recovery",
    })).toEqual({ success: true });
    expect(player.forgedArtifactIds).toContain(cardId);
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect([state.forgeTier1, state.forgeTier2, state.forgeTier3]).toEqual(beforeRows);
    expect(getEventForecast(state)?.status).toBe("armed");
    pass(state, 2);
    expect(forge(state)).toEqual({ success: true });
    expect(state.pendingCivilizationEventCards).toHaveLength(1);
  });

  it.each([1, 2, 3] as const)("fills the actual Tier %i vacancy and draws its delayed Artifact only after acknowledgement", (tier) => {
    const state = game();
    const definitionId = "event_planetary_affinity_bloom";
    readyEvent(state, definitionId);
    const rows = { 1: state.forgeTier1, 2: state.forgeTier2, 3: state.forgeTier3 };
    const archives = { 1: state.deckTier1, 2: state.deckTier2, 3: state.deckTier3 };
    const row = rows[tier];
    const archive = archives[tier];
    const beforeRow = [...row];
    const beforeArchive = [...archive];
    expect(forge(state, row[2])).toEqual({ success: true });
    expect(row).toEqual([beforeRow[0], beforeRow[1], definitionId, beforeRow[3]]);
    expect(archive).toEqual(beforeArchive);
    expect(state.pendingCivilizationEventCards[0].sourceCard).toEqual({
      id: definitionId, tier, forgeSlotIndex: 2, origin: "scheduled",
    });
    const api = formatGameState("room", "playing", state, new Set());
    const apiRow = { 1: api.forgeTier1, 2: api.forgeTier2, 3: api.forgeTier3 }[tier];
    expect(apiRow).toHaveLength(4);
    expect(apiRow[2]).toBeNull();
    expect(apiRow[3]?.id).toBe(beforeRow[3]);
    const eventId = resolve(state);
    expect(row).toEqual([beforeRow[0], beforeRow[1], beforeArchive[0], beforeRow[3]]);
    expect(archive).toEqual(beforeArchive.slice(1));
    const after = JSON.stringify(state);
    expect(applyAction(state, currentId(state), { type: "resolve_civilization_event", eventId })).toEqual({ success: true });
    expect(JSON.stringify(state)).toBe(after);
  });

  it.each(["standard", "frequent"] as const)("delayed %s Events reset recovery time and cannot burst from a backlog", (frequency) => {
    const state = game(2, frequency);
    pass(state, 40);
    expect(forge(state)).toEqual({ success: true });
    const triggerTurn = state.turnCount;
    resolve(state);
    const interval = frequency === "frequent" ? 2 : 4;
    expect(state.turnCount).toBe(triggerTurn + 1);
    expect(state.civilizationEventDeck.scheduled?.dueAfterTurnCount).toBe(triggerTurn + 1 + interval * 2);
    expect(getEventForecast(state)?.roundsRemaining).toBe(interval);
    for (let i = 0; i < interval * 2; i++) {
      expect(forge(state)).toEqual({ success: true });
      expect(state.pendingCivilizationEventCards).toEqual([]);
    }
    expect(getEventForecast(state)?.status).toBe("armed");
    expect(forge(state)).toEqual({ success: true });
    expect(state.pendingCivilizationEventCards).toHaveLength(1);
  });

  it("frequent never brings Stellar or Galactic Event floors earlier", () => {
    const standard = game();
    const frequent = game(2, "frequent");
    expect(standard.civilizationEventDeck.scheduled?.roundFloors).toEqual([4, 8, 12]);
    expect(frequent.civilizationEventDeck.scheduled?.roundFloors).toEqual([4, 6, 8, 10, 12, 14]);
    expect(frequent.civilizationEventDeck.scheduled?.queue.map((id) => CIVILIZATION_EVENT_CARD_DEFINITIONS[id].tier)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it("defers activation behind prior effects and preserves the exact pending trigger across reconnect", () => {
    const state = game();
    pass(state, 8);
    const player = state.players[state.currentPlayerIndex];
    const cardId = [state.forgeTier1, state.forgeTier2, state.forgeTier3].flat().find((id) => {
      const card = CARD_MAP.get(id)!;
      return card.cost.verdance > 0 || card.cost.radiance > 0;
    })!;
    player.luminaries.push("lum_orchard");
    expect(forge(state, cardId)).toEqual({ success: true });
    expect(state.pendingLuminaryActivationEvents).toHaveLength(1);
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(state.civilizationEventDeck.scheduled?.readyCardId).toBeTruthy();
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.civilizationEventDeck).toEqual(state.civilizationEventDeck);
    const priorId = restored.pendingLuminaryActivationEvents[0].eventId;
    expect(applyAction(restored, currentId(restored), { type: "resolve_luminary_activation", eventId: priorId })).toEqual({ success: true });
    expect(restored.pendingCivilizationEventCards).toHaveLength(1);
    const revealed = normalizeState(JSON.parse(JSON.stringify(restored)));
    expect(revealed.pendingCivilizationEventCards).toEqual(restored.pendingCivilizationEventCards);
    const eventId = resolve(revealed);
    const after = JSON.stringify(revealed);
    expect(applyAction(revealed, currentId(revealed), { type: "resolve_civilization_event", eventId })).toEqual({ success: true });
    expect(JSON.stringify(revealed)).toBe(after);
  });

  it("victory on the triggering Forge closes the Event window", () => {
    const state = game();
    pass(state, 8);
    const player = state.players[state.currentPlayerIndex];
    const cardId = state.forgeTier3[0];
    player.eminence = state.victoryRequirement! - CARD_MAP.get(cardId)!.eminence;
    expect(forge(state, cardId)).toEqual({ success: true });
    expect(state.phase).not.toBe("playing");
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(getEventForecast(state)?.status).toBe("closed");
  });

  it("a winning Luminary chain cancels its reserved Event mold and restores the delayed Artifact", () => {
    const state = game();
    const definitionId = "event_planetary_affinity_bloom";
    readyEvent(state, definitionId);
    state.activeLuminaries = ["lum_orchard"];
    const player = state.players[state.currentPlayerIndex];
    const cardId = state.forgeTier1[0];
    // The Artifact alone leaves two points; the subsequent Orchard arrival
    // grants three and closes the Event window before its reveal.
    player.eminence = state.victoryRequirement! - CARD_MAP.get(cardId)!.eminence - 2;
    const beforeArchive = [...state.deckTier1];
    expect(forge(state, cardId)).toEqual({ success: true });
    expect(state.pendingSummonEvents).toHaveLength(1);
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(state.forgeTier1[0]).toBe(definitionId);
    expect(state.deckTier1).toEqual(beforeArchive);
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    resolvePriorPresentations(restored);
    expect(restored.pendingCivilizationEventCards).toEqual([]);
    expect(restored.civilizationEventDeck.scheduled?.readyCardId).toBeNull();
    expect(restored.civilizationEventDeck.scheduled?.nextQueueIndex).toBe(0);
    expect(restored.forgeTier1[0]).toBe(beforeArchive[0]);
    expect(restored.deckTier1).toEqual(beforeArchive.slice(1));
    expect(getEventForecast(restored)?.status).toBe("closed");
  });

  it("an armed no-vacancy Forge can use a later burn refill after that burn presentation settles", () => {
    const state = game();
    const definitionId = "event_planetary_affinity_bloom";
    readyEvent(state, definitionId);
    state.turnCount = 2;
    const player = state.players[state.currentPlayerIndex];
    player.luminaries.push("lum_ember");
    state.luminaryAffinities.push({
      luminaryId: "lum_ember", ownerId: player.playerId, activeAffinity: "flare",
      eligibleAffinities: ["flare"], summonedAtTurnCount: 0,
    });
    const burnedId = state.forgeTier2[1];
    state.artifactMarkers = { [burnedId]: { type: "condemned", ownerId: player.playerId, summonedAtTurnCount: 0 } };
    const reservedId = state.deckTier1.shift()!;
    player.reservedArtifactIds.push(reservedId);
    const beforeArchive = [...state.deckTier2];
    expect(applyAction(state, player.playerId, { type: "forge_reserved_artifact", cardId: reservedId })).toEqual({ success: true });
    expect(state.pendingLuminaryActivationEvents).toHaveLength(1);
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(state.forgeTier2[1]).toBe(definitionId);
    expect(state.burnPile).toContain(burnedId);
    expect(state.deckTier2).toEqual(beforeArchive);
    resolvePriorPresentations(state);
    expect(state.pendingCivilizationEventCards[0].sourceCard).toMatchObject({ tier: 2, forgeSlotIndex: 1 });
    resolve(state);
    expect(state.forgeTier2[1]).toBe(beforeArchive[0]);
    expect(state.deckTier2).toEqual(beforeArchive.slice(1));
  });

  it("an Iron Harbinger refill claims only one genuine vacancy and leaves all returned Artifacts in play", () => {
    const state = game();
    const definitionId = "event_planetary_affinity_bloom";
    readyEvent(state, definitionId);
    state.activeLuminaries = ["lum_forge"];
    const player = state.players[state.currentPlayerIndex];
    const reservedId = state.deckTier1.shift()!;
    player.reservedArtifactIds.push(reservedId);
    const beforeSharedArtifacts = [state.forgeTier1, state.forgeTier2, state.forgeTier3,
      state.deckTier1, state.deckTier2, state.deckTier3].flat().sort();
    expect(applyAction(state, player.playerId, { type: "forge_reserved_artifact", cardId: reservedId })).toEqual({ success: true });
    const shared = [state.forgeTier1, state.forgeTier2, state.forgeTier3,
      state.deckTier1, state.deckTier2, state.deckTier3].flat();
    expect(shared.filter(isCivilizationEventCardId)).toEqual([definitionId]);
    expect(shared.filter((id) => CARD_MAP.has(id)).sort()).toEqual(beforeSharedArtifacts);
    expect(state.forgeTier3[0]).toBe(definitionId);
    expect(state.pendingCivilizationEventCards).toEqual([]);
    resolvePriorPresentations(state);
    expect(state.pendingCivilizationEventCards[0].sourceCard).toMatchObject({ tier: 3, forgeSlotIndex: 0 });
    resolve(state);
    expect([state.forgeTier1.length, state.forgeTier2.length, state.forgeTier3.length]).toEqual([4, 4, 4]);
  });

  it("last-round Forges and empty Archives cannot create a new Event", () => {
    const state = game();
    pass(state, 8);
    state.phase = "last_round";
    expect(forge(state)).toEqual({ success: true });
    expect(state.pendingCivilizationEventCards).toEqual([]);
    const exhausted = game();
    pass(exhausted, 8);
    const lastId = exhausted.forgeTier1[0];
    exhausted.forgeTier1 = [lastId];
    exhausted.forgeTier2 = []; exhausted.forgeTier3 = [];
    exhausted.deckTier1 = []; exhausted.deckTier2 = []; exhausted.deckTier3 = [];
    expect(forge(exhausted, lastId)).toEqual({ success: true });
    expect(exhausted.phase).toBe("finished");
    expect(exhausted.pendingCivilizationEventCards).toEqual([]);
  });

  it("a Forge intercepted by Antimatter does not consume the countdown", () => {
    const state = game();
    pass(state, 8);
    const claimant = state.players[state.currentPlayerIndex];
    const owner = state.players.find((player) => player !== claimant)!;
    const cardId = state.forgeTier2[0];
    owner.blueprintPrivateStates = [{
      blueprintId: "bp_antimatter_detonator", slotIndex: 0, matchedComponentIds: [],
      manifested: true, secretTargetCardId: cardId, safePreManifestActionPlayerIds: [],
    }];
    owner.manifestedBlueprintDevices = [{
      blueprintId: "bp_antimatter_detonator", ownerPlayerId: owner.playerId,
      slotIndex: 0, state: "armed", presentationVariant: "armored",
    }];
    expect(forge(state, cardId)).toEqual({ success: true });
    expect(claimant.forgedArtifactIds).not.toContain(cardId);
    expect(state.pendingBlueprintDetonationEvents).toHaveLength(1);
    expect(state.civilizationEventDeck.scheduled?.readyCardId).toBeNull();
    expect(state.pendingCivilizationEventCards).toEqual([]);
    expect(applyAction(state, claimant.playerId, {
      type: "resolve_blueprint_detonation", eventId: state.pendingBlueprintDetonationEvents[0].eventId,
    })).toEqual({ success: true });
    expect(getEventForecast(state)?.status).toBe("armed");
  });

  it("planning against a pending Orbital Drift sees its replacement once, without advancing the real queue", () => {
    const state = game();
    readyEvent(state, "event_planetary_forge_drift");
    expect(forge(state, state.forgeTier2[0])).toEqual({ success: true });
    const replacement = state.deckTier1[0];
    const beforeQueue = structuredClone(state.civilizationEventDeck);
    const beforeRows = structuredClone([state.forgeTier1, state.deckTier1]);
    const other = state.players.find((player) => player.playerId !== currentId(state))!;
    expect(applyAction(state, other.playerId, {
      type: "plan_action", plannedActionData: { type: "forge_artifact", cardId: replacement },
    })).toEqual({ success: true });
    expect(state.civilizationEventDeck).toEqual(beforeQueue);
    expect([state.forgeTier1, state.deckTier1]).toEqual(beforeRows);
    expect(state.pendingCivilizationEventCards).toHaveLength(1);
  });

  it("Terminus Tide can restore a genuinely empty mold while its Event occupies another tier", () => {
    const state = game();
    readyEvent(state, "event_galactic_terminus_tide");
    const burnedId = state.forgeTier3.pop()!;
    const remainingIds = [...state.forgeTier3];
    state.burnPile.push(burnedId);
    expect(forge(state)).toEqual({ success: true });
    expect(state.forgeTier3).toHaveLength(3);
    resolve(state);
    expect(state.forgeTier3).toHaveLength(4);
    expect(state.forgeTier3).toEqual(expect.arrayContaining([...remainingIds, burnedId]));
    expect(state.burnPile).not.toContain(burnedId);
    expect(getEventForecast(state)?.status).toBe("complete");
  });

  it("Terminus Tide counts its occupied Event mold and never creates a fifth slot", () => {
    const state = game();
    readyEvent(state, "event_galactic_terminus_tide");
    const burnedId = state.deckTier3.pop()!;
    state.burnPile.push(burnedId);
    const displacedId = state.forgeTier3[0];
    const delayedReplacement = state.deckTier3[0];
    expect(forge(state, state.forgeTier3[1])).toEqual({ success: true });
    expect(state.forgeTier3).toHaveLength(4);
    resolve(state);
    expect(state.forgeTier3).toHaveLength(4);
    expect(state.forgeTier3[0]).toBe(burnedId);
    expect(state.forgeTier3[1]).toBe(delayedReplacement);
    expect(state.deckTier3).toContain(displacedId);
    expect(state.forgeTier3.some(isCivilizationEventCardId)).toBe(false);
  });

  it("legacy appended scheduled receipts remain temporary after reconnect and consume no extra Artifact", () => {
    const state = game();
    const definitionId = "event_planetary_affinity_bloom";
    readyEvent(state, definitionId);
    expect(forge(state)).toEqual({ success: true });
    // Emulate the old delivery: the Artifact refill already happened and the
    // pending Event was appended beside the row with a null source slot.
    state.forgeTier1[0] = state.deckTier1.shift()!;
    state.forgeTier1.push(definitionId);
    state.pendingCivilizationEventCards[0].sourceCard!.forgeSlotIndex = null;
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    const beforeArtifacts = restored.forgeTier1.filter((id) => CARD_MAP.has(id));
    const beforeArchive = [...restored.deckTier1];
    expect(formatGameState("room", "playing", restored, new Set()).forgeTier1.map((card) => card?.id)).toEqual(beforeArtifacts);
    resolve(restored);
    expect(restored.forgeTier1).toEqual(beforeArtifacts);
    expect(restored.deckTier1).toEqual(beforeArchive);
  });

  it("an Event can occupy a depleted tier and leaves that mold empty after acknowledgement", () => {
    const state = game();
    readyEvent(state, "event_planetary_affinity_bloom");
    const lastId = state.forgeTier3[0];
    state.forgeTier3 = [lastId];
    state.deckTier3 = [];
    expect(forge(state, lastId)).toEqual({ success: true });
    expect(state.forgeTier3).toEqual(["event_planetary_affinity_bloom"]);
    expect(formatGameState("room", "playing", state, new Set()).forgeTier3).toEqual([null]);
    resolve(state);
    expect(state.forgeTier3).toEqual([]);
    expect(state.phase).toBe("playing");
  });

  it("an older saved regular match never gains a countdown on normalization", () => {
    const state = game();
    delete state.civilizationEventDeck.delivery;
    delete state.civilizationEventDeck.scheduled;
    delete state.initialBoard!.eventDelivery;
    delete state.initialBoard!.eventSchedule;
    const eventId = state.civilizationEventDeck.definitionIds[0];
    state.deckTier1.unshift(eventId);
    const restored = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(restored.civilizationEventDeck.delivery).toBe("archive_v1");
    expect(restored.civilizationEventDeck.scheduled).toBeUndefined();
    expect(restored.deckTier1[0]).toBe(eventId);
    expect(formatGameState("room", "playing", restored, new Set()).eventForecast).toBeUndefined();
  });

  it("same-board replay resets the exact separate queue and schedule, preserving the old Archive delivery of older boards", () => {
    const state = game(3, "frequent");
    const initialQueue = [...state.civilizationEventDeck.scheduled!.queue];
    pass(state, 12);
    expect(forge(state)).toEqual({ success: true });
    resolve(state);
    const replay = initializeGame(state.players.map((p) => ({ id: p.playerId, name: p.playerName })), 3, 100, "standard", {
      replayBoard: getReplayBoardSnapshot(state), eventFrequency: "off",
    });
    expect(replay.civilizationEventDeck.delivery).toBe("scheduled_forge_v1");
    expect(replay.civilizationEventDeck.scheduled).toMatchObject({ queue: initialQueue, nextQueueIndex: 0, dueAfterTurnCount: 12, readyCardId: null });
    const legacyBoard = getReplayBoardSnapshot(game());
    delete legacyBoard.eventDelivery; delete legacyBoard.eventSchedule;
    legacyBoard.deckTier1.push(legacyBoard.selectedEventDefinitionIds!.find((id) => CIVILIZATION_EVENT_CARD_DEFINITIONS[id].tier === 1)!);
    const legacy = initializeGame([{ id: "p0", name: "Zero" }, { id: "p1", name: "One" }], 2, 20, "standard", { replayBoard: legacyBoard });
    expect(legacy.civilizationEventDeck.delivery).toBe("archive_v1");
    expect(legacy.deckTier1).toEqual(legacyBoard.deckTier1);
    expect(getEventForecast(legacy)).toBeNull();
  });
});
