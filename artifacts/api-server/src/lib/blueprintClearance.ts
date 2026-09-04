import type {
  BlueprintPolicy,
  GameMode,
  LumiiThresholdDialogueChoiceId,
  LumiiThresholdDialogueResolution,
  LumiiThresholdApproach,
} from "@workspace/game-types";
import {
  LUMII_THRESHOLD_DIALOGUE_CHOICE_IDS,
  LUMII_THRESHOLD_DIALOGUE_PATHS,
} from "@workspace/game-types";

export type BlueprintThresholdAction =
  | { action: "deactivate_cipher" }
  | { action: "choose_approach"; approach: LumiiThresholdApproach };

export type BlueprintThresholdDecision =
  | {
      ok: true;
      cipherDeactivated: true;
      thresholdApproach: LumiiThresholdApproach | null;
      writeCipher: boolean;
      writeApproach: LumiiThresholdApproach | null;
    }
  | { ok: false; status: 409; error: string };

export function freshLumiiEncounterMemory() {
  return {
    warningSeenAt: null,
    cipherDeactivatedAt: null,
    thresholdApproach: null,
    thresholdDialoguePath: [] as LumiiThresholdDialogueChoiceId[],
    thresholdDialogueResolution: null,
    thresholdRupturedAt: null,
    covenantBrokenAt: null,
  };
}

export function decideBlueprintThresholdAction(
  state: {
    cipherDeactivated: boolean;
    thresholdApproach: LumiiThresholdApproach | null;
  },
  action: BlueprintThresholdAction,
): BlueprintThresholdDecision {
  if (action.action === "deactivate_cipher") {
    return {
      ok: true,
      cipherDeactivated: true,
      thresholdApproach: state.thresholdApproach,
      writeCipher: !state.cipherDeactivated,
      writeApproach: null,
    };
  }
  if (!state.cipherDeactivated) {
    return { ok: false, status: 409, error: "The Supreme Cipher is still active" };
  }
  if (state.thresholdApproach !== null && state.thresholdApproach !== action.approach) {
    return {
      ok: false,
      status: 409,
      error: "Your approach at this threshold has already been recorded",
    };
  }
  return {
    ok: true,
    cipherDeactivated: true,
    thresholdApproach: action.approach,
    writeCipher: false,
    writeApproach: state.thresholdApproach === null ? action.approach : null,
  };
}

const dialogueChoiceIds = new Set<string>(LUMII_THRESHOLD_DIALOGUE_CHOICE_IDS);

export function normalizeLumiiThresholdDialoguePath(
  value: unknown,
): LumiiThresholdDialogueChoiceId[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || !dialogueChoiceIds.has(entry))) {
    return [];
  }
  return [...value] as LumiiThresholdDialogueChoiceId[];
}

export function normalizeLumiiThresholdDialogueResolution(
  value: unknown,
): LumiiThresholdDialogueResolution | null {
  return value === "left" || value === "continued" ? value : null;
}

function pathsEqual(
  left: readonly LumiiThresholdDialogueChoiceId[],
  right: readonly LumiiThresholdDialogueChoiceId[],
): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function isLumiiThresholdDialoguePathPrefix(
  approach: LumiiThresholdApproach,
  path: readonly LumiiThresholdDialogueChoiceId[],
): boolean {
  return LUMII_THRESHOLD_DIALOGUE_PATHS[approach].some(
    (completePath) => path.length <= completePath.length && path.every((entry, index) => entry === completePath[index]),
  );
}

export function isCompleteLumiiThresholdDialoguePath(
  approach: LumiiThresholdApproach,
  path: readonly LumiiThresholdDialogueChoiceId[],
): boolean {
  return LUMII_THRESHOLD_DIALOGUE_PATHS[approach].some((completePath) => pathsEqual(path, completePath));
}

export type LumiiDialoguePathDecision =
  | { ok: true; writePath: LumiiThresholdDialogueChoiceId[] | null }
  | { ok: false; status: 409; error: string };

export function decideLumiiDialoguePathUpdate(
  state: {
    approach: LumiiThresholdApproach;
    path: readonly LumiiThresholdDialogueChoiceId[];
    resolution: LumiiThresholdDialogueResolution | null;
  },
  nextPath: readonly LumiiThresholdDialogueChoiceId[],
): LumiiDialoguePathDecision {
  if (pathsEqual(state.path, nextPath)) return { ok: true, writePath: null };
  if (state.resolution !== null) {
    return { ok: false, status: 409, error: "This threshold exchange has already ended" };
  }
  if (
    nextPath.length !== state.path.length + 1 ||
    !state.path.every((entry, index) => entry === nextPath[index]) ||
    !isLumiiThresholdDialoguePathPrefix(state.approach, nextPath)
  ) {
    return { ok: false, status: 409, error: "That response does not follow this exchange" };
  }
  return { ok: true, writePath: [...nextPath] };
}

export type LumiiDialogueLeaveDecision =
  | { ok: true; writeResolution: "left" | null }
  | { ok: false; status: 409; error: string };

export function decideLumiiDialogueLeave(
  resolution: LumiiThresholdDialogueResolution | null,
): LumiiDialogueLeaveDecision {
  if (resolution === "continued") {
    return { ok: false, status: 409, error: "The Covenant has already broken" };
  }
  return { ok: true, writeResolution: resolution === "left" ? null : "left" };
}

export interface BlueprintClearanceParticipant {
  id: string;
  isAi: boolean;
  aiDifficulty: string | null;
}

export function isQualifyingBlueprintVictory(input: {
  gameMode: GameMode;
  blueprintPolicy: BlueprintPolicy;
  playerId: string;
  winnerId: string | null;
  participants: readonly BlueprintClearanceParticipant[];
}): boolean {
  if (input.gameMode !== "standard" || input.blueprintPolicy !== "none") return false;
  if (input.winnerId !== input.playerId || input.participants.length !== 4) return false;
  const player = input.participants.find((participant) => participant.id === input.playerId);
  if (!player || player.isAi) return false;
  const opponents = input.participants.filter((participant) => participant.id !== input.playerId);
  return opponents.length === 3 && opponents.every(
    (opponent) => opponent.isAi && opponent.aiDifficulty === "hard",
  );
}
