import { describe, expect, it } from "vitest";
import { BLUEPRINT_CLEARANCE_REQUIRED_WINS } from "@workspace/game-types";
import {
  ARCHITECT_RECORD_DEFINITION,
  deriveArchitectRecordNodeStatuses,
  getArchitectRecordBackfillPresentations,
  getArchitectRecordInterludeLines,
} from "./architectRecordDefinition.js";

describe("Architect Record definition", () => {
  it("keeps a typed prerequisite chain and a future-only launch node", () => {
    expect(ARCHITECT_RECORD_DEFINITION.map((node) => node.id)).toEqual([
      "first_contact",
      "architect_record",
      "vault_threshold",
      "first_charge",
    ]);
    expect(ARCHITECT_RECORD_DEFINITION[3]).toMatchObject({
      publicTitle: "The First Charge",
      prerequisiteIds: ["vault_threshold"],
      presentation: "future",
    });
  });

  it("does not expose Vault progression before tutorial completion", () => {
    expect(deriveArchitectRecordNodeStatuses({
      tutorialCompleted: false,
      qualifyingWins: 0,
      clearanceStatus: "classified",
    })).toEqual({
      first_contact: "active",
      architect_record: "locked",
      vault_threshold: "locked",
      first_charge: "future",
    });
  });

  it("moves the sealed record from available to active to completed", () => {
    expect(deriveArchitectRecordNodeStatuses({
      tutorialCompleted: true,
      qualifyingWins: 0,
      clearanceStatus: "classified",
    }).architect_record).toBe("available");

    expect(deriveArchitectRecordNodeStatuses({
      tutorialCompleted: true,
      qualifyingWins: 2,
      clearanceStatus: "classified",
    }).architect_record).toBe("active");

    const thresholdReady = deriveArchitectRecordNodeStatuses({
      tutorialCompleted: true,
      qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      clearanceStatus: "challenge_ready",
    });
    expect(thresholdReady.architect_record).toBe("completed");
    expect(thresholdReady.vault_threshold).toBe("available");

    const cleared = deriveArchitectRecordNodeStatuses({
      tutorialCompleted: true,
      qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      clearanceStatus: "cleared",
    });
    expect(cleared.vault_threshold).toBe("completed");
    expect(cleared.first_charge).toBe("future");
  });

  it("represents historical wins with one recap instead of replaying missed signals", () => {
    expect(getArchitectRecordBackfillPresentations(0)).toEqual([]);
    expect(getArchitectRecordBackfillPresentations(3)).toEqual([{
      presentationId: "clearance_recap_3",
      kind: "clearance_recap",
      ordinal: 3,
      acknowledged: true,
    }]);
    expect(getArchitectRecordBackfillPresentations(99)).toEqual([{
      presentationId: `clearance_recap_${BLUEPRINT_CLEARANCE_REQUIRED_WINS}`,
      kind: "clearance_recap",
      ordinal: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      acknowledged: true,
    }]);
  });

  it("defines one distinct interlude for every qualifying victory", () => {
    const interludes = Array.from({ length: BLUEPRINT_CLEARANCE_REQUIRED_WINS }, (_, index) =>
      getArchitectRecordInterludeLines(index + 1),
    );

    expect(interludes.every((lines) => lines && lines.length > 0)).toBe(true);
    expect(new Set(interludes.map((lines) => lines?.join(" "))).size).toBe(
      BLUEPRINT_CLEARANCE_REQUIRED_WINS,
    );
    expect(getArchitectRecordInterludeLines(BLUEPRINT_CLEARANCE_REQUIRED_WINS + 1)).toBeNull();
  });
});
