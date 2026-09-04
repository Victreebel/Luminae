import {
  BLUEPRINT_IDS,
  CIVILIZATION_RECORD_VERSION,
  CIVILIZATION_STATE_VERSION,
  GAME_MODES,
  LUMINARY_IDS,
  assessCivilizationLume,
  assessCivilizationOutcome,
  type BlueprintId,
  type CivilizationRecord,
  type CivilizationRecordEvidence,
  type CivilizationRecordFinishReason,
  type CivilizationCampaignLumePolicy,
  type CivilizationHistoricalContext,
  type CivilizationState,
  type GameMode,
  type LuminaryId,
} from "@workspace/game-types";
import type { PlayerGameState } from "./gameEngine";

function isCurrentCivilizationState(value: unknown): value is CivilizationState {
  return typeof value === "object" && value !== null &&
    (value as { version?: unknown }).version === CIVILIZATION_STATE_VERSION;
}

function containsLegacyEvidence(state: CivilizationState): boolean {
  return state.stability.historyEvidence === "legacy_inferred" ||
    state.scale.literalKardashevEvidence === "legacy_inferred" ||
    Object.values(state.artifacts).some((artifact) => artifact.historyEvidence === "legacy_inferred") ||
    Object.values(state.worlds).some((world) => world.historyEvidence === "legacy_inferred") ||
    Object.values(state.entities).some((entity) => entity.historyEvidence === "legacy_inferred") ||
    Object.values(state.conditions).some((condition) => condition.historyEvidence === "legacy_inferred") ||
    state.events.some((event) => event.historyEvidence === "legacy_inferred");
}

function gameMode(value: string): GameMode {
  return GAME_MODES.includes(value as GameMode) ? value as GameMode : "standard";
}

function cloneCivilization(state: CivilizationState): CivilizationState {
  return structuredClone(state);
}

export interface BuildCivilizationRecordInput {
  roomId: string;
  accountId: string;
  player: PlayerGameState;
  gameMode: string;
  scenarioId: string | null;
  historicalContext: CivilizationHistoricalContext;
  startedAt: number | null;
  finishedAt: Date;
  finishReason: CivilizationRecordFinishReason;
  result: "win" | "loss" | "tie";
  totalPlayers: number;
  liveClosure: boolean;
  campaignLumePolicy?: CivilizationCampaignLumePolicy;
}

/**
 * Captures only evidence present at closure. Legacy matches receive explicit
 * unknown fields instead of reconstructed Stability, Maturity, or event data.
 */
export function buildCivilizationRecord(
  input: BuildCivilizationRecordInput,
): CivilizationRecord {
  const currentCivilization = isCurrentCivilizationState(input.player.civilization)
    ? cloneCivilization(input.player.civilization)
    : null;
  const evidence: CivilizationRecordEvidence = currentCivilization === null
    ? "legacy_unavailable"
    : containsLegacyEvidence(currentCivilization)
      ? "partial_legacy"
      : "recorded";
  const unavailableFields = new Set<string>(["chronicle_outcomes"]);
  if (!currentCivilization) {
    for (const field of [
      "artifact_lifecycle",
      "worlds",
      "conditions",
      "stability",
      "affinity_identity",
      "historical_maturity",
      "current_reach",
      "civilization_events",
      "civilization_outcome",
      "lume_assessment",
    ]) unavailableFields.add(field);
  } else if (evidence === "partial_legacy") {
    unavailableFields.add("exact_legacy_transition_timing");
  }
  if (input.finishReason === "unknown") unavailableFields.add("finish_reason");
  if (input.historicalContext === "unknown") unavailableFields.add("historical_context");

  const projects = (input.player.manifestedBlueprintDevices ?? [])
    .filter((device): device is typeof device & { blueprintId: BlueprintId } =>
      BLUEPRINT_IDS.includes(device.blueprintId as BlueprintId),
    )
    .map((device) => ({
      blueprintId: device.blueprintId,
      state: device.state,
      slotIndex: device.slotIndex,
    }))
    .sort((left, right) => left.slotIndex - right.slotIndex);
  const allianceCounts = input.player.luminaryAllianceCounts ?? {};
  const luminaryRelationships = Object.entries(allianceCounts)
    .filter((entry): entry is [LuminaryId, number] =>
      LUMINARY_IDS.includes(entry[0] as LuminaryId) &&
      Number.isInteger(entry[1]) && entry[1] > 0,
    )
    .map(([luminaryId, allianceCount]) => ({ luminaryId, allianceCount }))
    .sort((left, right) => left.luminaryId.localeCompare(right.luminaryId));
  const normalizedGameMode = gameMode(input.gameMode);
  const outcome = currentCivilization
    ? assessCivilizationOutcome({
        civilization: currentCivilization,
        projects,
        evidence,
      })
    : null;
  const lume = assessCivilizationLume({
    outcome,
    evidence,
    gameMode: normalizedGameMode,
    liveClosure: input.liveClosure,
    campaignLumePolicy: input.campaignLumePolicy,
  });

  return {
    version: CIVILIZATION_RECORD_VERSION,
    evidence,
    matchInstanceId: `${input.roomId}:${input.startedAt ?? "legacy"}`,
    roomId: input.roomId,
    playerId: input.player.playerId,
    accountId: input.accountId,
    gameMode: normalizedGameMode,
    scenarioId: input.scenarioId,
    historicalContext: input.historicalContext,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt.toISOString(),
    finishReason: input.finishReason,
    competitiveResult: input.result,
    finalEminence: Math.max(0, Math.trunc(input.player.eminence)),
    totalPlayers: Math.max(0, Math.trunc(input.totalPlayers)),
    civilization: currentCivilization,
    projects,
    luminaryRelationships,
    outcome,
    lume,
    unavailableFields: [...unavailableFields].sort(),
  };
}
