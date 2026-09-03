import { describe, expect, it } from "vitest";
import {
  assessCivilizationLume,
  assessCivilizationOutcome,
  type CivilizationRecordProject,
  type CivilizationState,
} from "@workspace/game-types";
import { initializeGame } from "./gameEngine";

function civilization(): CivilizationState {
  return initializeGame([
    { id: "p1", name: "Architect" },
    { id: "p2", name: "Rival" },
  ], 2).players[0].civilization;
}

function assess(
  state: CivilizationState,
  projects: readonly CivilizationRecordProject[] = [],
) {
  return assessCivilizationOutcome({
    civilization: state,
    projects,
    evidence: "recorded",
  });
}

function addMastery(state: CivilizationState, artifactId: string, turnCount: number) {
  state.artifacts[artifactId] = {
    artifactId,
    firstMasteredTurnCount: turnCount,
    masteryCount: 1,
    implementationState: "operational",
    implementationStateChangedTurnCount: turnCount,
    implementationChangeSource: null,
    historyEvidence: "recorded",
  };
}

function addAuthoredEvent(
  state: CivilizationState,
  eventId: string,
  options: { agencyPressure?: boolean; adversity?: boolean } = {},
) {
  state.events.push({
    eventId,
    source: { sourceType: "chronicle", sourceId: "calibration" },
    turnCount: 8,
    form: "state_modified",
    pressureTags: ["attrition"],
    selectedTrajectoryId: "endure",
    outcome: "success",
    summary: "Calibration fixture",
    history: {},
    outcomeSignals: options.agencyPressure ? [{
      signalId: "agency-pressure",
      dimension: "agency",
      direction: "pressure",
      magnitude: "catastrophic",
      label: "Agency was subordinated",
    }] : [],
    adversity: options.adversity ? {
      evidenceId: "recovery",
      magnitude: "catastrophic",
      label: "A catastrophic pressure was survived",
      recoveryEligible: true,
    } : null,
    historyEvidence: "recorded",
  });
}

describe("Civilization Outcome and Lume calibration", () => {
  it("keeps representative histories inside bounded deterministic ranges", () => {
    const baseline = civilization();
    const developed = structuredClone(baseline);
    ["t1r01", "t1s01", "t1e01", "t1o01", "t1p01"].forEach((id, index) => {
      addMastery(developed, id, index + 1);
    });
    const stellar = structuredClone(developed);
    stellar.scale.historicalMaturity = "stellar";
    stellar.scale.currentReach = "stellar";
    const galactic = structuredClone(stellar);
    galactic.scale.historicalMaturity = "galactic";
    galactic.scale.currentReach = "galactic";
    const crisis = structuredClone(developed);
    crisis.stability.band = "crisis";
    crisis.stability.score = 12;
    const recovered = structuredClone(developed);
    addAuthoredEvent(recovered, "event:recovered", { adversity: true });
    const collapsed = structuredClone(developed);
    collapsed.worlds[collapsed.homeworldId].state = "annihilated";
    const subordinated = structuredClone(developed);
    addAuthoredEvent(subordinated, "event:subordinated-1", { agencyPressure: true });
    addAuthoredEvent(subordinated, "event:subordinated-2", { agencyPressure: true });

    const scenarios = {
      baseline: assess(baseline),
      developed: assess(developed),
      stellar: assess(stellar),
      galactic: assess(galactic),
      crisis: assess(crisis),
      recovered: assess(recovered),
      collapsed: assess(collapsed),
      subordinated: assess(subordinated),
    };

    for (const outcome of Object.values(scenarios)) {
      expect(outcome.qualityScore).toBeGreaterThanOrEqual(0);
      expect(outcome.qualityScore).toBeLessThanOrEqual(100);
      expect(outcome.adversity.recoveryCredit).toBeGreaterThanOrEqual(0);
      expect(outcome.adversity.recoveryCredit).toBeLessThanOrEqual(8);
      for (const dimension of Object.values(outcome.dimensions)) {
        expect(dimension.score).toBeGreaterThanOrEqual(0);
        expect(dimension.score).toBeLessThanOrEqual(100);
      }
      const award = assessCivilizationLume({
        outcome,
        evidence: "recorded",
        gameMode: "standard",
        liveClosure: true,
      });
      expect(award.amount).toBeGreaterThanOrEqual(0);
      expect(award.amount).toBeLessThanOrEqual(10);
    }

    expect(scenarios.developed.dimensions.achievement.score)
      .toBeGreaterThan(scenarios.baseline.dimensions.achievement.score);
    expect(scenarios.stellar.dimensions.achievement.score)
      .toBeGreaterThan(scenarios.developed.dimensions.achievement.score);
    expect(scenarios.galactic.dimensions.achievement.score)
      .toBeGreaterThan(scenarios.stellar.dimensions.achievement.score);
    expect(scenarios.crisis.category).toBe("precarious");
    expect(scenarios.collapsed.category).toBe("collapsed");
    expect(scenarios.subordinated.category).toBe("subordinated");
    expect(scenarios.recovered.adversity.recoveryCredit).toBeGreaterThan(0);
  });

  it("does not stack retried Project or authored evidence IDs", () => {
    const state = civilization();
    const project: CivilizationRecordProject = {
      blueprintId: "bp_antimatter_detonator",
      state: "armed",
      slotIndex: 0,
    };
    const oneProject = assess(state, [project]);
    const retriedProject = assess(state, [project, { ...project, slotIndex: 1 }]);
    expect(retriedProject.dimensions.achievement.score)
      .toBe(oneProject.dimensions.achievement.score);

    const oneEventState = civilization();
    addAuthoredEvent(oneEventState, "event:retry", { agencyPressure: true, adversity: true });
    const retriedEventState = structuredClone(oneEventState);
    retriedEventState.events.push(structuredClone(retriedEventState.events[0]));
    const oneEvent = assess(oneEventState);
    const retriedEvent = assess(retriedEventState);
    expect(retriedEvent.dimensions.agency.score).toBe(oneEvent.dimensions.agency.score);
    expect(retriedEvent.adversity).toEqual(oneEvent.adversity);
  });

  it("never awards forecast, unauthored campaign, custom, or backfill records", () => {
    const outcome = assess(civilization());
    const policies = [
      { gameMode: "campaign" as const, liveClosure: true, campaignLumePolicy: "record_only" as const, status: "campaign_record_only" },
      { gameMode: "campaign" as const, liveClosure: true, status: "campaign_policy_required" },
      { gameMode: "custom" as const, liveClosure: true, status: "custom_ineligible" },
      { gameMode: "standard" as const, liveClosure: false, status: "retroactive_ineligible" },
    ];
    for (const policy of policies) {
      const result = assessCivilizationLume({
        outcome,
        evidence: "recorded",
        gameMode: policy.gameMode,
        liveClosure: policy.liveClosure,
        campaignLumePolicy: "campaignLumePolicy" in policy ? policy.campaignLumePolicy : undefined,
      });
      expect(result).toMatchObject({ status: policy.status, amount: 0 });
    }
  });
});
