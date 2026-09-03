import { describe, expect, it } from "vitest";
import { BLUEPRINT_CLEARANCE_REQUIRED_WINS } from "@workspace/game-types";
import type { BlueprintVaultState } from "@/lib/accountSession";
import {
  reconciledThresholdDialoguePath,
  thresholdActionWasApplied,
} from "@/lib/blueprintThresholdReconciliation";

function vault(
  overrides: Partial<BlueprintVaultState["clearance"]> = {},
): BlueprintVaultState {
  return {
    clearance: {
      qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      status: "challenge_ready",
      challengeRoomId: null,
      cipherDeactivated: true,
      thresholdApproach: "inquiry",
      thresholdDialoguePath: [],
      thresholdDialogueResolution: null,
      covenantBroken: false,
      decryptionKeyBypassActive: false,
      revealPending: false,
      warningSeen: true,
      ...overrides,
    },
    decryptionKeyAvailable: false,
    slotCount: 2,
    competitiveEnabled: false,
    unlockedBlueprintIds: [],
    blueprints: [],
    corruptedRecordCount: null,
    campaignNodes: [],
    loadouts: [],
    mastery: [],
  };
}

describe("Threshold request reconciliation", () => {
  it("accepts a response when the server advanced beyond a lost success reply", () => {
    expect(thresholdActionWasApplied(
      {
        action: "record_dialogue_path",
        path: ["inquiry-demand-answer"],
      },
      vault({
        thresholdDialoguePath: ["inquiry-demand-answer", "inquiry-demand-unsayable"],
      }),
    )).toBe(true);
  });

  it("keeps an unpersisted response available for retry", () => {
    expect(thresholdActionWasApplied(
      {
        action: "record_dialogue_path",
        path: ["inquiry-demand-answer", "inquiry-demand-unsayable"],
      },
      vault({ thresholdDialoguePath: ["inquiry-demand-answer"] }),
    )).toBe(false);
  });

  it("hydrates the valid response recorded by another tab", () => {
    const action = {
      action: "record_dialogue_path" as const,
      path: ["inquiry-demand-answer"] as const,
    };
    expect(reconciledThresholdDialoguePath(
      action,
      vault({
        thresholdDialoguePath: ["inquiry-meaning"],
      }),
    )).toEqual(["inquiry-meaning"]);
  });

  it("does not hydrate an unchanged path after a failed save", () => {
    expect(reconciledThresholdDialoguePath(
      {
        action: "record_dialogue_path",
        path: ["inquiry-demand-answer", "inquiry-demand-unsayable"],
      },
      vault({ thresholdDialoguePath: ["inquiry-demand-answer"] }),
    )).toBeNull();
  });

  it("recognizes active-room progress and a Black Market departure reset", () => {
    expect(thresholdActionWasApplied(
      { action: "deactivate_cipher" },
      vault({ status: "challenge_active", challengeRoomId: "room" }),
    )).toBe(true);
    expect(thresholdActionWasApplied(
      { action: "resolve_dialogue", resolution: "left" },
      vault({
        qualifyingWins: 0,
        status: "classified",
        cipherDeactivated: false,
        thresholdApproach: null,
      }),
    )).toBe(true);
  });
});
