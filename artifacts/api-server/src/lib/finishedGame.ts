import { eq } from "drizzle-orm";
import { db, roomsTable } from "@workspace/db";
import type { GameStateData } from "./gameEngine";
import {
  finalizeAccountProgressForRoom,
  finalizeClearanceWithdrawal,
} from "./accountProgress";
import { recordGameResult } from "./rematchManager";
import {
  finishBalanceLabMemoryRoom,
  getBalanceLabMemoryRoom,
  isBalanceLabRoom,
} from "./balanceLabRooms";

const sessionRecordedMatches = new Set<string>();
const CLEARANCE_SCENARIO_ID = "blueprint_clearance_lumii";

/** Complete every durable and in-memory result write for a finished game. */
export async function completeFinishedGame(
  roomId: string,
  state: GameStateData,
  finishedAt = new Date(),
): Promise<void> {
  if (state.phase !== "finished") return;

  // Developer balance rooms are process-local from creation through finish.
  // Complete their lifecycle before touching any durable room table.
  if (getBalanceLabMemoryRoom(roomId)) {
    finishBalanceLabMemoryRoom(roomId, state);
    return;
  }

  await db
    .update(roomsTable)
    .set({ status: "finished", updatedAt: finishedAt })
    .where(eq(roomsTable.id, roomId));

  // Compatibility guard for any legacy process-local laboratory mapping. New
  // laboratory matches are fully in memory and have already returned above.
  if (isBalanceLabRoom(roomId)) return;

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
  if (room?.scenarioId !== CLEARANCE_SCENARIO_ID && !sessionRecordedMatches.has(matchInstanceId)) {
    sessionRecordedMatches.add(matchInstanceId);
    recordGameResult(
      roomId,
      state.players.map((player) => ({ id: player.playerId, name: player.playerName })),
      state.winnerId,
    );
  }

  await finalizeAccountProgressForRoom(roomId, state, finishedAt);
}
