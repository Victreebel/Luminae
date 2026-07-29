import { describe, expect, it } from "vitest";
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
      avatarSeedDeckSeeds: ["seeded-top-card"],
      players: [
        {
          playerId: "viewer",
          plannedAction: { type: "forge_artifact", cardId: "viewer-card" },
          plannedActionCancelReason: "kept for viewer",
          reservedArtifacts: [artifact("viewer-card", 1, "Viewer Secret")],
          privateReservedArtifactIds: ["viewer-card"],
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
    expect(publicOpponentCard).toEqual(state.players[1].reservedArtifacts[1]);

    expect(projected.artifactMarkers).toEqual({
      "viewer-card": { type: "forgotten" },
      "opponent-public-card": { type: "forgotten" },
      "forge-card": { type: "condemned" },
    });
    expect(projected.avatarSeedDeckSeeds).toHaveLength(1);
    expect(projected.avatarSeedDeckSeeds?.[0]).toMatch(/^encrypted-/);
    expect(JSON.stringify(projected)).not.toContain("opponent-secret-card");
    expect(JSON.stringify(projected)).not.toContain("Opponent Secret");
    expect(JSON.stringify(projected)).not.toContain("seeded-top-card");
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
});
