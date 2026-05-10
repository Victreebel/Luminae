// Per-room turn-expiration timer. When a turn exceeds the room's configured
// timeout, automatically submit a "pass" action so play continues.

import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  applyAction,
  formatGameState,
  type AiDifficulty,
  type GameStateData,
} from "./gameEngine";
import { getConnectedPlayerIds, sendToPlayer, filterStateForPlayer } from "./websocket";
import { withRoomLock } from "./roomLock";
import { logger } from "./logger";
import { recordGameResult } from "./rematchManager";

const timers = new Map<string, NodeJS.Timeout>();

export function clearTurnTimer(roomId: string): void {
  const t = timers.get(roomId);
  if (t) {
    clearTimeout(t);
    timers.delete(roomId);
  }
}

/**
 * Arms a per-room turn-expiry timer based on `state.turnDeadline`. If no
 * deadline is set, simply clears any pending timer. Safe to call after every
 * state transition.
 */
export function armTurnTimer(roomId: string, state: GameStateData): void {
  clearTurnTimer(roomId);
  if (!state.turnDeadline || state.phase === "finished") return;

  const delay = Math.max(0, state.turnDeadline - Date.now());
  const expectedVersion = state.version;

  const handle = setTimeout(() => {
    timers.delete(roomId);
    void expireTurn(roomId, expectedVersion);
  }, delay);
  timers.set(roomId, handle);
}

async function expireTurn(roomId: string, expectedVersion: number): Promise<void> {
  try {
    await withRoomLock(roomId, async () => {
      const [room] = await db
        .select()
        .from(roomsTable)
        .where(eq(roomsTable.id, roomId))
        .limit(1);
      if (!room || room.status !== "playing") return;

      const [gs] = await db
        .select()
        .from(gameStatesTable)
        .where(eq(gameStatesTable.roomId, roomId))
        .limit(1);
      if (!gs) return;

      const state = gs.state as unknown as GameStateData;
      // Bail if state moved on (someone already acted)
      if (state.version !== expectedVersion) return;
      if (state.phase === "finished") return;

      const currentPlayerId = state.players[state.currentPlayerIndex]?.playerId;
      if (!currentPlayerId) return;

      const result = applyAction(state, currentPlayerId, { type: "pass" });
      if (!result.success) {
        logger.warn({ roomId, error: result.error }, "Auto-pass failed");
        return;
      }

      // After applying, refresh the next deadline
      updateTurnDeadline(state);

      const isFinished = (state.phase as string) === "finished";
      if (isFinished) {
        await db
          .update(roomsTable)
          .set({ status: "finished", updatedAt: new Date() })
          .where(eq(roomsTable.id, roomId));
        recordGameResult(
          roomId,
          state.players.map((p: { playerId: string; playerName: string }) => ({ id: p.playerId, name: p.playerName })),
          (state as { winnerId?: string | null }).winnerId ?? null,
        );
      }

      await db
        .update(gameStatesTable)
        .set({
          state: state as unknown as Record<string, unknown>,
          version: state.version,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(gameStatesTable.roomId, roomId),
            eq(gameStatesTable.version, expectedVersion),
          ),
        );

      const connectedIds = getConnectedPlayerIds(roomId);
      const allPlayers = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.roomId, roomId));
      for (const p of allPlayers) {
        if (p.isAi) connectedIds.add(p.id);
      }
      const avatarMap = new Map<string, string | null>(
        allPlayers.map((p) => [p.id, p.avatarId ?? null]),
      );
      const aiMap = new Map(
        allPlayers.map((p) => [p.id, { isAi: p.isAi, aiDifficulty: (p.aiDifficulty as AiDifficulty | null) ?? null }]),
      );
      const formatted = formatGameState(
        roomId,
        isFinished ? "finished" : "playing",
        state,
        connectedIds,
        avatarMap,
        aiMap,
      );
      for (const p of allPlayers) {
        if (p.isAi) continue;
        sendToPlayer(roomId, p.id, {
          type: "state_update",
          state: filterStateForPlayer(formatted, p.id),
        });
      }

      armTurnTimer(roomId, state);
    });
  } catch (err) {
    logger.error({ err, roomId }, "Error in turn-expiry handler");
  }
}

/**
 * Mutates state.turnDeadline based on the room's configured timer. Call
 * AFTER applyAction succeeds to set the deadline for the *next* player's turn.
 */
export function updateTurnDeadline(state: GameStateData): void {
  if (state.phase === "finished") {
    state.turnDeadline = null;
    return;
  }
  if (state.turnTimerSeconds && state.turnTimerSeconds > 0) {
    state.turnDeadline = Date.now() + state.turnTimerSeconds * 1000;
  } else {
    state.turnDeadline = null;
  }
}
