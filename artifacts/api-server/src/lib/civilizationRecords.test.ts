import { describe, expect, it } from "vitest";
import { GetMyStatsResponse } from "@workspace/api-zod";
import {
  CIVILIZATION_RECORD_VERSION,
  CHRONICLE_DEFINITIONS,
  summarizeCivilizationRecord,
  type CivilizationCampaignLumePolicy,
  type CivilizationHistoricalContext,
} from "@workspace/game-types";
import { buildCivilizationRecord } from "./civilizationRecords";
import { getCivilizationScenarioPolicy } from "./civilizationScenarioPolicies";
import { initializeGame, type PlayerGameState } from "./gameEngine";

function build(
  player: PlayerGameState,
  options: {
    result?: "win" | "loss" | "tie";
    gameMode?: "standard" | "campaign" | "custom" | "competitive";
    liveClosure?: boolean;
    finishReason?: "win" | "surrender" | "unknown";
    historicalContext?: CivilizationHistoricalContext;
    campaignLumePolicy?: CivilizationCampaignLumePolicy;
  } = {},
) {
  return buildCivilizationRecord({
    roomId: "00000000-0000-4000-8000-000000000001",
    accountId: "00000000-0000-4000-8000-000000000002",
    player,
    gameMode: options.gameMode ?? "standard",
    scenarioId: null,
    historicalContext: options.historicalContext ?? "historical",
    startedAt: 100,
    finishedAt: new Date("2026-08-23T12:00:00.000Z"),
    finishReason: options.finishReason ?? "win",
    result: options.result ?? "win",
    totalPlayers: 2,
    liveClosure: options.liveClosure ?? true,
    campaignLumePolicy: options.campaignLumePolicy,
  });
}

describe("Civilization Records", () => {
  it("captures an immutable current-state closure snapshot", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    const player = state.players[0];
    player.civilization.events.push({
      eventId: "event:recorded",
      source: { sourceType: "scenario", sourceId: "test" },
      turnCount: 3,
      form: "automatic",
      pressureTags: ["disruption"],
      selectedTrajectoryId: "contain",
      outcome: "success",
      summary: "Disruption contained",
      history: {},
      outcomeSignals: [],
      adversity: null,
      historyEvidence: "recorded",
    });

    const record = build(player);
    player.civilization.events[0].summary = "mutated later";

    expect(record).toMatchObject({
      version: CIVILIZATION_RECORD_VERSION,
      evidence: "recorded",
      gameMode: "standard",
      historicalContext: "historical",
      finishReason: "win",
      competitiveResult: "win",
      outcome: {
        category: "enduring",
      },
      lume: {
        status: "awarded",
        amount: 2,
      },
    });
    expect(record.civilization?.events[0].summary).toBe("Disruption contained");
    expect(record.lume.explanation).toContain(
      "Achievement 10/100 limits this award to 2 Lume.",
    );
    expect(summarizeCivilizationRecord(record)).toMatchObject({
      evidence: "recorded",
      historicalContext: "historical",
      historicalMaturity: "planetary",
      stabilityBand: "stable",
      civilizationEventCount: 1,
      outcome: {
        category: "enduring",
        qualityScore: 62,
      },
      lume: {
        status: "awarded",
        amount: 2,
      },
    });
  });

  it("marks unavailable legacy fields instead of fabricating a civilization", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    const legacyPlayer = {
      ...state.players[0],
      civilization: undefined,
    } as unknown as PlayerGameState;
    const record = build(legacyPlayer);

    expect(record.evidence).toBe("legacy_unavailable");
    expect(record.civilization).toBeNull();
    expect(record.unavailableFields).toEqual(expect.arrayContaining([
      "artifact_lifecycle",
      "stability",
      "historical_maturity",
      "civilization_events",
      "civilization_outcome",
      "lume_assessment",
    ]));
    expect(summarizeCivilizationRecord(record)).toMatchObject({
      historicalMaturity: null,
      stabilityBand: null,
      civilizationEventCount: null,
      outcome: null,
      lume: {
        status: "unavailable",
        amount: 0,
      },
    });
  });

  it("assesses historical quality independently of victory and Eminence", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    const player = state.players[0];
    player.eminence = 99;
    player.civilization.events.push({
      eventId: "event:achievement",
      source: { sourceType: "chronicle", sourceId: "test" },
      turnCount: 8,
      form: "automatic",
      pressureTags: ["transformation"],
      selectedTrajectoryId: "complete",
      outcome: "success",
      summary: "A civilization-scale work was completed",
      history: {},
      outcomeSignals: [
        {
          signalId: "achievement-one",
          dimension: "achievement",
          direction: "support",
          magnitude: "catastrophic",
          label: "An extraordinary historical work was completed",
        },
        {
          signalId: "achievement-two",
          dimension: "achievement",
          direction: "support",
          magnitude: "catastrophic",
          label: "The work permanently changed the civilization's reach",
        },
      ],
      adversity: null,
      historyEvidence: "recorded",
    });

    const loss = build(player, { result: "loss" });
    player.eminence = 0;
    const win = build(player, { result: "win" });

    expect(loss.competitiveResult).toBe("loss");
    expect(loss.outcome?.category).toBe("ascendant");
    expect(loss.outcome?.qualityScore).toBe(win.outcome?.qualityScore);
    expect(loss.lume.amount).toBe(win.lume.amount);
  });

  it("records adversity as bounded recovery context rather than a fifth dimension", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    const player = state.players[0];
    player.civilization.events.push({
      eventId: "event:recovery",
      source: { sourceType: "chronicle", sourceId: "test" },
      turnCount: 6,
      form: "state_modified",
      pressureTags: ["attrition"],
      selectedTrajectoryId: "recover",
      outcome: "success",
      summary: "The civilization recovered from a severe pressure",
      history: {},
      outcomeSignals: [],
      adversity: {
        evidenceId: "severe-pressure",
        magnitude: "severe",
        label: "A severe pressure was overcome",
        recoveryEligible: true,
      },
      historyEvidence: "recorded",
    });

    const record = build(player);

    expect(record.outcome?.adversity).toMatchObject({
      intensity: 20,
      recoveryEligibleIntensity: 20,
      recoveryCredit: 3,
    });
    expect(Object.keys(record.outcome?.dimensions ?? {})).toEqual([
      "continuity",
      "agency",
      "achievement",
      "stability",
    ]);
  });

  it("deduplicates retried outcome and adversity evidence", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    const player = state.players[0];
    const retriedEvent = {
      eventId: "event:retried",
      source: { sourceType: "chronicle" as const, sourceId: "test" },
      turnCount: 6,
      form: "state_modified" as const,
      pressureTags: ["attrition" as const],
      selectedTrajectoryId: "recover",
      outcome: "success" as const,
      summary: "A retried resolution remained one historical event",
      history: {},
      outcomeSignals: [{
        signalId: "one-continuity-support",
        dimension: "continuity" as const,
        direction: "support" as const,
        magnitude: "material" as const,
        label: "One continuity support",
      }],
      adversity: {
        evidenceId: "one-adversity",
        magnitude: "severe" as const,
        label: "One severe pressure",
        recoveryEligible: true,
      },
      historyEvidence: "recorded" as const,
    };
    player.civilization.events.push(retriedEvent, structuredClone(retriedEvent));

    const once = build({
      ...player,
      civilization: {
        ...player.civilization,
        events: [retriedEvent],
      },
    });
    const retried = build(player);

    expect(retried.outcome?.dimensions.continuity.score).toBe(
      once.outcome?.dimensions.continuity.score,
    );
    expect(retried.outcome?.adversity).toEqual(once.outcome?.adversity);
  });

  it("requires an explicit campaign policy and supports record-only forecasts", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    const player = state.players[0];

    expect(build(player, { gameMode: "custom" }).lume.status).toBe("custom_ineligible");
    expect(build(player, { gameMode: "campaign" }).lume.status).toBe("campaign_policy_required");
    expect(build(player, {
      gameMode: "campaign",
      historicalContext: "forecast",
      campaignLumePolicy: "record_only",
    }).lume).toMatchObject({ status: "campaign_record_only", amount: 0 });
    expect(build(player, {
      gameMode: "campaign",
      campaignLumePolicy: "award",
    }).lume.status).toBe("awarded");
    expect(build(player, { liveClosure: false }).lume.status).toBe("retroactive_ineligible");
    expect(build(player, { gameMode: "custom" }).lume.amount).toBe(0);
  });

  it("classifies ordinary, Lumii forecast, and unauthored campaign history", () => {
    expect(getCivilizationScenarioPolicy("standard", null)).toMatchObject({
      historicalContext: "historical",
    });
    expect(getCivilizationScenarioPolicy("campaign", "blueprint_clearance_lumii")).toMatchObject({
      historicalContext: "forecast",
      campaignLumePolicy: "record_only",
    });
    expect(getCivilizationScenarioPolicy("campaign", "future_campaign")).toMatchObject({
      historicalContext: "unknown",
    });
  });

  it("keeps the current Chronicle as an account record, not runtime Outcome pressure", () => {
    expect(CHRONICLE_DEFINITIONS.chronicle_outer_vault_access.civilization).toEqual({
      role: "account_record",
      outcomeProfiles: [],
    });
  });

  it("preserves surrender and unknown legacy closure reasons without changing Outcome", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    const surrender = build(state.players[0], { finishReason: "surrender", result: "loss" });
    const unknown = build(state.players[0], { finishReason: "unknown", liveClosure: false });

    expect(surrender.finishReason).toBe("surrender");
    expect(surrender.outcome?.qualityScore).toBe(unknown.outcome?.qualityScore);
    expect(unknown.unavailableFields).toContain("finish_reason");
  });

  it("distinguishes collapsed continuity from subordinated agency", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    const collapsedPlayer = state.players[0];
    collapsedPlayer.civilization.worlds[collapsedPlayer.civilization.homeworldId].state = "annihilated";

    const collapsed = build(collapsedPlayer);
    expect(collapsed.outcome?.category).toBe("collapsed");
    expect(collapsed.outcome?.qualityScore).toBeLessThanOrEqual(30);

    const diasporaState = initializeGame([
      { id: "p5", name: "Architect" },
      { id: "p6", name: "Rival" },
    ], 2);
    const diasporaPlayer = diasporaState.players[0];
    diasporaPlayer.civilization.worlds[diasporaPlayer.civilization.homeworldId].state = "annihilated";
    diasporaPlayer.civilization.worlds["world:settlement"] = {
      id: "world:settlement",
      role: "settled_world",
      name: "Haven",
      state: "active",
      establishedTurnCount: 3,
      stateChangedTurnCount: 3,
      conditionIds: [],
      historyEvidence: "recorded",
    };
    expect(build(diasporaPlayer).outcome?.category).toBe("precarious");

    const agencyState = initializeGame([
      { id: "p3", name: "Architect" },
      { id: "p4", name: "Rival" },
    ], 2);
    const subordinatedPlayer = agencyState.players[0];
    subordinatedPlayer.civilization.events.push({
      eventId: "event:agency-loss",
      source: { sourceType: "chronicle", sourceId: "test" },
      turnCount: 4,
      form: "automatic",
      pressureTags: ["coordination"],
      selectedTrajectoryId: "submit",
      outcome: "success",
      summary: "Civilizational self-direction was surrendered",
      history: {},
      outcomeSignals: [
        {
          signalId: "agency-loss-one",
          dimension: "agency",
          direction: "pressure",
          magnitude: "catastrophic",
          label: "Independent institutions were extinguished",
        },
        {
          signalId: "agency-loss-two",
          dimension: "agency",
          direction: "pressure",
          magnitude: "catastrophic",
          label: "Future trajectories became externally controlled",
        },
      ],
      adversity: null,
      historyEvidence: "recorded",
    });

    expect(build(subordinatedPlayer).outcome?.category).toBe("subordinated");
  });

  it("reads an earlier version-one record without fabricating an assessment", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    const earlierRecord = build(state.players[0]) as unknown as Record<string, unknown>;
    earlierRecord.version = 1;
    delete earlierRecord.outcome;
    delete earlierRecord.lume;
    delete earlierRecord.historicalContext;

    expect(summarizeCivilizationRecord(earlierRecord as never)).toMatchObject({
      outcome: null,
      historicalContext: "unknown",
      lume: {
        status: "unavailable",
        amount: 0,
      },
    });
  });

  it("publishes structural causes while anonymizing authored Outcome labels", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    state.players[0].civilization.scale.currentReachCondition = "degraded";
    state.players[0].civilization.events.push({
      eventId: "event:secret",
      source: { sourceType: "blueprint", sourceId: "bp_secret" },
      turnCount: 4,
      form: "automatic",
      pressureTags: ["attrition"],
      selectedTrajectoryId: "contain",
      outcome: "success",
      summary: "Private project consequence",
      history: {},
      outcomeSignals: [{
        signalId: "secret-continuity",
        dimension: "continuity",
        direction: "support",
        magnitude: "severe",
        label: "Secret Antimatter continuity protocol",
      }],
      adversity: null,
      historyEvidence: "recorded",
    });

    const serialized = JSON.stringify(summarizeCivilizationRecord(build(state.players[0])));
    expect(serialized).toContain("Operational reach is degraded");
    expect(serialized).toContain("Recorded continuity support");
    expect(serialized).not.toContain("Secret Antimatter continuity protocol");
  });

  it("matches the public account-stats response contract", () => {
    const state = initializeGame([
      { id: "p1", name: "Architect" },
      { id: "p2", name: "Rival" },
    ], 2);
    const record = build(state.players[0]);
    const summary = summarizeCivilizationRecord(record);

    expect(GetMyStatsResponse.safeParse({
      gamesPlayed: 1,
      wins: 0,
      losses: 1,
      ties: 0,
      avgEminence: 0,
      totalLume: record.lume.amount,
      recentGames: [{
        roomId: record.roomId,
        inviteCode: "ARCHIVED",
        finishedAt: record.finishedAt,
        result: "loss",
        eminenceEarned: 0,
        totalPlayers: 2,
        civilizationRecord: summary,
      }],
    }).success).toBe(true);
  });
});
