import { describe, expect, it } from "vitest";
import type {
  ScenarioProtocolEvent,
  ScenarioProtocolPublicState,
} from "@workspace/game-types";
import {
  createInitialCivilizationState,
  deriveCivilizationAffinityIdentity,
} from "@workspace/game-types";
import { filterStateForPlayer } from "./stateProjection";

const zeroCost = {
  flare: 0,
  continuum: 0,
  verdance: 0,
  abyss: 0,
  radiance: 0,
  singularity: 0,
};

function artifact(id: string, tier: number, name: string) {
  return {
    id,
    tier,
    bonusAffinity: "verdance" as const,
    eminence: 3,
    cost: { ...zeroCost, flare: 4, abyss: 2 },
    name,
    flavor: `${name} secret lore`,
  };
}

describe("filterStateForPlayer", () => {
  it("keeps the viewer's reserve complete and conceals opponent reserves", () => {
    const state = {
      roomId: "room-1",
      artifactMarkers: {
        "viewer-card": { type: "forgotten" },
        "opponent-secret-card": { type: "avatar_seed" },
        "opponent-public-card": { type: "forgotten" },
        "forge-card": { type: "condemned" },
      },
      avatarSeedMoldSlots: ["1-2", "2-0", "3-3"],
      pendingBlueprintManifestationEvents: [
        {
          eventId: "manifest-1",
          blueprintId: "bp_antimatter_detonator",
          ownerPlayerId: "opponent",
          slotIndex: 0,
          presentationVariant: "lattice",
          createdAt: 123,
        },
      ],
      players: [
        {
          playerId: "viewer",
          plannedAction: { type: "forge_artifact", cardId: "viewer-card" },
          plannedActionCancelReason: "kept for viewer",
          reservedArtifacts: [artifact("viewer-card", 1, "Viewer Secret")],
          privateReservedArtifactIds: ["viewer-card"],
          blueprintPrivateStates: [],
          blueprintPresentationVariants: {
            bp_antimatter_detonator: "armored",
          },
          tideArchiveTopCards: {
            tier1: artifact("tide-top-one", 1, "Tide Top One"),
            tier2: artifact("tide-top-two", 2, "Tide Top Two"),
            tier3: null,
          },
        },
        {
          playerId: "opponent",
          plannedAction: { type: "forge_reserved_artifact", cardId: "opponent-secret-card" },
          plannedActionCancelReason: "also private",
          reservedArtifacts: [
            artifact("opponent-secret-card", 3, "Opponent Secret"),
            artifact("opponent-public-card", 2, "Previously Public"),
          ],
          privateReservedArtifactIds: ["opponent-secret-card"],
          blueprintPrivateStates: [
            {
              blueprintId: "bp_antimatter_detonator",
              slotIndex: 0,
              matchedComponentIds: ["t1r01", "t1p04", "t1r04", "t2o01"],
              manifested: true,
              secretTargetCardId: "opponent-secret-card",
            },
          ],
          blueprintPresentationVariants: {
            bp_antimatter_detonator: "lattice",
          },
          manifestedBlueprintDevices: [
            {
              blueprintId: "bp_antimatter_detonator",
              ownerPlayerId: "opponent",
              slotIndex: 0,
              state: "armed",
              presentationVariant: "lattice",
            },
          ],
          tideArchiveTopCards: {
            tier1: artifact("opponent-tide-top", 1, "Opponent Tide Top"),
            tier2: null,
            tier3: null,
          },
        },
        {
          playerId: "unmanifested-opponent",
          plannedAction: null,
          plannedActionCancelReason: null,
          reservedArtifacts: [],
          privateReservedArtifactIds: [],
          blueprintPrivateStates: [
            {
              blueprintId: "bp_antimatter_detonator",
              slotIndex: 0,
              matchedComponentIds: ["t1r01"],
              manifested: false,
              secretTargetCardId: null,
            },
          ],
          blueprintPresentationVariants: {
            bp_antimatter_detonator: "asymmetric",
          },
        },
      ],
    };

    const projected = filterStateForPlayer(state, "viewer");
    const viewerCard = projected.players[0].reservedArtifacts[0];
    const opponentCard = projected.players[1].reservedArtifacts[0];
    const publicOpponentCard = projected.players[1].reservedArtifacts[1];

    expect(viewerCard).toEqual(state.players[0].reservedArtifacts[0]);
    expect(projected.players[0].plannedAction).toEqual(state.players[0].plannedAction);
    expect(projected.players[0]).not.toHaveProperty("privateReservedArtifactIds");
    expect(projected.players[0].blueprintPresentationVariants).toEqual({
      bp_antimatter_detonator: "armored",
    });
    expect(projected.players[0].tideArchiveTopCards?.tier1?.name).toBe("Tide Top One");

    expect(opponentCard.tier).toBe(3);
    expect(opponentCard.id).toMatch(/^encrypted-/);
    expect(opponentCard.id).not.toBe("opponent-secret-card");
    expect(opponentCard.name).toBe("Encrypted Artifact");
    expect(opponentCard.eminence).toBe(0);
    expect(opponentCard.cost).toEqual(zeroCost);
    expect(opponentCard.flavor).toBe("");
    expect(projected.players[1].plannedAction).toBeNull();
    expect(projected.players[1].plannedActionCancelReason).toBeNull();
    expect(projected.players[1]).not.toHaveProperty("privateReservedArtifactIds");
    expect(projected.players[1]).not.toHaveProperty("tideArchiveTopCards");
    expect(projected.players[1]).not.toHaveProperty("blueprintPrivateStates");
    expect(projected.players[1]).not.toHaveProperty("blueprintPresentationVariants");
    expect(projected.players[1].manifestedBlueprintDevices?.[0]).toMatchObject(
      state.players[1].manifestedBlueprintDevices![0],
    );
    expect((projected.players[1].manifestedBlueprintDevices?.[0] as {
      definition?: { name?: string };
    } | undefined)?.definition?.name).toBe("Antimatter Detonator");
    expect(publicOpponentCard).toEqual(state.players[1].reservedArtifacts[1]);

    expect(projected.artifactMarkers).toEqual({
      "viewer-card": { type: "forgotten" },
      "opponent-public-card": { type: "forgotten" },
      "forge-card": { type: "condemned" },
    });
    expect(projected.avatarSeedMoldSlots).toEqual(state.avatarSeedMoldSlots);
    expect(projected.pendingBlueprintManifestationEvents?.[0]).toMatchObject(
      state.pendingBlueprintManifestationEvents![0],
    );
    expect((projected.pendingBlueprintManifestationEvents?.[0] as {
      definition?: { name?: string };
    } | undefined)?.definition?.name).toBe("Antimatter Detonator");
    expect(JSON.stringify(projected)).not.toContain("opponent-secret-card");
    expect(projected.players[2]).not.toHaveProperty("blueprintPresentationVariants");
    expect(JSON.stringify(projected.players[2])).not.toContain("asymmetric");
    expect(JSON.stringify(projected)).not.toContain("Opponent Secret");
    expect(JSON.stringify(projected)).not.toContain("opponent-tide-top");
  });

  it("uses a stable opaque id for the same viewer without sharing aliases between viewers", () => {
    const state = {
      players: [
        {
          playerId: "one",
          plannedAction: null,
          plannedActionCancelReason: null,
          reservedArtifacts: [artifact("secret-card", 2, "Secret")],
          privateReservedArtifactIds: ["secret-card"],
        },
        {
          playerId: "two",
          plannedAction: null,
          plannedActionCancelReason: null,
          reservedArtifacts: [],
        },
        {
          playerId: "three",
          plannedAction: null,
          plannedActionCancelReason: null,
          reservedArtifacts: [],
        },
      ],
    };

    const firstAlias = filterStateForPlayer(state, "two").players[0].reservedArtifacts[0].id;
    const repeatedAlias = filterStateForPlayer(state, "two").players[0].reservedArtifacts[0].id;
    const otherViewerAlias = filterStateForPlayer(state, "three").players[0].reservedArtifacts[0].id;

    expect(repeatedAlias).toBe(firstAlias);
    expect(otherViewerAlias).not.toBe(firstAlias);
  });

  it("projects Lumii's real Blueprints as anonymous sealed protocols without identity leaks", () => {
    const blueprintIds = [
      "bp_antimatter_detonator",
      "bp_mantle_to_orbit_foundry",
      "bp_ascension_registry",
    ] as const;
    const variants = ["armored", "original", "lattice"] as const;
    const lumiiCivilization = createInitialCivilizationState();
    lumiiCivilization.artifacts.t1r01 = {
      artifactId: "t1r01",
      firstMasteredTurnCount: 1,
      masteryCount: 1,
      implementationState: "operational",
      implementationStateChangedTurnCount: 1,
      implementationChangeSource: { sourceType: "artifact", sourceId: "t1r01" },
      historyEvidence: "recorded",
    };
    lumiiCivilization.affinityIdentity = deriveCivilizationAffinityIdentity(lumiiCivilization.artifacts);
    lumiiCivilization.conditions["condition:antimatter"] = {
      id: "condition:antimatter",
      type: "blueprint:bp_antimatter_detonator:armed",
      coreType: "quarantined",
      target: { kind: "project", id: "project:bp_antimatter_detonator" },
      source: { sourceType: "blueprint", sourceId: "bp_antimatter_detonator" },
      appliedTurnCount: 2,
      resolvedTurnCount: null,
      historyEvidence: "recorded",
    };
    lumiiCivilization.stability.contributors.push({
      id: "pressure:antimatter",
      direction: "pressure",
      magnitude: 2,
      label: "Antimatter Detonator pressure",
      source: { sourceType: "blueprint", sourceId: "bp_antimatter_detonator" },
      target: { kind: "project", id: "project:bp_antimatter_detonator" },
      appliedTurnCount: 2,
      resolvedTurnCount: null,
      historyEvidence: "recorded",
    });
    lumiiCivilization.events.push({
      eventId: "civilization:antimatter",
      source: { sourceType: "blueprint", sourceId: "bp_antimatter_detonator" },
      turnCount: 2,
      form: "automatic",
      pressureTags: ["disruption", "attrition"],
      selectedTrajectoryId: "detonate",
      outcome: "success",
      summary: "Antimatter Detonator annihilated a prospective claim",
      history: { target: "classified" },
      outcomeSignals: [{
        signalId: "classified-loss",
        dimension: "continuity",
        direction: "pressure",
        magnitude: "material",
        label: "Antimatter Detonator destroyed operational history",
      }],
      adversity: {
        evidenceId: "classified-adversity",
        magnitude: "material",
        label: "Antimatter Detonator pressure",
        recoveryEligible: false,
      },
      historyEvidence: "recorded",
    });
    const state = {
      roomId: "lumii-forecast",
      scenarioId: "blueprint_clearance_lumii",
      scenarioProtocols: [] as ScenarioProtocolPublicState[],
      pendingScenarioProtocolEvents: [] as ScenarioProtocolEvent[],
      actionLog: [
        { summary: "Lumii manifested Antimatter Detonator" },
        { summary: "Mantle-to-Orbit Foundry advanced" },
        { summary: "Ascension Registry recorded a Deferral" },
      ],
      pendingBlueprintManifestationEvents: blueprintIds.map((blueprintId, slotIndex) => ({
        eventId: `manifest-${slotIndex}`,
        blueprintId,
        ownerPlayerId: "lumii",
        slotIndex,
        presentationVariant: variants[slotIndex],
        createdAt: 100 + slotIndex,
      })),
      pendingBlueprintDetonationEvents: [{
        eventId: "effect-0",
        blueprintId: "bp_antimatter_detonator" as const,
        ownerPlayerId: "lumii",
        slotIndex: 0,
        triggeringPlayerId: "architect",
        targetCardId: "public-target",
        hostileEffect: "annihilation" as const,
        presentationVariant: "armored" as const,
        createdAt: 200,
      }],
      players: [
        {
          playerId: "architect",
          plannedAction: null,
          plannedActionCancelReason: null,
          reservedArtifacts: [],
          privateReservedArtifactIds: [],
          blueprintPrivateStates: blueprintIds.map((blueprintId, slotIndex) => ({
            blueprintId,
            slotIndex,
            matchedComponentIds: [],
            manifested: false,
          })),
          blueprintPresentationVariants: {
            bp_antimatter_detonator: "armored",
            bp_mantle_to_orbit_foundry: "original",
            bp_ascension_registry: "lattice",
          },
          manifestedBlueprintDevices: [],
        },
        {
          playerId: "lumii",
          plannedAction: null,
          plannedActionCancelReason: null,
          reservedArtifacts: [],
          privateReservedArtifactIds: [],
          blueprintPrivateStates: blueprintIds.map((blueprintId, slotIndex) => ({
            blueprintId,
            slotIndex,
            matchedComponentIds: [],
            manifested: true,
            ...(blueprintId === "bp_mantle_to_orbit_foundry"
              ? {
                  foundryStoredArtifactIds: ["lumii-foundry-component"],
                  foundryRecoveryArtifactIds: ["lumii-foundry-component"],
                }
              : {}),
          })),
          blueprintPresentationVariants: {
            bp_antimatter_detonator: "armored",
            bp_mantle_to_orbit_foundry: "original",
            bp_ascension_registry: "lattice",
          },
          manifestedBlueprintDevices: blueprintIds.map((blueprintId, slotIndex) => ({
            blueprintId,
            ownerPlayerId: "lumii",
            slotIndex,
            state: slotIndex === 0 ? "armed" : "ready",
            presentationVariant: variants[slotIndex],
            ...(slotIndex === 1 ? { foundryUsesRemaining: 2 } : {}),
            ...(slotIndex === 2 ? { ascensionDeferrals: 1 } : {}),
          })),
          civilization: lumiiCivilization,
        },
      ],
    };

    const projected = filterStateForPlayer(state, "architect");
    const serialized = JSON.stringify(projected);

    expect(projected.pendingBlueprintManifestationEvents).toEqual([]);
    expect(projected.pendingBlueprintDetonationEvents).toEqual([]);
    expect(projected.scenarioProtocols).toHaveLength(3);
    expect(projected.pendingScenarioProtocolEvents).toHaveLength(4);
    expect(projected.pendingScenarioProtocolEvents?.map((event) => event.eventId)).toEqual([
      "manifest-0",
      "manifest-1",
      "manifest-2",
      "effect-0",
    ]);
    expect(projected.players.every((player) => player.manifestedBlueprintDevices?.length === 0)).toBe(true);
    expect(projected.players.every((player) => !("blueprintPrivateStates" in player))).toBe(true);

    for (const forbidden of [
      ...blueprintIds,
      "Antimatter Detonator",
      "Mantle-to-Orbit Foundry",
      "Ascension Registry",
      "lumii-foundry-component",
      "foundryStoredArtifactIds",
      "foundryRecoveryArtifactIds",
      ...variants,
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(serialized).toContain("sealed_protocol_01");
    expect(serialized).toContain("sealed_protocol_02");
    expect(serialized).toContain("sealed_protocol_03");
    expect(projected.scenarioProtocols?.[1].foundryUsesRemaining).toBe(2);
    expect(projected.scenarioProtocols?.[2].ascensionDeferrals).toBe(1);
    const publicCivilization = JSON.parse(serialized).players[1].civilization;
    expect(publicCivilization.artifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ artifactId: "t1r01", implementationState: "operational" }),
    ]));
    expect(publicCivilization.activeCapabilityIds).toContain("artifact:controlled_energy");
    expect(publicCivilization.activeCapabilityIds).not.toContain("project:claim_annihilation");
    expect(publicCivilization.activeConditions[0]).toMatchObject({
      type: "quarantined",
      coreType: "quarantined",
      targetKind: "project",
      sourceType: "blueprint",
    });
    expect(publicCivilization.stability.contributors[0].label).toBe("Sealed Project pressure");
    expect(publicCivilization.events).toEqual([
      expect.objectContaining({
        sourceType: "blueprint",
        pressureTags: ["disruption", "attrition"],
        summary: "Sealed Project consequence resolved",
      }),
    ]);
    expect(publicCivilization.events[0]).not.toHaveProperty("selectedTrajectoryId");
    expect(publicCivilization.events[0]).not.toHaveProperty("history");
    expect(publicCivilization.events[0]).not.toHaveProperty("outcomeSignals");
    expect(publicCivilization.events[0]).not.toHaveProperty("adversity");
    expect(publicCivilization.events[0].eventId).toBe("sealed-event-1");
    expect(serialized.toLowerCase()).not.toContain("antimatter");
  });
});
