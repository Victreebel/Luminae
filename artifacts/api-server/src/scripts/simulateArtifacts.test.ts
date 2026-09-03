import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BALANCE_CANDIDATE_IDS,
  parseArtifactSimulationArgs,
  runArtifactBalanceSimulation,
} from "./simulateArtifacts";

describe("Artifact balance CLI", () => {
  afterEach(() => vi.restoreAllMocks());

  it("preserves the legacy report mode when no new matrix flags are supplied", () => {
    const parsed = parseArtifactSimulationArgs([
      "--games", "1",
      "--players", "2",
      "--victory", "15",
      "--mode", "artifacts-only",
    ]);
    expect(parsed.reportV2).toBe(false);

    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const report = runArtifactBalanceSimulation(parsed);
    expect(report.schema).toBe("luminae-artifact-simulation/v1");
    if (report.schema === "luminae-artifact-simulation/v1") {
      expect(report.scenarios).toHaveLength(1);
      expect(report.scenarios[0]?.gamesRequested).toBe(1);
    }
  });

  it("parses the approved candidate, policy, and format matrix flags", () => {
    const parsed = parseArtifactSimulationArgs([
      "--candidate", "all",
      "--policies", "mixed",
      "--formats", "quick,epic",
    ]);
    expect(parsed.reportV2).toBe(true);
    expect(parsed.candidateIds).toEqual(BALANCE_CANDIDATE_IDS);
    expect(parsed.victoryRequirements).toEqual([15, 25]);
    expect(parsed.modes).toEqual(["standard"]);
    expect(parsed.policyLineups[0]).toContain("comeback");
  });

  it("emits BalanceReportV2 metrics from a deterministic control game", () => {
    const parsed = parseArtifactSimulationArgs([
      "--games", "2",
      "--seed", "71",
      "--players", "2",
      "--candidate", "control",
      "--policies", "adaptive,specialization",
      "--formats", "quick",
    ]);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const report = runArtifactBalanceSimulation(parsed);
    expect(report.schema).toBe("luminae-balance-report/v2");
    if (report.schema === "luminae-balance-report/v2") {
      const scenario = report.candidates[0];
      expect(scenario?.candidateId).toBe("control");
      expect(scenario?.gamesRequested).toBe(2);
      expect(scenario?.policyRotation).toBe("cyclic_by_game");
      expect(scenario?.actionCounts).toBeTruthy();
      expect(scenario?.finishReasons).toEqual(expect.objectContaining({
        eminence: expect.any(Number),
        frontier_exhaustion: expect.any(Number),
        max_turns: expect.any(Number),
      }));
      expect(scenario?.well.anyColorEmptyTurnRate).toEqual(expect.any(Number));
      expect(scenario?.market.p90VisibleAge).toEqual(expect.any(Number));
      expect(scenario?.winnerTier3Milestones.atLeastOneRate).toBe(
        scenario?.winnerTier3ReachRate,
      );
      expect(scenario?.winnerTier3Milestones.requiredForFormat).toBe(0);
      expect(scenario?.winnerTier3Milestones.requiredRate).toBeNull();
      expect(scenario?.winnerTier3Milestones.timing).toEqual(expect.objectContaining({
        requiredMilestone: 0,
        nearEndingWindowStart: 0.75,
        attainedNearEndingRate: null,
      }));
      expect(
        Object.values(scenario?.winnerTier3Milestones.exactCountGames ?? {})
          .reduce((sum, count) => sum + count, 0),
      ).toBe(scenario?.gamesCompleted);
      const allPlayerSources = scenario?.scoreSources.allPlayersAverage;
      expect(allPlayerSources).toEqual(expect.objectContaining({
        artifact: expect.any(Number),
        luminaryArrival: expect.any(Number),
        startingCompensation: expect.any(Number),
        blueprintProject: expect.any(Number),
        other: expect.any(Number),
        total: expect.any(Number),
      }));
      if (allPlayerSources) {
        expect(
          allPlayerSources.artifact +
          allPlayerSources.luminaryArrival +
          allPlayerSources.startingCompensation +
          allPlayerSources.blueprintProject +
          allPlayerSources.other,
        ).toBeCloseTo(allPlayerSources.total, 1);
      }
    }
  });

  it("reports the Epic two-Tier-III milestone separately from any Tier III", () => {
    const parsed = parseArtifactSimulationArgs([
      "--games", "1",
      "--seed", "103",
      "--players", "2",
      "--candidate", "control",
      "--policies", "adaptive",
      "--formats", "epic",
    ]);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const report = runArtifactBalanceSimulation(parsed);
    expect(report.schema).toBe("luminae-balance-report/v2");
    if (report.schema === "luminae-balance-report/v2") {
      const milestones = report.candidates[0]?.winnerTier3Milestones;
      expect(milestones?.requiredForFormat).toBe(2);
      expect(milestones?.requiredRate).toEqual(expect.any(Number));
      expect(milestones?.atLeastTwoRate).toEqual(expect.any(Number));
      expect(milestones?.timing).toEqual(expect.objectContaining({
        requiredMilestone: 2,
        nearEndingWindowStart: 0.75,
        attainedGames: expect.any(Number),
        attainedNearEndingGames: expect.any(Number),
        attainedNearEndingRate: expect.any(Number),
      }));
    }
  });

  it("runs every named candidate on paired seed inputs", () => {
    const parsed = parseArtifactSimulationArgs([
      "--games", "1",
      "--seed", "91",
      "--players", "2",
      "--candidate", "all",
      "--policies", "mixed",
      "--formats", "quick",
    ]);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const report = runArtifactBalanceSimulation(parsed);
    expect(report.schema).toBe("luminae-balance-report/v2");
    if (report.schema === "luminae-balance-report/v2") {
      expect(report.candidates.map((scenario) => scenario.candidateId)).toEqual(
        BALANCE_CANDIDATE_IDS,
      );
      for (const scenario of report.candidates) {
        expect(
          Object.values(scenario.finishReasons).reduce((sum, count) => sum + count, 0),
        ).toBe(1);
      }
    }
  });
});
