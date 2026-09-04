// Per-room turn-expiration timer. When a turn exceeds the room's configured
// timeout, automatically submit a "pass" action so play continues.

import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  applyAction,
  formatGameState,
  normalizeState,
  parseAiDifficulty,
  type GameStateData,
} from "./gameEngine";
import { getConnectedPlayerIds, sendToPlayer, filterStateForPlayer } from "./websocket";
import { withRoomLock } from "./roomLock";
import { logger } from "./logger";
import { completeFinishedGame } from "./finishedGame";
import { updateTurnDeadline } from "./turnDeadline";

export { updateTurnDeadline } from "./turnDeadline";

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

      const state = normalizeState(gs.state);
      // Bail if state moved on (someone already acted)
      if (state.version !== expectedVersion) return;
      if (state.phase === "finished") return;

      // Do not auto-pass while any stage of the authoritative Luminary
      // resolution pipeline is active.
      if (
        !!state.pendingTurnTransition ||
        (state.pendingSummonEvents?.length ?? 0) > 0 ||
        (state.pendingLuminaryActivationEvents?.length ?? 0) > 0 ||
        (state.pendingBlueprintManifestationEvents?.length ?? 0) > 0 ||
        (state.pendingBlueprintDetonationEvents?.length ?? 0) > 0
      ) {
        return;
      }

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
      const updated = await db
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
        )
        .returning({ roomId: gameStatesTable.roomId });
      if (updated.length === 0) return;
      if (isFinished) await completeFinishedGame(roomId, state);

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
        allPlayers.map((p) => [p.id, { isAi: p.isAi, aiDifficulty: p.aiDifficulty != null ? parseAiDifficulty(p.aiDifficulty) : null }]),
      );
      const formatted = formatGameState(
        roomId,
        isFinished ? "finished" : "playing",
        state,
        connectedIds,
        avatarMap,
        aiMap,
        room.scenarioId,
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
