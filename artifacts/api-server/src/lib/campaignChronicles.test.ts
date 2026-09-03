import { describe, expect, it } from "vitest";
import {
  buildCampaignProgressProjection,
  rehearsalEntitlementsAreNonPower,
  validateChronicleDefinitionAuthoring,
  validateChronicleOutcomeAuthoring,
  type ChronicleOutcomeAuthoring,
} from "@workspace/game-types";

const validOutcome: ChronicleOutcomeAuthoring = {
  chronicleId: "chronicle_trace",
  definitionVersion: 1,
  outcomeId: "trace_victory",
  result: "victory",
  facts: [{ key: "chronicle.trace.v1:condition", value: "enduring", visibility: "account" }],
  dimensionContributions: [{
    dimension: "agency",
    direction: "support",
    magnitude: 1,
    rationaleKey: "preserved_self_rule",
    visibility: "sealed",
  }],
  lumiiMemories: [{ key: "trace_observed", valence: 1, visibility: "account" }],
  baselineEntitlements: [{
    kind: "archive_record",
    entitlementId: "chronicle_trace",
    competitivePower: false,
  }],
};

describe("Chronicle campaign contracts", () => {
  it("accepts valid server-authored outcome evidence", () => {
    expect(validateChronicleOutcomeAuthoring(validOutcome)).toEqual([]);
  });

  it("rejects ambiguous or duplicate authored evidence", () => {
    expect(validateChronicleOutcomeAuthoring({
      ...validOutcome,
      definitionVersion: 0,
      facts: [...validOutcome.facts, ...validOutcome.facts],
      dimensionContributions: [
        ...validOutcome.dimensionContributions,
        ...validOutcome.dimensionContributions,
      ],
    })).toEqual(expect.arrayContaining([
      "definitionVersion must be a positive integer",
      "duplicate fact key: chronicle.trace.v1:condition",
      "duplicate contribution: agency:preserved_self_rule",
    ]));
  });

  it("forbids competitive-power rewards from Rehearsals", () => {
    expect(rehearsalEntitlementsAreNonPower([
      { kind: "codex", entitlementId: "codex.trace.alternate", competitivePower: false },
    ])).toBe(true);
    expect(rehearsalEntitlementsAreNonPower([
      { kind: "blueprint", entitlementId: "bp_test", competitivePower: true },
    ])).toBe(false);
  });

  it("requires victory and fail-forward defeat to share baseline power", () => {
    expect(validateChronicleDefinitionAuthoring({
      id: "chronicle_trace",
      definitionVersion: 1,
      title: "The Trace",
      scenarioId: "chronicle_trace_v1",
      released: true,
      lumePolicy: "award",
      prerequisiteChronicleIds: [],
      outcomes: [
        validOutcome,
        {
          ...validOutcome,
          outcomeId: "trace_defeat",
          result: "defeat",
        },
      ],
    })).toEqual([]);

    expect(validateChronicleDefinitionAuthoring({
      id: "chronicle_trace",
      definitionVersion: 1,
      title: "The Trace",
      scenarioId: "chronicle_trace_v1",
      released: true,
      lumePolicy: "award",
      prerequisiteChronicleIds: [],
      outcomes: [
        validOutcome,
        {
          ...validOutcome,
          outcomeId: "trace_defeat",
          result: "defeat",
          baselineEntitlements: [{
            kind: "blueprint",
            entitlementId: "bp_branch_power",
            competitivePower: true,
          }],
        },
      ],
    })).toEqual(expect.arrayContaining([
      "Baseline entitlements must be outcome-invariant",
    ]));
  });

  it("reports unreleased Chronicles honestly and gates Threshold on primary history", () => {
    const pending = buildCampaignProgressProjection({
      releasedChronicleIds: [],
      primaryOutcomes: [],
      rehearsals: [],
      calibrationInsightChronicleIds: [],
    });
    expect(pending.openingChronicles.map((entry) => entry.state)).toEqual([
      "pending_release",
      "pending_release",
      "pending_release",
    ]);
    expect(pending.thresholdAvailable).toBe(false);

    const completedAt = "2026-08-23T12:00:00.000Z";
    const complete = buildCampaignProgressProjection({
      releasedChronicleIds: [
        "chronicle_trace",
        "chronicle_recurrence",
        "chronicle_triangulation",
      ],
      primaryOutcomes: [
        { chronicleId: "chronicle_trace", definitionVersion: 1, outcomeId: "loss", result: "defeat", roomId: null, completedAt, lumeEarned: 0 },
        { chronicleId: "chronicle_recurrence", definitionVersion: 1, outcomeId: "win", result: "victory", roomId: null, completedAt, lumeEarned: 1 },
        { chronicleId: "chronicle_triangulation", definitionVersion: 1, outcomeId: "loss", result: "defeat", roomId: null, completedAt, lumeEarned: 0 },
      ],
      rehearsals: [],
      calibrationInsightChronicleIds: [],
    });
    expect(complete.thresholdAvailable).toBe(true);
    expect(complete.completedPrimaryCount).toBe(3);
    expect(complete.openingChronicles.every((entry) => entry.state === "completed")).toBe(true);
  });

  it("labels a replay as Rehearsal without replacing the primary result", () => {
    const completedAt = "2026-08-23T12:00:00.000Z";
    const projection = buildCampaignProgressProjection({
      releasedChronicleIds: ["chronicle_trace"],
      primaryOutcomes: [{
        chronicleId: "chronicle_trace",
        definitionVersion: 1,
        outcomeId: "trace_defeat",
        result: "defeat",
        roomId: null,
        completedAt,
        lumeEarned: 0,
      }],
      rehearsals: [{
        chronicleId: "chronicle_trace",
        definitionVersion: 1,
        outcomeId: "trace_victory",
        result: "victory",
        roomId: null,
        completedAt,
        preparednessObjectiveMet: true,
      }],
      calibrationInsightChronicleIds: ["chronicle_trace"],
    });
    expect(projection.openingChronicles[0]).toMatchObject({
      state: "rehearsal",
      rehearsalCount: 1,
      calibrationInsightEarned: true,
      primary: { result: "defeat", outcomeId: "trace_defeat" },
    });
  });
});
