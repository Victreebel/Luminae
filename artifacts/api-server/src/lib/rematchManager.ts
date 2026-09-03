// ── rematchManager ────────────────────────────────────────────────────────────
// Manages per-room rematch invitations, explicit responses, and cumulative session
// statistics (win / loss / tie records across successive rematches).
//
// All state is in-memory — it intentionally resets on server restart, which is
// acceptable because a "session" is defined as a continuous play streak within
// a single server session.
// ─────────────────────────────────────────────────────────────────────────────

import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  initializeGame,
  formatGameState,
  getReplayBoardSnapshot,
  normalizeState,
  parseAiDifficulty,
  type InitialBoardSnapshot,
} from "./gameEngine";
import {
  broadcastToRoom,
  getConnectedPlayerIds,
  sendToPlayer,
  filterStateForPlayer,
} from "./websocket";
import { armTurnTimer, updateTurnDeadline } from "./turnTimer";
import { runAiTurnsIfNeeded } from "./aiTurnRunner";
import { logger } from "./logger";
import { getRematchReadiness } from "./rematchFlow";
import {
  BlueprintRoomAccessError,
  resolveBlueprintSetupsForMatch,
} from "./blueprintLoadouts";
import { resolveLuminaryArrivalSoundsForPlayers } from "./accountCosmetics";

// ── Constants ─────────────────────────────────────────────────────────────────
const START_DELAY_MS = 250;

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlayerSessionRecord {
  wins: number;
  losses: number;
  ties: number;
  playerName: string;
}

interface RematchState {
  voterIds: Set<string>;
  declinedIds: Set<string>;
  sameBoard: boolean;
  initiatorId: string | null;
  startTimer: NodeJS.Timeout | null;
}

// ── In-memory stores ──────────────────────────────────────────────────────────
// roomId → { playerId → record }
const _stats = new Map<string, Map<string, PlayerSessionRecord>>();
// roomId → RematchState
const _votes = new Map<string, RematchState>();

// ── Session stats ─────────────────────────────────────────────────────────────

export function getSessionStats(
  roomId: string,
): Record<string, PlayerSessionRecord> {
  const map = _stats.get(roomId);
  if (!map) return {};
  const out: Record<string, PlayerSessionRecord> = {};
  for (const [id, rec] of map) out[id] = { ...rec };
  return out;
}

/** Called by game.ts / turnTimer.ts whenever a game phase reaches "finished". */
export function recordGameResult(
  roomId: string,
  players: ReadonlyArray<{ id: string; name: string }>,
  winnerId: string | null,
): void {
  if (!_stats.has(roomId)) _stats.set(roomId, new Map());
  const map = _stats.get(roomId)!;
  for (const p of players) {
    const r = map.get(p.id) ?? { wins: 0, losses: 0, ties: 0, playerName: p.name };
    if (winnerId === null) {
      map.set(p.id, { ...r, ties: r.ties + 1, playerName: p.name });
    } else if (p.id === winnerId) {
      map.set(p.id, { ...r, wins: r.wins + 1, playerName: p.name });
    } else {
      map.set(p.id, { ...r, losses: r.losses + 1, playerName: p.name });
    }
  }
}

// ── Rematch voting ────────────────────────────────────────────────────────────

export function clearRematch(roomId: string): void {
  const s = _votes.get(roomId);
  if (s?.startTimer) clearTimeout(s.startTimer);
  _votes.delete(roomId);
}

export interface RematchVoteInfo {
  active: boolean;
  voterIds: string[];
  declinedIds: string[];
  sameBoard: boolean;
  initiatorId: string | null;
  starting: boolean;
  sessionStats: Record<string, PlayerSessionRecord>;
}

export type RematchResponseAction = "join" | "decline" | "withdraw";

interface RematchVoteOptions {
  action?: RematchResponseAction;
  sameBoard?: boolean;
}

/**
 * Records one player's explicit rematch response.
 *
 * Rules:
 *  - The first human join creates an invitation and chooses the board mode.
 *  - AI players are auto-confirmed once an invitation exists.
 *  - There is no response timer. Human players must join or explicitly decline.
 *  - The rematch starts as soon as every human has responded and at least two
 *    total players remain.
 */
export async function castVote(
  roomId: string,
  playerId: string,
  allRoomPlayers: ReadonlyArray<{ id: string; name: string; isAi: boolean }>,
  options: RematchVoteOptions = {},
): Promise<RematchVoteInfo> {
  if (!_votes.has(roomId)) {
    _votes.set(roomId, {
      voterIds: new Set(),
      declinedIds: new Set(),
      sameBoard: false,
      initiatorId: null,
      startTimer: null,
    });
  }
  const state = _votes.get(roomId)!;
  const action = options.action ?? "join";

  if (action === "join") {
    if (state.initiatorId === null) {
      state.initiatorId = playerId;
      state.sameBoard = options.sameBoard === true;
    }
    state.declinedIds.delete(playerId);
    state.voterIds.add(playerId);

    for (const player of allRoomPlayers) {
      if (player.isAi) state.voterIds.add(player.id);
    }
  } else {
    state.voterIds.delete(playerId);
    if (action === "decline") {
      state.declinedIds.add(playerId);
    } else {
      state.declinedIds.delete(playerId);
    }

    if (state.initiatorId === playerId) {
      state.initiatorId =
        allRoomPlayers.find(
          (player) => !player.isAi && state.voterIds.has(player.id),
        )?.id ?? null;
    }

    if (state.initiatorId === null) {
      state.sameBoard = false;
      for (const player of allRoomPlayers) {
        if (player.isAi) state.voterIds.delete(player.id);
      }
    }
  }

  const readiness = getRematchReadiness(
    {
      joinedIds: state.voterIds,
      declinedIds: state.declinedIds,
    },
    allRoomPlayers,
  );

  if (!readiness.shouldStart && state.startTimer) {
    clearTimeout(state.startTimer);
    state.startTimer = null;
  } else if (readiness.shouldStart && !state.startTimer) {
    state.startTimer = setTimeout(
      () => void _executeRematch(roomId),
      START_DELAY_MS,
    );
  }

  return getRematchInfo(roomId);
}

export function getRematchInfo(roomId: string): RematchVoteInfo {
  const state = _votes.get(roomId);
  return {
    active: state?.initiatorId !== null && state?.initiatorId !== undefined,
    voterIds: state ? Array.from(state.voterIds) : [],
    declinedIds: state ? Array.from(state.declinedIds) : [],
    sameBoard: state?.sameBoard ?? false,
    initiatorId: state?.initiatorId ?? null,
    starting: state?.startTimer !== null && state?.startTimer !== undefined,
    sessionStats: getSessionStats(roomId),
  };
}

async function loadReplayBoardSnapshot(roomId: string): Promise<InitialBoardSnapshot | null> {
  const [savedState] = await db
    .select()
    .from(gameStatesTable)
    .where(eq(gameStatesTable.roomId, roomId))
    .limit(1);

  if (!savedState?.state) return null;
  const state = normalizeState(savedState.state);
  if (!state.initialBoard) return null;
  return getReplayBoardSnapshot(state);
}

// ── Internal: execute rematch after all humans respond ────────────────────────

async function _executeRematch(roomId: string): Promise<void> {
  const state = _votes.get(roomId);
  if (!state) return;
  const voterIds = new Set(state.voterIds);
  _votes.delete(roomId); // clear before any async work

  logger.info({ roomId, voterCount: voterIds.size }, "Executing rematch");

  try {
    const [room] = await db
      .select()
      .from(roomsTable)
      .where(eq(roomsTable.id, roomId))
      .limit(1);

    if (!room || room.status !== "finished") {
      broadcastToRoom(roomId, { type: "rematch_cancelled" });
      return;
    }

    const allPlayers = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.roomId, roomId))
      .orderBy(playersTable.orderIndex);

    // Partition players: confirmed (voted or AI) vs declined (human, did not vote)
    const confirmed = allPlayers.filter((p) => p.isAi || voterIds.has(p.id));
    const declined = allPlayers.filter((p) => !p.isAi && !voterIds.has(p.id));

    if (confirmed.length < 2) {
      broadcastToRoom(roomId, { type: "rematch_cancelled" });
      return;
    }

    const sessionStatsData = getSessionStats(roomId);
    const replayBoard = state.sameBoard
      ? await loadReplayBoardSnapshot(roomId)
      : null;

    // Notify declined players before removing them
    for (const p of declined) {
      sendToPlayer(roomId, p.id, {
        type: "rematch_declined",
        sessionStats: sessionStatsData,
      });
      await db.delete(playersTable).where(eq(playersTable.id, p.id));
    }

    // Re-index remaining players so orderIndex is contiguous
    for (let i = 0; i < confirmed.length; i++) {
      await db
        .update(playersTable)
        .set({ orderIndex: i })
        .where(eq(playersTable.id, confirmed[i].id));
    }

    // Ensure a host exists among confirmed players
    const hasHost = confirmed.some((p) => p.isHost);
    if (!hasHost) {
      const newHost = confirmed.find((p) => !p.isAi) ?? confirmed[0];
      await db
        .update(playersTable)
        .set({ isHost: true })
        .where(eq(playersTable.id, newHost.id));
      await db
        .update(roomsTable)
        .set({ hostPlayerId: newHost.id })
        .where(eq(roomsTable.id, roomId));
    }

    let blueprintSetups;
    try {
      blueprintSetups = await resolveBlueprintSetupsForMatch(room, confirmed);
    } catch (error) {
      if (!(error instanceof BlueprintRoomAccessError)) throw error;
      logger.warn({ roomId, error: error.message }, "Blueprint rematch access rejected");
      broadcastToRoom(roomId, {
        type: "rematch_cancelled",
        reason: error.message,
      });
      return;
    }
    const luminaryArrivalSounds = await resolveLuminaryArrivalSoundsForPlayers(confirmed);

    // Initialize a fresh game with a new immutable loadout snapshot.
    const gameData = initializeGame(
      confirmed.map((p) => ({
        id: p.id,
        name: p.name,
        luminaryArrivalSound: luminaryArrivalSounds[p.id],
      })),
      confirmed.length,
      room.victoryRequirement,
      room.cinematicMode === "epic" ? "epic" : "standard",
      { replayBoard, blueprintSetups },
    );
    gameData.turnTimerSeconds = room.turnTimerSeconds ?? null;
    updateTurnDeadline(gameData);

    await db
      .update(roomsTable)
      .set({ status: "playing", updatedAt: new Date() })
      .where(eq(roomsTable.id, roomId));

    await db
      .insert(gameStatesTable)
      .values({
        roomId,
        state: gameData as unknown as Record<string, unknown>,
        version: gameData.version,
      })
      .onConflictDoUpdate({
        target: gameStatesTable.roomId,
        set: {
          state: gameData as unknown as Record<string, unknown>,
          version: gameData.version,
          updatedAt: new Date(),
        },
      });

    const connectedIds = getConnectedPlayerIds(roomId);
    for (const p of confirmed) {
      if (p.isAi) connectedIds.add(p.id);
    }
    const avatarMap = new Map<string, string | null>(
      confirmed.map((p) => [p.id, p.avatarId ?? null]),
    );
    const aiMap = new Map(
      confirmed.map((p) => [
        p.id,
        {
          isAi: p.isAi,
          aiDifficulty: p.aiDifficulty != null ? parseAiDifficulty(p.aiDifficulty) : null,
        },
      ]),
    );

    const formatted = formatGameState(
      roomId,
      "playing",
      gameData,
      connectedIds,
      avatarMap,
      aiMap,
      room.scenarioId,
    );

    // Send each confirmed human player their personalised game state
    for (const p of confirmed) {
      if (p.isAi) continue;
      sendToPlayer(roomId, p.id, {
        type: "rematch_started",
        state: filterStateForPlayer(formatted, p.id),
        sessionStats: sessionStatsData,
        sameBoard: state.sameBoard && replayBoard !== null,
      });
    }

    armTurnTimer(roomId, gameData);
    void runAiTurnsIfNeeded(roomId);

    logger.info(
      { roomId, confirmedCount: confirmed.length },
      "Rematch started successfully",
    );
  } catch (err) {
    logger.error({ err, roomId }, "Error executing rematch");
    broadcastToRoom(roomId, { type: "rematch_cancelled" });
  }
}
