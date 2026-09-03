import type { CampaignNodeStatus } from "@workspace/game-types";
import { BLUEPRINT_CLEARANCE_REQUIRED_WINS } from "@workspace/game-types";

export const ARCHITECT_RECORD_CAMPAIGN_ID = "architect_record" as const;

const ARCHITECT_RECORD_INTERLUDE_LINES: Readonly<Record<number, readonly string[]>> = {
  1: ["That frequency again.", "It recognized the shape of your civilization."],
  2: ["The signal returned at the same interval.", "This is not interference."],
  3: ["The Cipher is learning your victories.", "Something behind it is learning faster."],
  4: ["One seal remains.", "Lumii has stopped answering questions about it."],
  5: ["The final seal has opened.", "Return to the Archive. Lumii is waiting."],
};

export function getArchitectRecordInterludeLines(ordinal: number): readonly string[] | null {
  const lines = ARCHITECT_RECORD_INTERLUDE_LINES[ordinal];
  return lines ? [...lines] : null;
}

export interface CampaignNodeDefinition {
  id: "first_contact" | "architect_record" | "vault_threshold" | "first_charge";
  internalTitle: string;
  publicTitle: string;
  prerequisiteIds: readonly CampaignNodeDefinition["id"][];
  presentation: "tutorial" | "progress" | "encounter" | "future";
  choices: readonly string[];
}

export const ARCHITECT_RECORD_DEFINITION: readonly CampaignNodeDefinition[] = [
  {
    id: "first_contact",
    internalTitle: "First Contact",
    publicTitle: "First Contact",
    prerequisiteIds: [],
    presentation: "tutorial",
    choices: ["first_contact_stance"],
  },
  {
    id: "architect_record",
    internalTitle: "Architect Record",
    publicTitle: "Architect Record",
    prerequisiteIds: ["first_contact"],
    presentation: "progress",
    choices: [],
  },
  {
    id: "vault_threshold",
    internalTitle: "Vault Threshold",
    publicTitle: "Restricted Record",
    prerequisiteIds: ["architect_record"],
    presentation: "encounter",
    choices: ["threshold_approach", "threshold_dialogue"],
  },
  {
    id: "first_charge",
    internalTitle: "The First Charge",
    publicTitle: "The First Charge",
    prerequisiteIds: ["vault_threshold"],
    presentation: "future",
    choices: [],
  },
];

export interface ArchitectRecordPresentationSeed {
  presentationId: string;
  kind: "clearance_recap";
  ordinal: number;
  acknowledged: true;
}

export function getArchitectRecordBackfillPresentations(
  qualifyingWins: number,
): ArchitectRecordPresentationSeed[] {
  const normalizedWins = Math.min(
    BLUEPRINT_CLEARANCE_REQUIRED_WINS,
    Math.max(0, Math.floor(qualifyingWins)),
  );
  if (normalizedWins === 0) return [];
  return [{
    presentationId: `clearance_recap_${normalizedWins}`,
    kind: "clearance_recap",
    ordinal: normalizedWins,
    acknowledged: true,
  }];
}

export function deriveArchitectRecordNodeStatuses(input: {
  tutorialCompleted: boolean;
  qualifyingWins: number;
  clearanceStatus: string;
}): Record<CampaignNodeDefinition["id"], CampaignNodeStatus> {
  const thresholdComplete = input.clearanceStatus === "cleared";
  const recordComplete = input.qualifyingWins >= BLUEPRINT_CLEARANCE_REQUIRED_WINS;
  return {
    first_contact: input.tutorialCompleted ? "completed" : "active",
    architect_record: !input.tutorialCompleted
      ? "locked"
      : recordComplete
        ? "completed"
        : input.qualifyingWins > 0
          ? "active"
          : "available",
    vault_threshold: thresholdComplete
      ? "completed"
      : input.clearanceStatus === "challenge_active"
        ? "active"
        : recordComplete
          ? "available"
          : "locked",
    first_charge: "future",
  };
}
