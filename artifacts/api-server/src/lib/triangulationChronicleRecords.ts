import {
  TRIANGULATION_CHRONICLE_ID,
  TRIANGULATION_DEFINITION_VERSION,
  TRIANGULATION_SCENARIO_ID,
  type CivilizationRecord,
  type TriangulationReferenceCivilization,
} from "@workspace/game-types";
import type { GameStateData, PlayerGameState } from "./gameEngine";
import { buildCivilizationRecord } from "./civilizationRecords";
import type { ChronicleHistoricalRecordInput } from "./campaignChronicles";

const DOMAIN_RECORD_KEY = "domain:blind_transit";
const SHARED_LATTICE_ENTITY_ID = "ent_three_bearing_lattice";
const CIVILIZATION_NAMES: Record<TriangulationReferenceCivilization, string> = {
  deme: "Deme Assemblies",
  myria: "Myriad Groves",
  vesper: "Vesper Choir",
};

function referenceForPlayer(
  state: GameStateData,
  playerId: string,
): TriangulationReferenceCivilization | null {
  const scenario = state.triangulationScenario;
  if (!scenario) return null;
  if (playerId === scenario.architectPlayerId) return "deme";
  if (playerId === scenario.myriaPlayerId) return "myria";
  if (playerId === scenario.vesperPlayerId) return "vesper";
  return null;
}

function participantRecord(
  state: GameStateData,
  player: PlayerGameState,
  accountId: string,
  roomId: string,
  finishedAt: Date,
  reference: TriangulationReferenceCivilization,
): CivilizationRecord {
  const result = state.winnerId === null ? "tie" : state.winnerId === player.playerId ? "win" : "loss";
  return buildCivilizationRecord({
    roomId,
    accountId,
    player,
    gameMode: "campaign",
    scenarioId: TRIANGULATION_SCENARIO_ID,
    historicalContext: "historical",
    startedAt: state.startedAt ?? null,
    finishedAt,
    finishReason: state.finishReason === "win" || state.finishReason === "surrender"
      ? state.finishReason
      : "unknown",
    result,
    totalPlayers: 3,
    liveClosure: true,
    campaignLumePolicy: reference === "deme" ? "award" : "record_only",
  });
}

/** Build the four immutable history rows produced only by a primary Triangulation closure. */
export function buildTriangulationHistoricalRecords(
  state: GameStateData,
  accountId: string,
  roomId: string,
  finishedAt: Date,
): ChronicleHistoricalRecordInput[] {
  const scenario = state.triangulationScenario;
  if (!scenario || scenario.phase !== "finished" || !scenario.outcomeId ||
      !scenario.coordinationArchitecture || !scenario.referenceCivilization) return [];

  const participantRows = state.players.flatMap((player) => {
    const reference = referenceForPlayer(state, player.playerId);
    if (!reference) return [];
    const record = participantRecord(state, player, accountId, roomId, finishedAt, reference);
    return [{
      recordKind: "civilization" as const,
      recordKey: `civilization:${reference}`,
      payload: {
        civilizationKey: reference,
        civilizationName: CIVILIZATION_NAMES[reference],
        controller: reference === "deme" ? "architect" : "autonomous",
        record: record as unknown as Record<string, unknown>,
      },
    }];
  });
  if (participantRows.length !== 3) return [];

  const domainRecord: ChronicleHistoricalRecordInput = {
    recordKind: "domain",
    recordKey: DOMAIN_RECORD_KEY,
    payload: {
      version: 1,
      domainId: "domain_blind_transit",
      cohortId: "cohort_orthe_three_bearings",
      title: "Blind Transit",
      chronicleId: TRIANGULATION_CHRONICLE_ID,
      scenarioId: TRIANGULATION_SCENARIO_ID,
      definitionVersion: TRIANGULATION_DEFINITION_VERSION,
      outcomeId: scenario.outcomeId,
      coordinationArchitecture: scenario.coordinationArchitecture,
      referenceCivilization: scenario.referenceCivilization,
      sharedLatticeEntityId: SHARED_LATTICE_ENTITY_ID,
      participantRecordKeys: participantRows.map((record) => record.recordKey),
      preparednessMet: scenario.preparednessMet,
      preparednessCapabilityId: scenario.preparednessCapabilityId,
      preparednessArtifactId: scenario.preparednessArtifactId,
      finishedAt: finishedAt.toISOString(),
    },
  };
  return [domainRecord, ...participantRows];
}
