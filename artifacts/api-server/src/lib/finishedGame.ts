import { eq } from "drizzle-orm";
import { db, playersTable, roomsTable } from "@workspace/db";
import type { GameStateData } from "./gameEngine";
import {
  RECURRENCE_SCENARIO_ID,
  TRACE_SCENARIO_ID,
  TRIANGULATION_SCENARIO_ID,
} from "@workspace/game-types";
import {
  finalizeAccountProgressForRoom,
  finalizeClearanceWithdrawal,
} from "./accountProgress";
import { recordGameResult } from "./rematchManager";
import {
  completeChroniclePrimaryOutcome,
  completeChronicleRehearsal,
} from "./campaignChronicles";
import { TRACE_CHRONICLE_DEFINITION } from "./traceChronicle";
import { RECURRENCE_CHRONICLE_DEFINITION } from "./recurrenceChronicle";
import { TRIANGULATION_CHRONICLE_DEFINITION } from "./triangulationChronicle";
import { buildTriangulationHistoricalRecords } from "./triangulationChronicleRecords";

const sessionRecordedMatches = new Set<string>();
const CLEARANCE_SCENARIO_ID = "blueprint_clearance_lumii";

/** Complete every durable and in-memory result write for a finished game. */
export async function completeFinishedGame(
  roomId: string,
  state: GameStateData,
  finishedAt = new Date(),
): Promise<void> {
  if (state.phase !== "finished") return;

  await db
    .update(roomsTable)
    .set({ status: "finished", updatedAt: finishedAt })
    .where(eq(roomsTable.id, roomId));

  if (state.finishReason === "withdrawal") {
    await finalizeClearanceWithdrawal(roomId);
    return;
  }

  const [room] = await db
    .select({ scenarioId: roomsTable.scenarioId })
    .from(roomsTable)
    .where(eq(roomsTable.id, roomId))
    .limit(1);

  const matchInstanceId = `${roomId}:${state.startedAt ?? "legacy"}`;
  if (
    room?.scenarioId !== CLEARANCE_SCENARIO_ID &&
    room?.scenarioId !== TRACE_SCENARIO_ID &&
    room?.scenarioId !== RECURRENCE_SCENARIO_ID &&
    room?.scenarioId !== TRIANGULATION_SCENARIO_ID &&
    !sessionRecordedMatches.has(matchInstanceId)
  ) {
    sessionRecordedMatches.add(matchInstanceId);
    recordGameResult(
      roomId,
      state.players.map((player) => ({ id: player.playerId, name: player.playerName })),
      state.winnerId,
    );
  }

  const trace = room?.scenarioId === TRACE_SCENARIO_ID ? state.traceScenario : undefined;
  const recurrence = room?.scenarioId === RECURRENCE_SCENARIO_ID
    ? state.recurrenceScenario
    : undefined;
  const triangulation = room?.scenarioId === TRIANGULATION_SCENARIO_ID
    ? state.triangulationScenario
    : undefined;
  await finalizeAccountProgressForRoom(roomId, state, finishedAt, {
    recordPolicy: trace?.runKind === "rehearsal" || recurrence?.runKind === "rehearsal" ||
      triangulation?.runKind === "rehearsal"
      ? "rehearsal"
      : "normal",
  });

  if (trace?.phase === "finished" && trace.outcomeId) {
    const [architect] = await db
      .select({ accountId: playersTable.accountId })
      .from(playersTable)
      .where(eq(playersTable.id, trace.architectPlayerId))
      .limit(1);
    if (architect?.accountId) {
      const completion = {
        accountId: architect.accountId,
        roomId,
        matchInstanceId,
        definition: TRACE_CHRONICLE_DEFINITION,
        outcomeId: trace.outcomeId,
        preparednessObjectiveMet: trace.preparednessObjectiveMet,
        completedAt: finishedAt,
      };
      if (trace.runKind === "rehearsal") {
        await completeChronicleRehearsal({
          ...completion,
          entitlements: [],
          lumiiMemories: [{
            key: "trace.rehearsal_observed",
            valence: 0,
            detail: `${trace.guidanceMethod}:${trace.outcomeId}`,
            visibility: "sealed",
          }],
        });
      } else {
        await completeChroniclePrimaryOutcome(completion);
      }
    }
  }

  if (recurrence?.phase === "finished" && recurrence.outcomeId) {
    const [architect] = await db
      .select({ accountId: playersTable.accountId })
      .from(playersTable)
      .where(eq(playersTable.id, recurrence.architectPlayerId))
      .limit(1);
    if (architect?.accountId) {
      const completion = {
        accountId: architect.accountId,
        roomId,
        matchInstanceId,
        definition: RECURRENCE_CHRONICLE_DEFINITION,
        outcomeId: recurrence.outcomeId,
        preparednessObjectiveMet: recurrence.preparednessObjectiveMet,
        completedAt: finishedAt,
      };
      if (recurrence.runKind === "rehearsal") {
        await completeChronicleRehearsal({
          ...completion,
          entitlements: [],
          lumiiMemories: [{
            key: "recurrence.rehearsal_observed",
            valence: 0,
            detail: `${recurrence.custodyMethod}:${recurrence.outcomeId}`,
            visibility: "sealed",
          }],
        });
      } else {
        await completeChroniclePrimaryOutcome(completion);
      }
    }
  }

  if (triangulation?.phase === "finished" && triangulation.outcomeId) {
    const [architect] = await db
      .select({ accountId: playersTable.accountId })
      .from(playersTable)
      .where(eq(playersTable.id, triangulation.architectPlayerId))
      .limit(1);
    if (architect?.accountId) {
      const completion = {
        accountId: architect.accountId,
        roomId,
        matchInstanceId,
        definition: TRIANGULATION_CHRONICLE_DEFINITION,
        outcomeId: triangulation.outcomeId,
        preparednessObjectiveMet: triangulation.preparednessMet,
        completedAt: finishedAt,
      };
      if (triangulation.runKind === "rehearsal") {
        await completeChronicleRehearsal({
          ...completion,
          entitlements: [],
          lumiiMemories: [{
            key: "triangulation.rehearsal_observed",
            valence: 0,
            detail: `${triangulation.coordinationArchitecture}:${triangulation.referenceCivilization}:${triangulation.outcomeId}`,
            visibility: "sealed",
          }],
        });
      } else {
        await completeChroniclePrimaryOutcome({
          ...completion,
          historicalRecords: buildTriangulationHistoricalRecords(
            state,
            architect.accountId,
            roomId,
            finishedAt,
          ),
        });
      }
    }
  }
}
