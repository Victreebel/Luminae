import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  applyAction,
  formatGameState,
  normalizeState,
  parseAiDifficulty,
  NATURAL_AFFINITY_KEYS,
  LUMINARY_MAP,
} from "./gameEngine";
import { chooseAiAction } from "./aiPlayer";
import { getConnectedPlayerIds, sendToPlayer, filterStateForPlayer } from "./websocket";
import { logger } from "./logger";
import { withRoomLock, tryClaimAiRunner, releaseAiRunner } from "./roomLock";
import { armTurnTimer, updateTurnDeadline } from "./turnTimer";
import { getOpeningTurnPresentationWaitMs } from "./turnPresentationGate";
import { completeFinishedGame } from "./finishedGame";
import {
  applyBalanceLabRoomRuleset,
  getBalanceLabMemoryPlayer,
  getBalanceLabMemoryRoom,
  getBalanceLabMemoryStateSnapshot,
  saveBalanceLabMemoryState,
  type BalanceLabMemoryRoom,
} from "./balanceLabRooms";

const AI_TURN_DELAY_MS = 2200;

// AI cadence is game pacing, not a proxy for any one client's animation length.
const easyDelay = (): number => 2800 + Math.random() * 1600;

type AiTurnOutcome =
  | { kind: "stop"; actionType?: string; difficulty?: ReturnType<typeof parseAiDifficulty> }
  | { kind: "wait"; delay: number }
  | { kind: "continue"; actionType?: string; difficulty?: ReturnType<typeof parseAiDifficulty> };

async function runBalanceLabAiTurnLocked(
  roomId: string,
  room: BalanceLabMemoryRoom,
  skipPresentationDelay: boolean,
): Promise<AiTurnOutcome> {
  if (room.status !== "playing") return { kind: "stop" };
  const snapshot = getBalanceLabMemoryStateSnapshot(roomId);
  if (!snapshot) return { kind: "stop" };
  const state = normalizeState(snapshot);
  applyBalanceLabRoomRuleset(roomId, state);
  if (state.phase === "finished") return { kind: "stop" };
  if (
    !!state.pendingTurnTransition ||
    (state.pendingSummonEvents?.length ?? 0) > 0 ||
    (state.pendingLuminaryActivationEvents?.length ?? 0) > 0 ||
    (state.pendingBlueprintManifestationEvents?.length ?? 0) > 0 ||
    (state.pendingBlueprintDetonationEvents?.length ?? 0) > 0
  ) {
    return { kind: "stop" };
  }

  const currentPlayerId = state.players[state.currentPlayerIndex]?.playerId;
  if (!currentPlayerId) return { kind: "stop" };
  const currentPlayer = getBalanceLabMemoryPlayer(roomId, currentPlayerId);
  if (!currentPlayer?.isAi) return { kind: "stop" };

  const presentationDelay = getOpeningTurnPresentationWaitMs(state);
  if (!skipPresentationDelay && presentationDelay > 0) {
    return { kind: "wait", delay: presentationDelay };
  }
  const difficulty = parseAiDifficulty(currentPlayer.aiDifficulty ?? "medium");
  let action: ReturnType<typeof chooseAiAction>;
  if (
    state.pendingLuminaryChoice &&
    state.pendingLuminaryChoice.playerId === currentPlayerId
  ) {
    const candidates = [...state.pendingLuminaryChoice.candidates].sort((a, b) => {
      const left = LUMINARY_MAP.get(a)?.eminence ?? 0;
      const right = LUMINARY_MAP.get(b)?.eminence ?? 0;
      return right - left;
    });
    action = { type: "choose_luminary_order" as const, orderedIds: candidates };
  } else {
    action = chooseAiAction(state, currentPlayerId, difficulty, {
      allowEncryption: true,
      strategy: "adaptive",
    });
  }

  const expectedVersion = state.version;
  const result = applyAction(state, currentPlayerId, action);
  if (!result.success) {
    logger.warn(
      { roomId, playerId: currentPlayerId, error: result.error, action },
      "Balance-lab AI action failed, attempting fallback",
    );
    let recovered = false;
    for (const color of NATURAL_AFFINITY_KEYS) {
      if (state.affinityWell[color] <= 0) continue;
      const fallback = applyAction(state, currentPlayerId, {
        type: "harness_three_affinities",
        affinities: { [color]: 1 },
      });
      if (fallback.success) {
        recovered = true;
        break;
      }
    }
    if (!recovered) return { kind: "stop" };
  }

  updateTurnDeadline(state);
  if (!saveBalanceLabMemoryState(roomId, state, expectedVersion)) {
    return { kind: "continue", difficulty };
  }
  const isFinished = (state.phase as string) === "finished";
  if (isFinished) await completeFinishedGame(roomId, state);

  const connectedIds = getConnectedPlayerIds(roomId);
  for (const player of room.players) {
    if (player.isAi) connectedIds.add(player.id);
  }
  const avatarMap = new Map<string, string | null>(
    room.players.map((player) => [player.id, player.avatarId]),
  );
  const aiMap = new Map(
    room.players.map((player) => [player.id, {
      isAi: player.isAi,
      aiDifficulty: player.aiDifficulty,
    }]),
  );
  const formatted = formatGameState(
    roomId,
    isFinished ? "finished" : "playing",
    state,
    connectedIds,
    avatarMap,
    aiMap,
    null,
  );
  for (const player of room.players) {
    if (player.isAi) continue;
    sendToPlayer(roomId, player.id, {
      type: "state_update",
      state: filterStateForPlayer(formatted, player.id),
    });
  }
  armTurnTimer(roomId, state);
  return isFinished
    ? { kind: "stop", actionType: action.type, difficulty }
    : { kind: "continue", actionType: action.type, difficulty };
}

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
export async function runAiTurnsIfNeeded(
  roomId: string,
  options: { skipDelays?: boolean } = {},
): Promise<void> {
  if (!tryClaimAiRunner(roomId)) return;

  try {
    if (!options.skipDelays) {
      await new Promise((resolve) => setTimeout(resolve, AI_TURN_DELAY_MS));
    }

    for (let i = 0; i < 50; i++) {
      // All read-modify-write happens inside the lock so it can't interleave
      // with a concurrent human action. Returns one of:
      //   { kind: "stop" } — exit loop (game over, human turn, etc.)
      //   { kind: "continue" } — keep playing
      const outcome = await withRoomLock(roomId, async () => {
        const balanceRoom = getBalanceLabMemoryRoom(roomId);
        if (balanceRoom) {
          return runBalanceLabAiTurnLocked(
            roomId,
            balanceRoom,
            options.skipDelays === true,
          );
        }

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
        applyBalanceLabRoomRuleset(roomId, state);
        if ((state.phase as string) === "finished") return { kind: "stop" as const };

        // The engine owns one durable resolution barrier across arrivals,
        // summon effects, end effects, and start effects. The runner is
        // re-invoked after each acknowledgement and may act only once the
        // transition has fully released the incoming turn.
        if (
          !!state.pendingTurnTransition ||
          (state.pendingSummonEvents?.length ?? 0) > 0 ||
          (state.pendingLuminaryActivationEvents?.length ?? 0) > 0 ||
          (state.pendingBlueprintManifestationEvents?.length ?? 0) > 0 ||
          (state.pendingBlueprintDetonationEvents?.length ?? 0) > 0
        ) {
          return { kind: "stop" as const };
        }

        const currentPlayerIdx = state.currentPlayerIndex;
        const currentPlayerId = state.players[currentPlayerIdx]?.playerId;
        if (!currentPlayerId) return { kind: "stop" as const };

        const [dbPlayer] = await db
          .select()
          .from(playersTable)
          .where(eq(playersTable.id, currentPlayerId))
          .limit(1);
        if (!dbPlayer || !dbPlayer.isAi) return { kind: "stop" as const };

        const presentationDelay = getOpeningTurnPresentationWaitMs(state);
        if (presentationDelay > 0) {
          return { kind: "wait" as const, delay: presentationDelay };
        }

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
            const aVal = la ? (la.eminence ?? 0) : 0;
            const bVal = lb ? (lb.eminence ?? 0) : 0;
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
          const updated = await db
            .update(gameStatesTable)
            .set({ state: state as unknown as Record<string, unknown>, version: state.version, updatedAt: new Date() })
            .where(
              and(eq(gameStatesTable.roomId, roomId), eq(gameStatesTable.version, expectedVersion))
            )
            .returning({ roomId: gameStatesTable.roomId });
          if (updated.length === 0) return { kind: "stop" as const };
          if (isFinished) await completeFinishedGame(roomId, state);
          const connectedIds = getConnectedPlayerIds(roomId);
          const allPlayers = await db
            .select()
            .from(playersTable)
            .where(eq(playersTable.roomId, roomId));
          for (const player of allPlayers) {
            if (player.isAi) connectedIds.add(player.id);
          }
          const avatarMap = new Map<string, string | null>(
            allPlayers.map((player) => [player.id, player.avatarId ?? null]),
          );
          const aiMap = new Map(
            allPlayers.map((player) => [
              player.id,
              {
                isAi: player.isAi,
                aiDifficulty:
                  player.aiDifficulty != null ? parseAiDifficulty(player.aiDifficulty) : null,
              },
            ]),
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
          for (const player of allPlayers) {
            if (player.isAi) continue;
            sendToPlayer(roomId, player.id, {
              type: "state_update",
              state: filterStateForPlayer(formatted, player.id),
            });
          }
          return { kind: "continue" as const, delay: AI_TURN_DELAY_MS };
        }

        const action = chooseAiAction(state, currentPlayerId, difficulty, {
          allowEncryption: room.scenarioId !== "blueprint_clearance_lumii",
        });

        const expectedVersion = state.version;
        const result = applyAction(state, currentPlayerId, action);
        if (!result.success) {
          logger.warn(
            { roomId, playerId: currentPlayerId, error: result.error, action },
            "AI action failed, attempting fallback",
          );
          let recovered = false;
          for (const color of NATURAL_AFFINITY_KEYS) {
            if (state.affinityWell[color] > 0) {
              const fallback = applyAction(state, currentPlayerId, {
                type: "harness_three_affinities",
                affinities: { [color]: 1 },
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

        if (isFinished) return { kind: "stop" as const, actionType: action.type, difficulty };
        return { kind: "continue" as const, actionType: action.type, difficulty };
      });

      if (outcome.kind === "stop") return;
      if (outcome.kind === "wait") {
        if (!options.skipDelays) {
          await new Promise((resolve) => setTimeout(resolve, outcome.delay));
        }
        continue;
      }

      const outcomeDifficulty = "difficulty" in outcome
        ? outcome.difficulty
        : undefined;
      const betweenDelay =
        outcomeDifficulty === "passive"
          ? 400
          : outcomeDifficulty === "easy"
            ? easyDelay()
            : AI_TURN_DELAY_MS;
      if (!options.skipDelays) {
        await new Promise((resolve) => setTimeout(resolve, betweenDelay));
      }
    }
  } catch (err) {
    logger.error({ err, roomId }, "Error in AI turn runner");
  } finally {
    releaseAiRunner(roomId);
  }
}
