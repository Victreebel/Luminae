import { describe, expect, it } from "vitest";
import { BLUEPRINT_IDS } from "@workspace/game-types";
import { initializeGame } from "../lib/gameEngine.js";
import {
  auditBlueprintSecrecy,
  blueprintGameSeed,
  blueprintLoadoutForSeat,
  outcomeRateDeltaPoints,
  parseBlueprintSimulationArgs,
  runBlueprintSimulation,
} from "./simulateBlueprints.js";

describe("Blueprint balance harness", () => {
  it("compares manifestor outcomes with same-cell nonmanifestors", () => {
    expect(outcomeRateDeltaPoints(4, 4, 0, 4)).toBe(100);
    expect(outcomeRateDeltaPoints(4, 4, 4, 4)).toBe(0);
    expect(outcomeRateDeltaPoints(0, 0, 1, 4)).toBeNull();
  });

  it("preserves the legacy CLI and adds the one-vs-two slot selector", () => {
    expect(parseBlueprintSimulationArgs([])).toEqual({
      games: 1_000,
      seed: 7_142_031,
      output: null,
      blueprintSlots: [2],
      playerCounts: [4],
      formats: ["quick"],
    });
    expect(parseBlueprintSimulationArgs([
      "--games", "12",
      "--seed", "42",
      "-o", "report.json",
      "--blueprint-slots", "all",
      "--players", "all",
      "--formats", "all",
    ])).toEqual({
      games: 12,
      seed: 42,
      output: "report.json",
      blueprintSlots: [2, 1],
      playerCounts: [2, 3, 4],
      formats: ["quick", "standard", "epic"],
    });
    expect(() => parseBlueprintSimulationArgs(["--blueprint-slots", "3"]))
      .toThrow("--blueprint-slots must be 1, 2, or all");
    expect(() => parseBlueprintSimulationArgs(["--players", "5"]))
      .toThrow("--players must be 2, 3, 4, or all");
    expect(() => parseBlueprintSimulationArgs(["--formats", "marathon"]))
      .toThrow("--formats must be quick, standard, epic, or all");
  });

  it("deals balanced one-slot candidates and unique two-slot combinations", () => {
    const oneSlotAssignments = Array.from({ length: BLUEPRINT_IDS.length }, (_, seat) =>
      blueprintLoadoutForSeat(0, seat, 1)[0],
    );
    expect(new Set(oneSlotAssignments)).toEqual(new Set(BLUEPRINT_IDS));

    for (let gameIndex = 0; gameIndex < 8; gameIndex++) {
      for (let seat = 0; seat < 4; seat++) {
        const twoSlotLoadout = blueprintLoadoutForSeat(gameIndex, seat, 2);
        expect(twoSlotLoadout).toHaveLength(2);
        expect(twoSlotLoadout[0]).not.toBe(twoSlotLoadout[1]);
      }
    }
  });

  it("derives independent game seeds without candidate-dependent drift", () => {
    expect(blueprintGameSeed(100, 0)).toBe(blueprintGameSeed(100, 0));
    expect(blueprintGameSeed(100, 1)).not.toBe(blueprintGameSeed(100, 0));
  });

  it("runs the production state projection as a functional secrecy check", () => {
    const state = initializeGame(
      [
        { id: "p1", name: "Player 1" },
        { id: "p2", name: "Player 2" },
      ],
      2,
      15,
      "standard",
      {
        blueprintSetups: {
          p1: { blueprintIds: ["bp_antimatter_detonator"] },
          p2: { blueprintIds: ["bp_worldshield_covenant"] },
        },
      },
    );
    state.players[0]!.blueprintPrivateStates![0]!.matchedComponentIds.push("t1r01");

    const audit = auditBlueprintSecrecy(state);
    expect(audit.functionalChecks).toBeGreaterThan(0);
    expect(audit.failures).toBe(0);
  });

  it("emits paired Balance Report v2 candidates and labels the two-slot legacy view", () => {
    const originalRandom = Math.random;
    const report = runBlueprintSimulation(2, 7_142_031, [2, 1]);

    expect(Math.random).toBe(originalRandom);
    expect(report.schema).toBe("luminae-blueprint-simulation/v2");
    expect(report.balanceSchema).toBe("luminae-balance-report/v2");
    expect(report.playerCounts).toEqual([4]);
    expect(report.formats).toEqual(["quick"]);
    expect(report.candidates).toEqual(report.scenarios);
    expect(report.scenarios.map((scenario) => scenario.candidateId)).toEqual([
      "blueprint-two/control",
      "blueprint-one",
    ]);

    const [control, candidate] = report.scenarios;
    expect(control!.ruleset.blueprintSlots).toBe(2);
    expect(candidate!.ruleset.blueprintSlots).toBe(1);
    expect(control!.turnOrderCompensation).toBe("production");
    expect(control!.turnOrderCompensationViolations).toBe(0);
    expect(candidate!.turnOrderCompensationViolations).toBe(0);
    expect(Object.values(control!.blueprintAssignments).reduce((sum, count) => sum + count, 0))
      .toBe(2 * 4 * 2);
    expect(Object.values(candidate!.blueprintAssignments).reduce((sum, count) => sum + count, 0))
      .toBe(2 * 4);
    expect(control!.secrecy).toMatchObject({
      failures: 0,
      notHardcoded: true,
      method: "production-state-projection",
    });
    expect(control!.secrecy.functionalChecks).toBeGreaterThan(0);
    expect(control!.manifestations).toEqual(expect.objectContaining({
      manifestorPoolWinRate: expect.anything(),
      nonManifestorPoolWinRate: expect.anything(),
      manifestorVsNonManifestorDeltaPoints: expect.anything(),
    }));
    expect(Object.values(control!.finishReasons).reduce((sum, count) => sum + count, 0))
      .toBe(2);
    expect(Object.values(control!.actionCounts).reduce((sum, count) => sum + count, 0))
      .toBeGreaterThan(0);
    expect(Object.values(control!.actualManifestations).reduce((sum, count) => sum + count, 0))
      .toBe(control!.manifestations.total);
    for (const blueprint of Object.values(control!.blueprints)) {
      expect(blueprint.manifestorWins).toBeLessThanOrEqual(blueprint.manifestations);
      expect(blueprint.manifestorLosses)
        .toBe(blueprint.manifestations - blueprint.manifestorWins);
    }
    expect(control!.openingPositionWinRates).toEqual(control!.openerRelativeWinRates);
    expect(report.scenarioCount).toBe(2);
    expect(report.gamesRequestedPerScenario).toBe(2);
    expect(report.gamesRequested).toBe(4);
    expect(report.gamesCompleted).toBe(
      report.scenarios.reduce((sum, scenario) => sum + scenario.gamesCompleted, 0),
    );
    expect(Object.values(report.finishReasons).reduce((sum, count) => sum + count, 0))
      .toBe(report.gamesRequested);
    expect(report.legacyCellSummary.gamesCompleted).toBe(control!.gamesCompleted);
    expect(report.legacyCellSummary.blueprints).toEqual(control!.blueprints);
  });

  it("keeps a filtered control run identical to the same cell in the full matrix", () => {
    const filtered = runBlueprintSimulation(2, 919_191, [2]).scenarios[0];
    const matrix = runBlueprintSimulation(2, 919_191, [2, 1]).scenarios[0];
    expect(matrix).toEqual(filtered);
  });

  it("runs paired slot candidates across every requested player/format cell", () => {
    const report = runBlueprintSimulation(
      1,
      919_191,
      [2, 1],
      false,
      [2, 3, 4],
      ["quick", "standard", "epic"],
    );

    expect(report.scenarios).toHaveLength(18);
    expect(report.playerCounts).toEqual([2, 3, 4]);
    expect(report.formats).toEqual(["quick", "standard", "epic"]);
    for (let index = 0; index < report.scenarios.length; index += 2) {
      const control = report.scenarios[index]!;
      const candidate = report.scenarios[index + 1]!;
      expect(control.blueprintSlots).toBe(2);
      expect(candidate.blueprintSlots).toBe(1);
      expect(candidate.playerCount).toBe(control.playerCount);
      expect(candidate.format).toBe(control.format);
      expect(candidate.victoryRequirement).toBe(control.victoryRequirement);
      expect(control.policySeats).toHaveLength(control.playerCount);
      expect(control.difficultySeats).toHaveLength(control.playerCount);
      expect(control.turnOrderCompensationViolations).toBe(0);
      expect(candidate.turnOrderCompensationViolations).toBe(0);
    }

    const legacy = report.scenarios.find((scenario) =>
      scenario.blueprintSlots === 2
      && scenario.playerCount === 4
      && scenario.format === "quick"
    )!;
    expect(report.scenarioCount).toBe(18);
    expect(report.gamesRequestedPerScenario).toBe(1);
    expect(report.gamesRequested).toBe(18);
    expect(report.gamesCompleted).toBe(
      report.scenarios.reduce((sum, scenario) => sum + scenario.gamesCompleted, 0),
    );
    expect(report.stalledGames).toBe(
      report.scenarios.reduce((sum, scenario) => sum + scenario.stalledGames, 0),
    );
    expect(report.equalTurnViolations).toBe(
      report.scenarios.reduce((sum, scenario) => sum + scenario.equalTurnViolations, 0),
    );
    expect(Object.values(report.finishReasons).reduce((sum, count) => sum + count, 0))
      .toBe(report.gamesRequested);
    expect(report.legacyCellSummary).toMatchObject({
      candidateId: legacy.candidateId,
      blueprintSlots: 2,
      playerCount: 4,
      format: "quick",
      gamesCompleted: legacy.gamesCompleted,
      blueprints: legacy.blueprints,
    });
  });
});
