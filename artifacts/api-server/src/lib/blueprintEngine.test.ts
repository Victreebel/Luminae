import { describe, expect, it } from "vitest";
import {
  BLUEPRINT_DEFINITIONS,
  type BlueprintId,
  type ManifestedDevicePublicState,
} from "@workspace/game-types";
import {
  CARD_MAP,
  STANDARD_AFFINITY_KEYS,
  applyAction,
  formatGameState,
  initializeGame,
  normalizeState,
  refreshTurnStartTechnologyOpportunity,
  type GameStateData,
  type PlayerGameState,
} from "./gameEngine.js";
import { filterStateForPlayer } from "./stateProjection.js";

function makeBlueprintGame(
  p1Blueprints: BlueprintId[],
  p2Blueprints: BlueprintId[] = [],
): GameStateData {
  const state = normalizeState(initializeGame(
    [
      { id: "p1", name: "Player 1" },
      { id: "p2", name: "Player 2" },
    ],
    2,
    15,
    "standard",
    {
      blueprintSetups: {
        p1: { blueprintIds: p1Blueprints },
        p2: { blueprintIds: p2Blueprints },
      },
    },
  ));
  state.currentPlayerIndex = 0;
  state.openingTurnOrder = null;
  if (state.initialBoard) state.initialBoard.firstPlayerId = state.players[0]!.playerId;
  return state;
}

function removeFromBoard(state: GameStateData, cardId: string): void {
  for (const collection of [
    state.forgeTier1,
    state.forgeTier2,
    state.forgeTier3,
    state.deckTier1,
    state.deckTier2,
    state.deckTier3,
  ]) {
    const index = collection.indexOf(cardId);
    if (index >= 0) collection.splice(index, 1);
  }
}

function placeInForge(state: GameStateData, cardId: string): void {
  const card = CARD_MAP.get(cardId);
  if (!card) throw new Error(`Unknown test card ${cardId}`);
  removeFromBoard(state, cardId);
  const row = card.tier === 1
    ? state.forgeTier1
    : card.tier === 2
      ? state.forgeTier2
      : state.forgeTier3;
  const deck = card.tier === 1
    ? state.deckTier1
    : card.tier === 2
      ? state.deckTier2
      : state.deckTier3;
  const displaced = row[0];
  if (displaced) deck.push(displaced);
  if (row.length === 0) row.push(cardId);
  else row[0] = cardId;
}

function giveAffinities(state: GameStateData, player: PlayerGameState, amount = 10): void {
  for (const affinity of STANDARD_AFFINITY_KEYS) {
    player.affinities[affinity] = amount;
    state.affinityWell[affinity] = 30;
  }
  player.affinities.singularity = 0;
  state.affinityWell.singularity = 0;
}

function giveComponents(player: PlayerGameState, blueprintId: BlueprintId): string[] {
  const componentIds = BLUEPRINT_DEFINITIONS[blueprintId].components.map(
    (component) => component.artifactId,
  );
  player.forgedArtifactIds.push(...componentIds);
  return componentIds;
}

function triggerManifestation(
  state: GameStateData,
  player: PlayerGameState,
  triggerCardId = "t1e02",
): void {
  placeInForge(state, triggerCardId);
  giveAffinities(state, player);
  const result = applyAction(state, player.playerId, {
    type: "forge_artifact",
    cardId: triggerCardId,
  });
  expect(result).toEqual({ success: true });
}

function acknowledgeManifestations(state: GameStateData, playerId = "p1"): void {
  for (const event of [...state.pendingBlueprintManifestationEvents]) {
    expect(applyAction(state, playerId, {
      type: "resolve_blueprint_manifestation",
      eventId: event.eventId,
    })).toEqual({ success: true });
  }
}

function acknowledgeProjectEffects(state: GameStateData, playerId = "p1"): void {
  for (const event of [...state.pendingBlueprintDetonationEvents]) {
    expect(applyAction(state, playerId, {
      type: "resolve_blueprint_detonation",
      eventId: event.eventId,
    })).toEqual({ success: true });
  }
}

function getDevice(
  player: PlayerGameState,
  blueprintId: BlueprintId,
): ManifestedDevicePublicState {
  const device = player.manifestedBlueprintDevices?.find(
    (candidate) => candidate.blueprintId === blueprintId,
  );
  if (!device) throw new Error(`${blueprintId} did not manifest`);
  return device;
}

function resetTurn(state: GameStateData, playerIndex: number): void {
  state.currentPlayerIndex = playerIndex;
  state.coreActionUsed = false;
  state.pendingTurnTransition = null;
  state.pendingSummonEvents = [];
  state.pendingLuminaryActivationEvents = [];
  state.pendingLuminaryChoice = null;
}

function totalHeld(player: PlayerGameState): number {
  return STANDARD_AFFINITY_KEYS.reduce(
    (sum, affinity) => sum + player.affinities[affinity],
    player.affinities.singularity,
  );
}

describe("Blueprint secrecy and manifestation", () => {
  it("keeps identity and progress owner-only before manifestation", () => {
    const state = makeBlueprintGame(["bp_antimatter_detonator"]);
    state.players[0].forgedArtifactIds.push("t1r01");
    triggerManifestation(state, state.players[0], "t1e03");

    const formatted = formatGameState("room", "playing", state, new Set(["p1", "p2"]));
    const ownerView = filterStateForPlayer(formatted, "p1");
    const opponentView = filterStateForPlayer(formatted, "p2");

    expect(ownerView.players[0].blueprintPrivateStates).toHaveLength(1);
    expect(ownerView.players[0].blueprintPrivateStates?.[0].matchedComponentIds)
      .toContain("t1r01");
    expect(opponentView.players[0]).not.toHaveProperty("blueprintPrivateStates");
    expect(opponentView.players[0].manifestedBlueprintDevices).toEqual([]);
  });

  it("queues simultaneous manifestations in assigned-slot order without consuming components", () => {
    const state = makeBlueprintGame([
      "bp_worldshield_covenant",
      "bp_mantle_to_orbit_foundry",
    ]);
    const player = state.players[0];
    const worldshieldComponents = giveComponents(player, "bp_worldshield_covenant");
    const foundryComponents = giveComponents(player, "bp_mantle_to_orbit_foundry");

    triggerManifestation(state, player);

    expect(state.pendingBlueprintManifestationEvents.map((event) => event.blueprintId))
      .toEqual(["bp_worldshield_covenant", "bp_mantle_to_orbit_foundry"]);
    expect(player.forgedArtifactIds).toEqual(
      expect.arrayContaining([...worldshieldComponents, ...foundryComponents]),
    );
    expect(player.eminence).toBe(2);
  });

  it("requires Forged components and never counts Assimilated technologies", () => {
    const state = makeBlueprintGame(["bp_worldshield_covenant"]);
    const player = state.players[0];
    const componentIds = BLUEPRINT_DEFINITIONS.bp_worldshield_covenant.components.map(
      (component) => component.artifactId,
    );
    player.forgedArtifactIds.push(...componentIds.slice(0, 2));
    player.assimilatedArtifactIds = [componentIds[2]];

    triggerManifestation(state, player);

    expect(player.blueprintPrivateStates?.[0].matchedComponentIds).toEqual(componentIds.slice(0, 2));
    expect(player.blueprintPrivateStates?.[0].manifested).toBe(false);
    expect(player.manifestedBlueprintDevices).toEqual([]);
  });

  it("reveals only the manifested device and presentation while the secret target stays owner-only", () => {
    const state = makeBlueprintGame(["bp_antimatter_detonator"]);
    const owner = state.players[0];
    giveComponents(owner, "bp_antimatter_detonator");
    triggerManifestation(state, owner);

    const formatted = formatGameState("room", "playing", state, new Set(["p1", "p2"]));
    const ownerView = filterStateForPlayer(formatted, "p1");
    const opponentView = filterStateForPlayer(formatted, "p2");

    expect(ownerView.players[0].blueprintPrivateStates?.[0].secretTargetCardId).toBeTruthy();
    expect(opponentView.players[0]).not.toHaveProperty("blueprintPrivateStates");
    expect(opponentView.players[0].manifestedBlueprintDevices?.[0]).toMatchObject({
      blueprintId: "bp_antimatter_detonator",
      ownerPlayerId: "p1",
      presentationVariant: "armored",
    });
    expect(JSON.stringify(opponentView)).not.toContain("secretTargetCardId");
  });
});

describe("Antimatter Detonator", () => {
  function armedAntimatterGame() {
    const state = makeBlueprintGame(["bp_antimatter_detonator"]);
    const owner = state.players[0];
    giveComponents(owner, "bp_antimatter_detonator");
    triggerManifestation(state, owner);
    const privateState = owner.blueprintPrivateStates![0];
    expect(privateState.secretTargetCardId).toBeTruthy();
    acknowledgeManifestations(state);
    return { state, owner, privateState };
  }

  it("annihilates a legal Forge claim before payment and grants its owner 2 Eminence", () => {
    const { state, owner, privateState } = armedAntimatterGame();
    const claimant = state.players[1];
    const targetCardId = privateState.secretTargetCardId!;
    const targetSlotIndex = state.forgeTier2.indexOf(targetCardId);
    giveAffinities(state, claimant);
    const beforeAffinity = totalHeld(claimant);

    expect(applyAction(state, claimant.playerId, {
      type: "forge_artifact",
      cardId: targetCardId,
    })).toEqual({ success: true });

    expect(totalHeld(claimant)).toBe(beforeAffinity);
    expect(claimant.forgedArtifactIds).not.toContain(targetCardId);
    expect(state.annihilatedArtifactIds).toContain(targetCardId);
    expect(owner.eminence).toBe(2);
    expect(getDevice(owner, "bp_antimatter_detonator").state).toBe("spent");
    expect(state.pendingBlueprintDetonationEvents).toHaveLength(1);
    expect(state.pendingBlueprintDetonationEvents[0]).toMatchObject({
      targetSlotId: `2-${targetSlotIndex}`,
    });
  });

  it("annihilates a legal Encrypt claim without awarding or taking Affinity", () => {
    const { state, owner, privateState } = armedAntimatterGame();
    const claimant = state.players[1];
    const targetCardId = privateState.secretTargetCardId!;
    const beforeAffinity = { ...claimant.affinities };

    expect(applyAction(state, claimant.playerId, {
      type: "reserve_artifact",
      cardId: targetCardId,
    })).toEqual({ success: true });

    expect(claimant.affinities).toEqual(beforeAffinity);
    expect(claimant.reservedArtifactIds).not.toContain(targetCardId);
    expect(state.annihilatedArtifactIds).toContain(targetCardId);
    expect(owner.eminence).toBe(2);
  });

  it("adds exactly two eligible Tier I collateral targets after a broken Covenant", () => {
    const { state, owner, privateState } = armedAntimatterGame();
    const claimant = state.players[1];
    const targetCardId = privateState.secretTargetCardId!;
    claimant.forgedArtifactIds = ["t1e01", "t1e02", "t2r01"];
    state.brokenCovenantDeclared = true;
    getDevice(owner, "bp_antimatter_detonator").covenantState = "broken";
    giveAffinities(state, claimant);

    expect(applyAction(state, claimant.playerId, {
      type: "forge_artifact",
      cardId: targetCardId,
    })).toEqual({ success: true });

    expect(state.pendingBlueprintDetonationEvents[0].collateralCardIds).toHaveLength(2);
    expect(claimant.forgedArtifactIds).toEqual(["t2r01"]);
  });

  it("is intercepted by a vigilant Worldshield and lets the claim continue normally", () => {
    const { state, owner, privateState } = armedAntimatterGame();
    const claimant = state.players[1];
    claimant.manifestedBlueprintDevices = [{
      blueprintId: "bp_worldshield_covenant",
      ownerPlayerId: claimant.playerId,
      slotIndex: 0,
      state: "vigilant",
      covenantState: "intact",
      presentationVariant: "armored",
    }];
    const targetCardId = privateState.secretTargetCardId!;
    giveAffinities(state, claimant);

    expect(applyAction(state, claimant.playerId, {
      type: "forge_artifact",
      cardId: targetCardId,
    })).toEqual({ success: true });

    expect(claimant.forgedArtifactIds).toContain(targetCardId);
    expect(state.annihilatedArtifactIds).not.toContain(targetCardId);
    expect(owner.eminence).toBe(0);
    expect(getDevice(owner, "bp_antimatter_detonator").state).toBe("spent");
    expect(getDevice(claimant, "bp_worldshield_covenant").state).toBe("spent");
    expect(state.pendingBlueprintDetonationEvents[0].interceptedByBlueprintId)
      .toBe("bp_worldshield_covenant");
  });

  it("waits unarmed-without-a-target when no Tier II Artifact is face up", () => {
    const state = makeBlueprintGame(["bp_antimatter_detonator"]);
    const owner = state.players[0];
    giveComponents(owner, "bp_antimatter_detonator");
    state.forgeTier2 = [];
    state.deckTier2 = [];

    triggerManifestation(state, owner);

    expect(owner.blueprintPrivateStates?.[0].secretTargetCardId).toBeNull();
    expect(getDevice(owner, "bp_antimatter_detonator").state).toBe("armed");
  });

  it("retargets when its marked Artifact leaves through Assimilation", () => {
    const { state, privateState } = armedAntimatterGame();
    const claimant = state.players[1];
    const originalTarget = privateState.secretTargetCardId!;
    resetTurn(state, 1);
    state.firstHungerAvailable = claimant.playerId;

    expect(applyAction(state, claimant.playerId, {
      type: "assimilate",
      cardId: originalTarget,
    })).toEqual({ success: true });

    expect(state.annihilatedArtifactIds).not.toContain(originalTarget);
    expect(privateState.secretTargetCardId).toBeTruthy();
    expect(privateState.secretTargetCardId).not.toBe(originalTarget);
    expect(state.forgeTier2).toContain(privateState.secretTargetCardId!);
  });

  it("allows a plan submitted before manifestation to resolve safely before selecting a target", () => {
    const state = makeBlueprintGame(["bp_antimatter_detonator"]);
    const owner = state.players[0];
    const claimant = state.players[1];
    const plannedCardId = state.forgeTier2[0]!;
    giveAffinities(state, claimant);
    expect(applyAction(state, claimant.playerId, {
      type: "plan_action",
      plannedActionData: { type: "forge_artifact", cardId: plannedCardId },
    })).toEqual({ success: true });

    giveComponents(owner, "bp_antimatter_detonator");
    triggerManifestation(state, owner);
    const privateState = owner.blueprintPrivateStates![0];
    expect(privateState.secretTargetCardId).toBeNull();
    expect(privateState.safePreManifestActionPlayerIds).toContain(claimant.playerId);
    acknowledgeManifestations(state);

    expect(state.currentPlayerIndex).toBe(1);
    expect(applyAction(state, claimant.playerId, { type: "execute_plan" }))
      .toEqual({ success: true });
    expect(claimant.forgedArtifactIds).toContain(plannedCardId);
    expect(state.annihilatedArtifactIds).not.toContain(plannedCardId);
    expect(privateState.safePreManifestActionPlayerIds).not.toContain(claimant.playerId);
    expect(privateState.secretTargetCardId).toBeTruthy();
  });

  it("awards detonation Eminence before final victory is resolved", () => {
    const { state, owner, privateState } = armedAntimatterGame();
    const claimant = state.players[1];
    owner.eminence = 14;
    resetTurn(state, 1);
    giveAffinities(state, claimant);

    expect(applyAction(state, claimant.playerId, {
      type: "forge_artifact",
      cardId: privateState.secretTargetCardId!,
    })).toEqual({ success: true });
    expect(owner.eminence).toBe(16);
    expect(state.phase).not.toBe("finished");

    const event = state.pendingBlueprintDetonationEvents[0];
    expect(applyAction(state, owner.playerId, {
      type: "resolve_blueprint_detonation",
      eventId: event.eventId,
    })).toEqual({ success: true });
    expect(state.phase).toBe("finished");
    expect(state.winnerId).toBe(owner.playerId);
  });
});

describe("Mantle-to-Orbit Foundry", () => {
  it("keeps the real orbital-forge activation visible in the Lumii forecast", () => {
    const state = makeBlueprintGame([
      "bp_antimatter_detonator",
      "bp_mantle_to_orbit_foundry",
    ]);
    const player = state.players[0];
    giveComponents(player, "bp_mantle_to_orbit_foundry");
    triggerManifestation(state, player);
    acknowledgeManifestations(state);
    resetTurn(state, 0);
    state.lumiiThresholdApproach = "inquiry";

    const tier2Id = "t2r01";
    placeInForge(state, tier2Id);
    giveAffinities(state, player);
    expect(applyAction(state, player.playerId, {
      type: "foundry_forge_artifact",
      cardId: tier2Id,
    })).toEqual({ success: true });

    const event = state.pendingBlueprintDetonationEvents[0];
    expect(event).toMatchObject({
      blueprintId: "bp_mantle_to_orbit_foundry",
      ownerPlayerId: player.playerId,
      targetCardId: tier2Id,
    });

    const formatted = formatGameState(
      "room",
      "playing",
      state,
      new Set(["p1", "p2"]),
      undefined,
      undefined,
      "blueprint_clearance_lumii",
    );
    const projected = filterStateForPlayer(formatted, "p2");
    expect(projected.pendingBlueprintDetonationEvents).toContainEqual(expect.objectContaining({
      eventId: event.eventId,
      blueprintId: "bp_mantle_to_orbit_foundry",
      targetCardId: tier2Id,
    }));
    expect(projected.pendingScenarioProtocolEvents).toEqual([]);
    expect(JSON.stringify(projected)).toContain("bp_mantle_to_orbit_foundry");
  });

  it("grants 1 Eminence and gives two sustainable explicit Tier II Foundry Forges", () => {
    const state = makeBlueprintGame(["bp_mantle_to_orbit_foundry"]);
    const player = state.players[0];
    giveComponents(player, "bp_mantle_to_orbit_foundry");
    triggerManifestation(state, player);
    expect(player.eminence).toBe(1);
    acknowledgeManifestations(state);

    resetTurn(state, 0);
    const tier2Id = "t2r01";
    const tier2 = CARD_MAP.get(tier2Id)!;
    placeInForge(state, tier2Id);
    giveAffinities(state, player);
    const expectedTier2Cost = STANDARD_AFFINITY_KEYS.reduce(
      (sum, affinity) => sum + Math.max(
        0,
        (tier2.cost[affinity] > 0 ? tier2.cost[affinity] - 1 : 0) - player.bonuses[affinity],
      ),
      0,
    );
    const tier2Before = totalHeld(player);
    expect(applyAction(state, player.playerId, {
      type: "foundry_forge_artifact",
      cardId: tier2Id,
    })).toEqual({ success: true });
    expect(tier2Before - totalHeld(player)).toBe(expectedTier2Cost);
    expect(getDevice(player, "bp_mantle_to_orbit_foundry").foundryUses).toBe(1);

    acknowledgeProjectEffects(state);
    resetTurn(state, 0);
    const secondTier2Id = "t2s01";
    placeInForge(state, secondTier2Id);
    giveAffinities(state, player);
    expect(applyAction(state, player.playerId, {
      type: "foundry_forge_artifact",
      cardId: secondTier2Id,
    })).toEqual({ success: true });
    expect(getDevice(player, "bp_mantle_to_orbit_foundry")).toMatchObject({
      state: "active",
      foundryUses: 2,
      foundryOverdriveAvailable: true,
    });

    acknowledgeProjectEffects(state);
    resetTurn(state, 0);
    const tier3Id = "t3r01";
    placeInForge(state, tier3Id);
    expect(applyAction(state, player.playerId, {
      type: "foundry_forge_artifact",
      cardId: tier3Id,
    })).toEqual({
      success: false,
      error: "Foundry Forge can claim only Tier II Artifacts",
    });
  });

  it("Overdrives only with confirmation and returns Intact components to the Tier I Archive", () => {
    const state = makeBlueprintGame(["bp_mantle_to_orbit_foundry"]);
    const player = state.players[0];
    const componentIds = giveComponents(player, "bp_mantle_to_orbit_foundry");
    triggerManifestation(state, player);
    acknowledgeManifestations(state);
    resetTurn(state, 0);
    const foundry = getDevice(player, "bp_mantle_to_orbit_foundry");
    foundry.foundryUses = 2;
    foundry.foundryOverdriveAvailable = true;
    const cardId = "t2r01";
    placeInForge(state, cardId);
    giveAffinities(state, player);

    expect(applyAction(state, player.playerId, {
      type: "foundry_forge_artifact",
      cardId,
    })).toEqual({
      success: false,
      error: "Confirm Overdrive before the Foundry's third use",
    });
    expect(applyAction(state, player.playerId, {
      type: "foundry_forge_artifact",
      cardId,
      confirmOverdrive: true,
    })).toEqual({ success: true });
    expect(foundry.state).toBe("deactivated");
    expect(player.forgedArtifactIds).not.toEqual(expect.arrayContaining(componentIds));
    expect(state.deckTier1).toEqual(expect.arrayContaining(componentIds));
  });

  it("preserves Broken Overdrive components privately and reactivates through three free Forges", () => {
    const state = makeBlueprintGame(["bp_mantle_to_orbit_foundry"]);
    const player = state.players[0];
    const componentIds = giveComponents(player, "bp_mantle_to_orbit_foundry");
    for (const componentId of componentIds) removeFromBoard(state, componentId);
    triggerManifestation(state, player);
    acknowledgeManifestations(state);
    resetTurn(state, 0);
    const foundry = getDevice(player, "bp_mantle_to_orbit_foundry");
    foundry.covenantState = "broken";
    foundry.foundryUses = 2;
    foundry.foundryOverdriveAvailable = true;
    const cardId = "t2r01";
    placeInForge(state, cardId);
    giveAffinities(state, player);

    expect(applyAction(state, player.playerId, {
      type: "foundry_forge_artifact",
      cardId,
      confirmOverdrive: true,
    })).toEqual({ success: true });
    expect(foundry).toMatchObject({
      state: "recovering",
      foundryRecoveredComponentCount: 0,
    });
    expect(player.blueprintPrivateStates?.[0].foundryRecoveryComponentIds).toEqual(componentIds);
    expect(state.deckTier1).not.toEqual(expect.arrayContaining(componentIds));

    const opponentView = filterStateForPlayer(
      formatGameState("room", "playing", state, new Set(["p1", "p2"])),
      "p2",
    );
    expect(JSON.stringify(opponentView)).not.toContain("foundryRecoveryComponentIds");

    acknowledgeProjectEffects(state);
    const eminenceAfterOverdrive = player.eminence;
    for (const [index, componentId] of componentIds.entries()) {
      resetTurn(state, 0);
      const beforeAffinity = { ...player.affinities };
      expect(applyAction(state, player.playerId, {
        type: "recover_foundry_component",
        cardId: componentId,
      })).toEqual({ success: true });
      expect(player.affinities).toEqual(beforeAffinity);
      expect(foundry.foundryRecoveredComponentCount).toBe(index + 1);
    }

    expect(foundry).toMatchObject({
      state: "active",
      foundryUses: 0,
      foundryOverdriveAvailable: false,
    });
    expect(player.forgedArtifactIds).toEqual(expect.arrayContaining(componentIds));
    expect(player.eminence).toBe(eminenceAfterOverdrive);
  });
});

describe("Ascension Registry", () => {
  function manifestedRegistry(covenantState: "intact" | "broken") {
    const state = makeBlueprintGame(["bp_ascension_registry"]);
    const owner = state.players[0];
    giveComponents(owner, "bp_ascension_registry");
    triggerManifestation(state, owner);
    acknowledgeManifestations(state);
    const registry = getDevice(owner, "bp_ascension_registry");
    registry.covenantState = covenantState;
    return { state, owner, registry };
  }

  function deferTierTwo(state: GameStateData, playerIndex: number): void {
    resetTurn(state, playerIndex);
    refreshTurnStartTechnologyOpportunity(state);
    expect(state.tierTwoOpportunityAtTurnStart).toBe(true);
    expect(applyAction(state, state.players[playerIndex]!.playerId, { type: "pass" }))
      .toEqual({ success: true });
  }

  it("records no more than one public Deferral per round and spends after judgment", () => {
    const { state, owner, registry } = manifestedRegistry("intact");
    deferTierTwo(state, 1);
    expect(registry.ascensionDeferral).toBe(1);

    state.roundNumber = registry.ascensionLastCounterRound!;
    resetTurn(state, 1);
    refreshTurnStartTechnologyOpportunity(state);
    expect(applyAction(state, state.players[1]!.playerId, { type: "pass" }))
      .toEqual({ success: true });
    expect(registry.ascensionDeferral).toBe(1);

    state.roundNumber++;
    deferTierTwo(state, 1);
    expect(registry).toMatchObject({ state: "spent", ascensionDeferral: 2 });
    expect(owner.eminence).toBe(2);
  });

  it("clears a Broken judgment and remains Active for repeated judgments", () => {
    const { state, owner, registry } = manifestedRegistry("broken");
    deferTierTwo(state, 1);
    state.roundNumber++;
    deferTierTwo(state, 1);
    expect(registry).toMatchObject({ state: "active", ascensionDeferral: 0 });
    expect(owner.eminence).toBe(2);

    state.roundNumber++;
    deferTierTwo(state, 1);
    state.roundNumber++;
    deferTierTwo(state, 1);
    expect(registry).toMatchObject({ state: "active", ascensionDeferral: 0 });
    expect(owner.eminence).toBe(4);
  });

  it("clears every active Registry when any legal Tier II claim resolves", () => {
    const { state, registry } = manifestedRegistry("intact");
    registry.ascensionDeferral = 1;
    resetTurn(state, 1);
    const claimant = state.players[1]!;
    const cardId = state.forgeTier2[0]!;
    giveAffinities(state, claimant);
    expect(applyAction(state, claimant.playerId, {
      type: "reserve_artifact",
      cardId,
    })).toEqual({ success: true });
    expect(registry.ascensionDeferral).toBe(0);
  });
});

describe("civilization identity milestones", () => {
  it("freezes the selected identity when the first Project manifests", () => {
    const state = makeBlueprintGame(["bp_ascension_registry"]);
    const player = state.players[0];
    player.civilizationIdentity = {
      lineage: "accord",
      affinity: "radiance",
      signatureArtifactId: null,
      signatureLuminaryId: null,
      signatureBlueprintId: "bp_ascension_registry",
      displayName: "The Radiant Concord",
      scaleType: 1,
      scaleLabel: "Kardashev Type I",
      projectEpithet: "Ascension Registry",
    };
    giveComponents(player, "bp_ascension_registry");
    triggerManifestation(state, player);

    expect(player.civilizationIdentitySnapshot).toMatchObject({
      displayName: "The Radiant Concord",
      projectEpithet: "Ascension Registry",
    });
    player.civilizationIdentity.displayName = "The Ember Foundry";
    expect(player.civilizationIdentitySnapshot?.displayName).toBe("The Radiant Concord");
  });
});
