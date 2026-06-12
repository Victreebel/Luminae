import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  applyAction,
  formatGameState,
  normalizeState,
  parseAiDifficulty,
  CRYSTAL_COLORS,
  LUMINARY_MAP,
} from "./gameEngine";
import { chooseAiAction } from "./aiPlayer";
import { getConnectedPlayerIds, sendToPlayer, filterStateForPlayer } from "./websocket";
import { logger } from "./logger";
import { withRoomLock, tryClaimAiRunner, releaseAiRunner } from "./roomLock";
import { armTurnTimer, updateTurnDeadline } from "./turnTimer";

const AI_TURN_DELAY_MS = 950;
const AI_TURN_DELAY_CARD_ANIM_MS = 2400;

// Easy AI feels human-paced: 5–9 s for regular moves, 7–11 s for card actions
// (card anim needs ~2.4 s to complete, so the easy floor already covers it)
const easyDelay = (isCardAction: boolean): number =>
  isCardAction
    ? 7000 + Math.random() * 4000
    : 5000 + Math.random() * 4000;

// On server startup, resume AI turns for any rooms where the game is in
// progress and the current player is an AI (e.g. the server restarted mid-turn).
export async function recoverStuckAiRooms(): Promise<void> {
  try {
    const playingRooms = await db
      .select({ roomId: roomsTable.id })
      .from(roomsTable)
      .where(eq(roomsTable.status, "playing"));

    if (playingRooms.length === 0) return;

    const roomIds = playingRooms.map((r) => r.roomId);
    const gameStates = await db
      .select()
      .from(gameStatesTable)
      .where(inArray(gameStatesTable.roomId, roomIds));

    for (const gs of gameStates) {
      const state = normalizeState(gs.state);
      if ((state.phase as string) === "finished") continue;
      const currentPlayerId = state.players[state.currentPlayerIndex]?.playerId;
      if (!currentPlayerId) continue;

      const [player] = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.id, currentPlayerId))
        .limit(1);

      if (player?.isAi) {
        logger.info(
          { roomId: gs.roomId, playerId: currentPlayerId },
          "Startup recovery: resuming stuck AI turn",
        );
        void runAiTurnsIfNeeded(gs.roomId);
      }
    }
  } catch (err) {
    logger.error({ err }, "Error during startup AI recovery scan");
  }
}

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

        const difficulty = parseAiDifficulty(dbPlayer.aiDifficulty ?? "medium");

        // Handle pending multi-Luminary choice: AI picks highest-eminence first,
        // falling back to eligibility-scan order for ties.
        if (
          state.pendingLuminaryChoice &&
          state.pendingLuminaryChoice.playerId === currentPlayerId
        ) {
          const candidates = [...state.pendingLuminaryChoice.candidates];
          candidates.sort((a, b) => {
            const la = LUMINARY_MAP.get(a);
            const lb = LUMINARY_MAP.get(b);
            const aVal = la ? (la.lumens ?? 0) : 0;
            const bVal = lb ? (lb.lumens ?? 0) : 0;
            return bVal - aVal;
          });
          const action = { type: "choose_luminary_order" as const, orderedIds: candidates };
          const expectedVersion = state.version;
          const result = applyAction(state, currentPlayerId, action);
          if (!result.success) {
            logger.warn(
              { roomId, playerId: currentPlayerId, error: result.error },
              "AI choose_luminary_order failed",
            );
            return { kind: "stop" as const };
          }
          updateTurnDeadline(state);
          const isFinished = (state.phase as string) === "finished";
          if (isFinished) {
            await db.update(roomsTable).set({ status: "finished", updatedAt: new Date() }).where(eq(roomsTable.id, roomId));
          }
          const updated = await db
            .update(gameStatesTable)
            .set({ state: state as unknown as Record<string, unknown>, version: state.version, updatedAt: new Date() })
            .where(
              and(eq(gameStatesTable.roomId, roomId), eq(gameStatesTable.version, expectedVersion))
            );
          if (updated.rowCount === 0) return { kind: "stop" as const };
          const connectedIds = getConnectedPlayerIds(roomId);
          for (const pid of connectedIds) {
            const filtered = filterStateForPlayer(state, pid);
            sendToPlayer(roomId, pid, { type: "state_update", state: filtered });
          }
          return { kind: "continue" as const, delay: AI_TURN_DELAY_MS };
        }

        const action = chooseAiAction(state, currentPlayerId, difficulty);

        const expectedVersion = state.version;
        const result = applyAction(state, currentPlayerId, action);
        if (!result.success) {
          logger.warn(
            { roomId, playerId: currentPlayerId, error: result.error, action },
            "AI action failed, attempting fallback",
          );
          let recovered = false;
          for (const color of CRYSTAL_COLORS) {
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
        );
        for (const p of allPlayers) {
          if (p.isAi) continue;
          sendToPlayer(roomId, p.id, {
            type: "state_update",
            state: filterStateForPlayer(formatted, p.id),
          });
        }
        armTurnTimer(roomId, state);

        if (isFinished) return { kind: "stop" as const, actionType: action.type, difficulty };
        return { kind: "continue" as const, actionType: action.type, difficulty };
      });

      if (outcome.kind === "stop") return;

      const isCardAction =
        outcome.actionType === "purchase_card" || outcome.actionType === "reserve_card";
      const betweenDelay =
        outcome.difficulty === "passive"
          ? 400
          : outcome.difficulty === "easy"
            ? easyDelay(isCardAction)
            : isCardAction
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
