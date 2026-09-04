import { describe, expect, it } from "vitest";
import { buildAccountArchive } from "./accountArchive";

function hardAiOpponents(count = 3) {
  return Array.from({ length: count }, () => ({ isAi: true, aiDifficulty: "hard" }));
}

describe("account Archive", () => {
  it("collects only Artifacts and Luminaries used or obtained by the account player", () => {
    const archive = buildAccountArchive([{
      playerId: "player-one",
      finished: true,
      opponents: hardAiOpponents(),
      state: {
        winnerId: "player-one",
        activeLuminaries: ["lum_void"],
        pendingSummonEvents: [{ luminaryId: "lum_moth" }],
        players: [
          {
            playerId: "player-one",
            forgedArtifactIds: ["t1r01"],
            privateReservedArtifactIds: ["t2p02"],
            assimilatedArtifactIds: ["t3o04"],
            luminaries: ["lum_tide"],
          },
          {
            playerId: "opponent",
            forgedArtifactIds: ["t1e01"],
            luminaries: ["lum_verdant"],
          },
        ],
      },
    }]);

    expect(archive.artifacts.discovered.map((artifact) => artifact.id)).toEqual([
      "t1r01",
      "t2p02",
      "t3o04",
    ]);
    expect(archive.artifacts.discovered.map((artifact) => [artifact.id, artifact.forgeCount])).toEqual([
      ["t1r01", 1],
      ["t2p02", 0],
      ["t3o04", 0],
    ]);
    expect(archive.luminaries.encountered.map((luminary) => luminary.id)).toEqual(["lum_tide"]);
    expect(archive.luminaries.encountered[0]?.allianceCount).toBe(1);
    expect(archive.identity).toEqual({
      totalForges: 1,
      totalAlliances: 1,
      signatureArtifactId: "t1r01",
      closestLuminaryId: "lum_tide",
    });
    expect(archive.vault.qualifyingWins).toBe(1);
  });

  it("aggregates exact usage counts even when a forged Artifact is no longer held", () => {
    const archive = buildAccountArchive([
      {
        playerId: "player-one",
        finished: true,
        opponents: [],
        state: {
          players: [{
            playerId: "player-one",
            forgedArtifactIds: [],
            artifactForgeCounts: { t1r01: 2, t2p02: 1 },
            civilization: {
              version: 1,
              artifacts: {
                t1e01: {
                  artifactId: "t1e01",
                  masteryCount: 1,
                  implementationState: "annihilated",
                },
              },
            },
            luminaries: ["lum_tide"],
            luminaryAllianceCounts: { lum_tide: 1 },
          }],
        },
      },
      {
        playerId: "player-one",
        finished: true,
        opponents: [],
        state: {
          players: [{
            playerId: "player-one",
            forgedArtifactIds: ["t1r01"],
            artifactForgeCounts: { t1r01: 1 },
            luminaries: ["lum_tide", "lum_void"],
            luminaryAllianceCounts: { lum_tide: 1, lum_void: 1 },
          }],
        },
      },
    ]);

    expect(archive.artifacts.discovered.map((artifact) => [artifact.id, artifact.forgeCount])).toEqual([
      ["t1r01", 3],
      ["t1e01", 0],
      ["t2p02", 1],
    ]);
    expect(archive.luminaries.encountered.map((luminary) => [luminary.id, luminary.allianceCount])).toEqual([
      ["lum_tide", 2],
      ["lum_void", 1],
    ]);
    expect(archive.identity).toEqual({
      totalForges: 4,
      totalAlliances: 3,
      signatureArtifactId: "t1r01",
      closestLuminaryId: "lum_tide",
    });
  });

  it("leaves identity unresolved while the leading records are tied", () => {
    const archive = buildAccountArchive([{
      playerId: "player-one",
      finished: true,
      opponents: [],
      state: {
        players: [{
          playerId: "player-one",
          forgedArtifactIds: ["t1r01", "t2p02"],
          artifactForgeCounts: { t1r01: 1, t2p02: 1 },
          luminaries: ["lum_tide", "lum_void"],
          luminaryAllianceCounts: { lum_tide: 1, lum_void: 1 },
        }],
      },
    }]);

    expect(archive.identity.signatureArtifactId).toBeNull();
    expect(archive.identity.closestLuminaryId).toBeNull();
  });

  it("requires five wins against exactly three hard AI opponents", () => {
    const qualifying = Array.from({ length: 5 }, () => ({
      playerId: "player-one",
      finished: true,
      opponents: hardAiOpponents(),
      state: { winnerId: "player-one", players: [] },
    }));
    const nonQualifying = [
      {
        playerId: "player-one",
        finished: true,
        opponents: hardAiOpponents(2),
        state: { winnerId: "player-one", players: [] },
      },
      {
        playerId: "player-one",
        finished: true,
        opponents: [
          { isAi: true, aiDifficulty: "hard" },
          { isAi: true, aiDifficulty: "hard" },
          { isAi: true, aiDifficulty: "medium" },
        ],
        state: { winnerId: "player-one", players: [] },
      },
    ];

    const archive = buildAccountArchive([...qualifying, ...nonQualifying]);

    expect(archive.vault).toEqual({
      qualifyingWins: 5,
      requiredWins: 5,
      status: "challenge_ready",
      challengeRoomId: null,
      unlocked: false,
    });
  });
});
