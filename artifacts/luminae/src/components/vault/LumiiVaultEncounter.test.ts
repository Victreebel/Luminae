import { describe, expect, it } from "vitest";
import type { GameState } from "@workspace/api-client-react";
import { DEFAULT_VICTORY_REQUIREMENT } from "@workspace/game-types";
import { selectLumiiCommentary } from "./LumiiVaultEncounter";

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    startedAt: 101,
    version: 1,
    victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
    players: [
      { playerId: "architect", playerName: "Architect", isAi: false, eminence: 6, forgedArtifacts: [] },
      { playerId: "lumii", playerName: "Lumii", isAi: true, eminence: 7, forgedArtifacts: [] },
    ],
    pendingSummonEvents: [],
    pendingBlueprintManifestationEvents: [],
    pendingBlueprintDetonationEvents: [],
    pendingScenarioProtocolEvents: [],
    scenarioProtocols: [],
    lumiiThresholdApproach: "inquiry",
    lastAction: null,
    ...overrides,
  } as GameState;
}

describe("Lumii encounter commentary", () => {
  it("prioritizes a near-victory threshold over a simultaneous Blueprint event", () => {
    const previous = state();
    const current = state({
      version: 2,
      players: [
        { playerId: "architect", playerName: "Architect", isAi: false, eminence: 17, forgedArtifacts: [] },
        { playerId: "lumii", playerName: "Lumii", isAi: true, eminence: 7, forgedArtifacts: [] },
      ] as GameState["players"],
      pendingBlueprintManifestationEvents: [{ eventId: "manifest-1" }] as GameState["pendingBlueprintManifestationEvents"],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toMatchObject({
      key: "near-victory:player:17",
      priority: 92,
    });
  });

  it.each([
    ["kinship", "You are nearing the threshold. You may still withdraw."],
    ["inquiry", "Your path now reaches the threshold."],
    ["dominion", "You are advancing. I have not yielded."],
  ] as const)("uses the %s route for major commentary", (route, text) => {
    const previous = state({ lumiiThresholdApproach: route });
    const current = state({
      version: 2,
      lumiiThresholdApproach: route,
      players: [
        { playerId: "architect", playerName: "Architect", isAi: false, eminence: 17, forgedArtifacts: [] },
        { playerId: "lumii", playerName: "Lumii", isAi: true, eminence: 7, forgedArtifacts: [] },
      ] as GameState["players"],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toMatchObject({ text });
  });

  it("comments on anonymous protocol events without needing a Blueprint identity", () => {
    const previous = state();
    const current = state({
      version: 2,
      pendingScenarioProtocolEvents: [{
        eventId: "sealed-event",
        protocolId: "sealed_protocol_02",
        ownerPlayerId: "lumii",
        slotIndex: 1,
        kind: "manifestation",
        publicEffect: "A public consequence.",
        createdAt: 1,
      }],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toMatchObject({
      key: "protocol-manifestation:sealed-event",
      text: "It is coherent. That does not make it safe.",
      priority: 78,
    });
  });

  it("comments only on public event payloads and ignores private Blueprint state changes", () => {
    const previous = state();
    const current = state({
      version: 2,
      players: [
        { playerId: "architect", playerName: "Architect", isAi: false, eminence: 6, forgedArtifacts: [], blueprintPrivateStates: [{ blueprintId: "bp_antimatter_detonator" }] },
        { playerId: "lumii", playerName: "Lumii", isAi: true, eminence: 7, forgedArtifacts: [] },
      ] as GameState["players"],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toBeNull();
  });

  it("prioritizes a meaningful lead change over a simultaneous major Forge", () => {
    const previous = state();
    const forgedCard = { id: "tier-three", tier: 3, eminence: 4 };
    const current = state({
      version: 2,
      players: [
        {
          playerId: "architect",
          playerName: "Architect",
          isAi: false,
          eminence: 10,
          forgedArtifacts: [forgedCard],
        },
        { playerId: "lumii", playerName: "Lumii", isAi: true, eminence: 7, forgedArtifacts: [] },
      ] as GameState["players"],
      lastAction: {
        type: "forge_artifact",
        playerId: "architect",
        cardId: "tier-three",
      } as GameState["lastAction"],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toMatchObject({
      key: "lead:2:player",
      priority: 58,
    });
  });
});
