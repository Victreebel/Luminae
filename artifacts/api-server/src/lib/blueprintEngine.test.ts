import { describe, expect, it } from "vitest";
import {
  BLUEPRINT_DEFINITIONS,
  ordinaryEncryptedCount,
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
  type GameStateData,
  type PlayerGameState,
} from "./gameEngine.js";
import { chooseAiAction } from "./aiPlayer.js";
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
    const { state, privateState } = armedAntimatterGame();
    const claimant = state.players[1];
    const targetCardId = privateState.secretTargetCardId!;
    claimant.forgedArtifactIds = ["t1e01", "t1e02", "t2r01"];
    claimant.artifactForgeCounts = { t1e01: 1, t1e02: 1, t2r01: 1 };
    claimant.eminence = 9;
    state.brokenCovenantDeclared = true;
    giveAffinities(state, claimant);

    expect(applyAction(state, claimant.playerId, {
      type: "forge_artifact",
      cardId: targetCardId,
    })).toEqual({ success: true });

    expect(state.pendingBlueprintDetonationEvents[0].collateralCardIds).toHaveLength(2);
    expect(claimant.forgedArtifactIds).toEqual(["t2r01"]);
    expect(claimant.eminence).toBe(9);
    expect(claimant.civilization.artifacts.t1e01).toMatchObject({
      masteryCount: 1,
      implementationState: "annihilated",
      implementationChangeSource: {
        sourceType: "blueprint",
        sourceId: "bp_antimatter_detonator",
      },
    });
    expect(claimant.civilization.artifacts.t1e02).toMatchObject({
      masteryCount: 1,
      implementationState: "annihilated",
      implementationChangeSource: {
        sourceType: "blueprint",
        sourceId: "bp_antimatter_detonator",
      },
    });
    expect(claimant.civilization.artifacts.t2r01).toMatchObject({
      masteryCount: 1,
      implementationState: "operational",
    });
    expect(claimant.artifactForgeCounts).toMatchObject({ t1e01: 1, t1e02: 1, t2r01: 1 });
    expect(claimant.civilization.affinityIdentity.historicalCounts.verdance).toBe(2);
    expect(claimant.civilization.affinityIdentity.operationalCounts.verdance).toBe(0);

    normalizeState(state);
    const restoredClaimant = state.players.find((player) => player.playerId === claimant.playerId)!;
    expect(restoredClaimant.civilization.artifacts.t1e01.implementationState)
      .toBe("annihilated");
    expect(restoredClaimant.civilization.artifacts.t1e02.implementationState)
      .toBe("annihilated");
    expect(restoredClaimant.civilization.artifacts.t2r01.implementationState)
      .toBe("operational");
  });

  it("is intercepted by a vigilant Worldshield and lets the claim continue normally", () => {
    const { state, owner, privateState } = armedAntimatterGame();
    const claimant = state.players[1];
    claimant.manifestedBlueprintDevices = [{
      blueprintId: "bp_worldshield_covenant",
      ownerPlayerId: claimant.playerId,
      slotIndex: 0,
      state: "vigilant",
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

  it("keeps Worldshield vigilant under Broken Covenant and prevents all collateral", () => {
    const { state, owner, privateState } = armedAntimatterGame();
    const claimant = state.players[1];
    claimant.forgedArtifactIds = ["t1e01", "t1e02"];
    claimant.artifactForgeCounts = { t1e01: 1, t1e02: 1 };
    claimant.manifestedBlueprintDevices = [{
      blueprintId: "bp_worldshield_covenant",
      ownerPlayerId: claimant.playerId,
      slotIndex: 0,
      state: "vigilant",
      presentationVariant: "armored",
    }];
    state.brokenCovenantDeclared = true;
    const targetCardId = privateState.secretTargetCardId!;
    giveAffinities(state, claimant);

    expect(applyAction(state, claimant.playerId, {
      type: "forge_artifact",
      cardId: targetCardId,
    })).toEqual({ success: true });

    expect(claimant.forgedArtifactIds).toContain(targetCardId);
    expect(claimant.forgedArtifactIds).toEqual(expect.arrayContaining(["t1e01", "t1e02"]));
    expect(state.annihilatedArtifactIds).not.toContain(targetCardId);
    expect(owner.eminence).toBe(0);
    expect(getDevice(owner, "bp_antimatter_detonator").state).toBe("spent");
    expect(getDevice(claimant, "bp_worldshield_covenant").state).toBe("vigilant");
    expect(state.pendingBlueprintDetonationEvents[0].collateralCardIds ?? []).toEqual([]);
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
  it("grants 1 Eminence and discounts only an explicit Tier II Foundry Forge", () => {
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
    const tier2Before = totalHeld(player);
    expect(applyAction(state, player.playerId, {
      type: "forge_artifact",
      cardId: tier2Id,
    })).toEqual({ success: true });
    expect(tier2Before - totalHeld(player)).toBe(
      Object.values(tier2.cost).reduce((sum, value) => sum + value, 0),
    );
    expect(getDevice(player, "bp_mantle_to_orbit_foundry").foundryUsesRemaining).toBe(2);

    resetTurn(state, 0);
    const foundryCardId = "t2r02";
    const foundryCard = CARD_MAP.get(foundryCardId)!;
    placeInForge(state, foundryCardId);
    giveAffinities(state, player);
    const baseCost = STANDARD_AFFINITY_KEYS.reduce(
      (sum, affinity) => sum + Math.max(0, foundryCard.cost[affinity] - player.bonuses[affinity]),
      0,
    );
    const discountedChannels = STANDARD_AFFINITY_KEYS.filter(
      (affinity) =>
        foundryCard.cost[affinity] > 0 &&
        Math.max(0, foundryCard.cost[affinity] - player.bonuses[affinity]) > 0,
    ).length;
    const beforeFoundry = totalHeld(player);
    expect(applyAction(state, player.playerId, {
      type: "forge_artifact",
      cardId: foundryCardId,
      blueprintAction: "foundry_sustainable",
    })).toEqual({ success: true });
    expect(beforeFoundry - totalHeld(player)).toBe(baseCost - discountedChannels);
    expect(getDevice(player, "bp_mantle_to_orbit_foundry")).toMatchObject({
      state: "ready",
      foundryUsesRemaining: 1,
    });
  });

  it("uses two sustainable claims, then seals all components for paid re-Forge on intact Overdrive", () => {
    const state = makeBlueprintGame(["bp_mantle_to_orbit_foundry"]);
    const player = state.players[0];
    const components = giveComponents(player, "bp_mantle_to_orbit_foundry");
    components.forEach((componentId) => removeFromBoard(state, componentId));
    triggerManifestation(state, player);
    acknowledgeManifestations(state);

    for (const cardId of ["t2r01", "t2r02"]) {
      resetTurn(state, 0);
      placeInForge(state, cardId);
      giveAffinities(state, player);
      expect(applyAction(state, player.playerId, {
        type: "forge_artifact",
        cardId,
        blueprintAction: "foundry_sustainable",
      })).toEqual({ success: true });
    }

    expect(getDevice(player, "bp_mantle_to_orbit_foundry").foundryUsesRemaining).toBe(0);
    resetTurn(state, 0);
    const overdriveCardId = "t2r03";
    placeInForge(state, overdriveCardId);
    giveAffinities(state, player);
    expect(applyAction(state, player.playerId, {
      type: "forge_artifact",
      cardId: overdriveCardId,
      blueprintAction: "foundry_overdrive",
    })).toEqual({ success: true });

    const foundry = getDevice(player, "bp_mantle_to_orbit_foundry");
    const privateState = player.blueprintPrivateStates?.find(
      (entry) => entry.blueprintId === "bp_mantle_to_orbit_foundry",
    );
    expect(foundry.state).toBe("spent");
    expect(player.forgedArtifactIds).not.toEqual(expect.arrayContaining(components));
    expect(player.reservedArtifactIds).toEqual(expect.arrayContaining(components));
    expect(player.privateReservedArtifactIds).not.toEqual(expect.arrayContaining(components));
    expect(privateState?.foundryStoredArtifactIds).toEqual(components);
    expect(privateState?.foundryRecoveryArtifactIds).toBeUndefined();
    expect(ordinaryEncryptedCount(player)).toBe(0);
    expect(player.affinities.singularity).toBe(0);
    expect(state.affinityWell.singularity).toBe(0);
    expect(state.deckTier1).not.toEqual(expect.arrayContaining(components));
    expect(privateState?.matchedComponentIds).toEqual([]);
    for (const componentId of components) {
      expect(player.civilization.artifacts[componentId]).toMatchObject({
        masteryCount: 1,
        implementationState: "archived",
        implementationChangeSource: {
          sourceType: "blueprint",
          sourceId: "bp_mantle_to_orbit_foundry",
        },
      });
    }

    const restoredId = components[0];
    const restoredCard = CARD_MAP.get(restoredId)!;
    const bonusBefore = player.bonuses[restoredCard.bonusAffinity];
    const eminenceBeforeRestore = player.eminence;
    resetTurn(state, 0);
    giveAffinities(state, player);
    expect(applyAction(state, player.playerId, {
      type: "forge_reserved_artifact",
      cardId: restoredId,
    })).toEqual({ success: true });

    expect(foundry.state).toBe("spent");
    expect(player.reservedArtifactIds).not.toContain(restoredId);
    expect(privateState?.foundryStoredArtifactIds).toEqual(components.slice(1));
    expect(player.forgedArtifactIds).toContain(restoredId);
    expect(player.bonuses[restoredCard.bonusAffinity]).toBe(bonusBefore + 1);
    expect(player.civilization.artifacts[restoredId].implementationState).toBe("operational");
    expect(privateState?.matchedComponentIds).toEqual([restoredId]);
    expect(player.eminence).toBe(eminenceBeforeRestore);
  });

  it("allows Foundry storage to overflow three ordinary Encrypted slots without expanding their cap", () => {
    const state = makeBlueprintGame(["bp_mantle_to_orbit_foundry"]);
    const player = state.players[0];
    const components = giveComponents(player, "bp_mantle_to_orbit_foundry");
    components.forEach((componentId) => removeFromBoard(state, componentId));
    const ordinaryIds = state.deckTier1
      .filter((cardId) => !components.includes(cardId) && cardId !== "t1e02")
      .slice(0, 2);
    ordinaryIds.forEach((cardId) => removeFromBoard(state, cardId));
    player.reservedArtifactIds.push(...ordinaryIds);
    player.privateReservedArtifactIds!.push(...ordinaryIds);
    triggerManifestation(state, player);
    acknowledgeManifestations(state);
    getDevice(player, "bp_mantle_to_orbit_foundry").foundryUsesRemaining = 0;

    resetTurn(state, 0);
    placeInForge(state, "t2r03");
    giveAffinities(state, player);
    expect(applyAction(state, player.playerId, {
      type: "forge_artifact",
      cardId: "t2r03",
      blueprintAction: "foundry_overdrive",
    })).toEqual({ success: true });

    expect(player.reservedArtifactIds).toHaveLength(5);
    expect(ordinaryEncryptedCount(player)).toBe(2);

    resetTurn(state, 0);
    const thirdOrdinaryId = state.forgeTier1[0];
    expect(applyAction(state, player.playerId, {
      type: "reserve_artifact",
      cardId: thirdOrdinaryId,
    })).toEqual({ success: true });
    expect(player.reservedArtifactIds).toHaveLength(6);
    expect(ordinaryEncryptedCount(player)).toBe(3);

    resetTurn(state, 0);
    expect(applyAction(state, player.playerId, {
      type: "reserve_artifact",
      cardId: state.forgeTier1[0],
    })).toMatchObject({ success: false });
    expect(ordinaryEncryptedCount(player)).toBe(3);
  });

  it("creates a Foundry recovery group under Broken Covenant and reactivates at zero uses", () => {
    const state = makeBlueprintGame(["bp_mantle_to_orbit_foundry"]);
    const player = state.players[0];
    const components = giveComponents(player, "bp_mantle_to_orbit_foundry");
    components.forEach((componentId) => removeFromBoard(state, componentId));
    triggerManifestation(state, player);
    acknowledgeManifestations(state);
    const device = getDevice(player, "bp_mantle_to_orbit_foundry");
    device.foundryUsesRemaining = 0;
    state.brokenCovenantDeclared = true;

    resetTurn(state, 0);
    const overdriveCardId = "t2r03";
    placeInForge(state, overdriveCardId);
    giveAffinities(state, player);
    expect(applyAction(state, player.playerId, {
      type: "forge_artifact",
      cardId: overdriveCardId,
      blueprintAction: "foundry_overdrive",
    })).toEqual({ success: true });
    expect(device.state).toBe("recovering");
    const privateState = player.blueprintPrivateStates?.find(
      (entry) => entry.blueprintId === "bp_mantle_to_orbit_foundry",
    );
    expect(privateState?.foundryStoredArtifactIds).toEqual(components);
    expect(privateState?.foundryRecoveryArtifactIds).toBeUndefined();
    expect(player.reservedArtifactIds).toEqual(expect.arrayContaining(components));
    expect(ordinaryEncryptedCount(player)).toBe(0);
    expect(player.affinities.singularity).toBe(0);
    expect(state.affinityWell.singularity).toBe(0);
    expect(state.deckTier1).not.toEqual(expect.arrayContaining(components));
    expect(privateState?.matchedComponentIds).toEqual([]);

    expect(chooseAiAction(state, player.playerId, "hard")).toEqual({
      type: "forge_artifact",
      cardId: components[0],
      blueprintAction: "foundry_recovery",
    });

    resetTurn(state, 0);
    giveAffinities(state, player);
    expect(applyAction(state, player.playerId, {
      type: "forge_reserved_artifact",
      cardId: components[0],
    })).toMatchObject({
      success: false,
      error: expect.stringContaining("free Foundry recovery"),
    });

    const eminenceBeforeRecovery = player.eminence;
    for (const componentId of components) {
      resetTurn(state, 0);
      player.affinities = {
        flare: 0,
        continuum: 0,
        verdance: 0,
        abyss: 0,
        radiance: 0,
        singularity: 0,
      };
      expect(applyAction(state, player.playerId, {
        type: "forge_artifact",
        cardId: componentId,
        blueprintAction: "foundry_recovery",
      })).toEqual({ success: true });
    }

    expect(privateState?.foundryStoredArtifactIds).toEqual([]);
    expect(privateState?.foundryRecoveryArtifactIds).toBeUndefined();
    expect(player.reservedArtifactIds).not.toEqual(expect.arrayContaining(components));
    expect(device).toMatchObject({ state: "ready", foundryUsesRemaining: 0 });
    expect(player.forgedArtifactIds).toEqual(expect.arrayContaining(components));
    expect(privateState?.matchedComponentIds).toEqual(components);
    expect(player.eminence).toBe(eminenceBeforeRecovery);
    for (const componentId of components) {
      expect(player.civilization.artifacts[componentId].implementationState).toBe("operational");
    }
  });

  it("normalizes legacy Broken Covenant recovery into canonical Cipher storage on reconnect", () => {
    const state = makeBlueprintGame(["bp_mantle_to_orbit_foundry"]);
    const player = state.players[0];
    const components = BLUEPRINT_DEFINITIONS.bp_mantle_to_orbit_foundry.components
      .map((component) => component.artifactId);
    const privateState = player.blueprintPrivateStates?.find(
      (entry) => entry.blueprintId === "bp_mantle_to_orbit_foundry",
    );
    expect(privateState).toBeDefined();
    privateState!.manifested = true;
    privateState!.foundryRecoveryArtifactIds = [...components];
    delete privateState!.foundryStoredArtifactIds;
    player.reservedArtifactIds = [];
    player.privateReservedArtifactIds = [...components];

    const normalized = normalizeState(state);
    const normalizedPlayer = normalized.players[0];
    const normalizedPrivateState = normalizedPlayer.blueprintPrivateStates?.find(
      (entry) => entry.blueprintId === "bp_mantle_to_orbit_foundry",
    );

    expect(normalizedPrivateState?.foundryStoredArtifactIds).toEqual(components);
    expect(normalizedPrivateState?.foundryRecoveryArtifactIds).toBeUndefined();
    expect(normalizedPlayer.reservedArtifactIds).toEqual(components);
    expect(normalizedPlayer.privateReservedArtifactIds).toEqual([]);
    expect(ordinaryEncryptedCount(normalizedPlayer)).toBe(0);
  });
});

describe("Ascension Registry", () => {
  it("records another civilization's unclaimed legal Tier II turns and pays at two", () => {
    const state = makeBlueprintGame(["bp_ascension_registry"]);
    const owner = state.players[0];
    const observed = state.players[1];
    giveComponents(owner, "bp_ascension_registry");
    giveAffinities(state, observed);
    triggerManifestation(state, owner);
    expect(owner.eminence).toBe(0);
    acknowledgeManifestations(state);

    expect(state.currentPlayerIndex).toBe(1);
    expect(applyAction(state, observed.playerId, { type: "pass" })).toEqual({ success: true });
    expect(getDevice(owner, "bp_ascension_registry").ascensionDeferrals).toBe(1);

    expect(state.currentPlayerIndex).toBe(0);
    expect(applyAction(state, owner.playerId, { type: "pass" })).toEqual({ success: true });
    expect(state.currentPlayerIndex).toBe(1);
    expect(applyAction(state, observed.playerId, { type: "pass" })).toEqual({ success: true });

    expect(owner.eminence).toBe(2);
    expect(getDevice(owner, "bp_ascension_registry")).toMatchObject({
      state: "spent",
      ascensionDeferrals: 2,
    });
  });

  it("clears every Deferral when a legal Tier II claim is annihilated before payment", () => {
    const state = makeBlueprintGame([
      "bp_antimatter_detonator",
      "bp_ascension_registry",
    ]);
    const owner = state.players[0];
    const claimant = state.players[1];
    giveComponents(owner, "bp_antimatter_detonator");
    giveComponents(owner, "bp_ascension_registry");
    triggerManifestation(state, owner);
    acknowledgeManifestations(state);
    const registry = getDevice(owner, "bp_ascension_registry");
    registry.ascensionDeferrals = 1;
    const targetCardId = owner.blueprintPrivateStates
      ?.find((entry) => entry.blueprintId === "bp_antimatter_detonator")
      ?.secretTargetCardId;
    expect(targetCardId).toBeTruthy();
    giveAffinities(state, claimant);
    resetTurn(state, 1);

    expect(applyAction(state, claimant.playerId, {
      type: "forge_artifact",
      cardId: targetCardId!,
    })).toEqual({ success: true });
    expect(registry.ascensionDeferrals).toBe(0);
    expect(state.annihilatedArtifactIds).toContain(targetCardId);
  });

  it("clears at two and remains active under Broken Covenant", () => {
    const state = makeBlueprintGame(["bp_ascension_registry"]);
    const owner = state.players[0];
    const observed = state.players[1];
    giveComponents(owner, "bp_ascension_registry");
    giveAffinities(state, observed);
    state.brokenCovenantDeclared = true;
    triggerManifestation(state, owner);
    acknowledgeManifestations(state);

    expect(applyAction(state, observed.playerId, { type: "pass" })).toEqual({ success: true });
    expect(applyAction(state, owner.playerId, { type: "pass" })).toEqual({ success: true });
    expect(applyAction(state, observed.playerId, { type: "pass" })).toEqual({ success: true });

    expect(owner.eminence).toBe(2);
    expect(getDevice(owner, "bp_ascension_registry")).toMatchObject({
      state: "ready",
      ascensionDeferrals: 0,
    });
  });
});
