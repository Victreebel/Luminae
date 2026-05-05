import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  applyAction,
  formatGameState,
  normalizeState,
  type GameStateData,
} from "./gameEngine";
import { chooseAiAction, type AiDifficulty } from "./aiPlayer";
import { broadcastToRoom, getConnectedPlayerIds } from "./websocket";
import { logger } from "./logger";
import { withRoomLock, tryClaimAiRunner, releaseAiRunner } from "./roomLock";
import { armTurnTimer, updateTurnDeadline } from "./turnTimer";

const AI_TURN_DELAY_MS = 1800;
const AI_TURN_DELAY_CARD_ANIM_MS = 4500;

// Run consecutive AI turns until the active player is human or the game ends.
// Fire-and-forget: runs in the background. At most one runner per room is
// active at any time (guarded by tryClaimAiRunner).
export async function runAiTurnsIfNeeded(roomId: string): Promise<void> {
  if (!tryClaimAiRunner(roomId)) return;

  try {
    // Read last action to decide delay — card animations need more time
    const initialDelay = await withRoomLock(roomId, async () => {
      const [gs] = await db
        .select()
        .from(gameStatesTable)
        .where(eq(gameStatesTable.roomId, roomId))
        .limit(1);
      if (!gs) return AI_TURN_DELAY_MS;
      const s = normalizeState(gs.state);
      const lastType = (s.lastAction as Record<string, unknown> | null)?.type;
      if (lastType === "purchase_card" || lastType === "reserve_card") {
        return AI_TURN_DELAY_CARD_ANIM_MS;
      }
      return AI_TURN_DELAY_MS;
    });
    await new Promise((resolve) => setTimeout(resolve, initialDelay));

    for (let i = 0; i < 50; i++) {
      // All read-modify-write happens inside the lock so it can't interleave
      // with a concurrent human action. Returns one of:
      //   { kind: "stop" } — exit loop (game over, human turn, etc.)
      //   { kind: "continue" } — keep playing
      const outcome = await withRoomLock(roomId, async () => {
        const [room] = await db
          .select()
          .from(roomsTable)
          .where(eq(roomsTable.id, roomId))
          .limit(1);
        if (!room || room.status !== "playing") return { kind: "stop" as const };

        const [gs] = await db
          .select()
          .from(gameStatesTable)
          .where(eq(gameStatesTable.roomId, roomId))
          .limit(1);
        if (!gs) return { kind: "stop" as const };

        const state = normalizeState(gs.state);
        if ((state.phase as string) === "finished") return { kind: "stop" as const };

        const currentPlayerIdx = state.currentPlayerIndex;
        const currentPlayerId = state.players[currentPlayerIdx]?.playerId;
        if (!currentPlayerId) return { kind: "stop" as const };

        const [dbPlayer] = await db
          .select()
          .from(playersTable)
          .where(eq(playersTable.id, currentPlayerId))
          .limit(1);
        if (!dbPlayer || !dbPlayer.isAi) return { kind: "stop" as const };

        const difficulty = (dbPlayer.aiDifficulty ?? "medium") as AiDifficulty;
        const action = chooseAiAction(state, currentPlayerId, difficulty);

        const expectedVersion = state.version;
        const result = applyAction(state, currentPlayerId, action);
        if (!result.success) {
          logger.warn(
            { roomId, playerId: currentPlayerId, error: result.error, action },
            "AI action failed, attempting fallback",
          );
          let recovered = false;
          for (const color of ["ruby", "sapphire", "emerald", "onyx", "pearl"] as const) {
            if (state.crystalBank[color] > 0) {
              const fallback = applyAction(state, currentPlayerId, {
                type: "take_three_crystals",
                crystals: { [color]: 1 },
              });
              if (fallback.success) {
                recovered = true;
                break;
              }
            }
          }
          if (!recovered) {
            logger.error(
              { roomId, playerId: currentPlayerId },
              "AI completely stuck, ending loop",
            );
            return { kind: "stop" as const };
          }
        }

        // Refresh per-turn deadline
        updateTurnDeadline(state);

        const isFinished = (state.phase as string) === "finished";
        if (isFinished) {
          await db
            .update(roomsTable)
            .set({ status: "finished", updatedAt: new Date() })
            .where(eq(roomsTable.id, roomId));
        }

        // Optimistic concurrency: only persist if the version we read is still
        // the current one. With the room lock this should always succeed, but
        // it's a safety net.
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
          .returning({ id: gameStatesTable.roomId });

        if (updated.length === 0) {
          logger.warn(
            { roomId, expectedVersion },
            "AI write lost optimistic concurrency check; reloading",
          );
          return { kind: "continue" as const };
        }

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

        const formatted = formatGameState(
          roomId,
          isFinished ? "finished" : "playing",
          state,
          connectedIds,
          avatarMap,
        );
        broadcastToRoom(roomId, { type: "state_update", state: formatted });
        armTurnTimer(roomId, state);

        if (isFinished) return { kind: "stop" as const, actionType: action.type };
        return { kind: "continue" as const, actionType: action.type };
      });

      if (outcome.kind === "stop") return;

      const betweenDelay =
        outcome.actionType === "purchase_card" || outcome.actionType === "reserve_card"
          ? AI_TURN_DELAY_CARD_ANIM_MS
          : AI_TURN_DELAY_MS;
      await new Promise((resolve) => setTimeout(resolve, betweenDelay));
    }
  } catch (err) {
    logger.error({ err, roomId }, "Error in AI turn runner");
  } finally {
    releaseAiRunner(roomId);
  }
}
