import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import {
  CreateRoomBody,
  JoinRoomBody,
  RejoinRoomBody,
  StartGameBody,
  KickPlayerBody,
  AddAiPlayerBody,
} from "@workspace/api-zod";
import { randomBytes } from "crypto";
import {
  initializeGame,
  formatGameState,
  normalizeState,
  type AiDifficulty,
  type GameStateData,
} from "../lib/gameEngine";
import { broadcastToRoom, getConnectedPlayerIds, sendToPlayer, filterStateForPlayer } from "../lib/websocket";
import { runAiTurnsIfNeeded } from "../lib/aiTurnRunner";
import { armTurnTimer, updateTurnDeadline, clearTurnTimer } from "../lib/turnTimer";

const router: IRouter = Router();

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

type DbPlayer = typeof playersTable.$inferSelect;

function serializePlayer(p: DbPlayer) {
  return {
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    isConnected: p.isAi ? true : p.isConnected,
    orderIndex: p.orderIndex,
    isAi: p.isAi,
    aiDifficulty: p.aiDifficulty,
    avatarId: p.avatarId ?? null,
  };
}

const AI_NAME_POOL = [
  "Lyra",
  "Orion",
  "Vesper",
  "Caelum",
  "Nyx",
  "Aurin",
  "Soren",
  "Thalia",
];

const AI_AVATAR_POOL = [
  "stargazer",
  "forgemaster",
  "voidcaller",
  "archivist",
  "cultivator",
  "sentinel",
  "oracle",
  "sovereign",
];

function pickAiName(existing: string[]): string {
  const taken = new Set(existing);
  const free = AI_NAME_POOL.filter((n) => !taken.has(n));
  if (free.length > 0) return free[Math.floor(Math.random() * free.length)];
  return `AI-${Math.floor(Math.random() * 10000)}`;
}

function pickAiAvatar(existing: string[]): string {
  const taken = new Set(existing);
  const free = AI_AVATAR_POOL.filter((id) => !taken.has(id));
  if (free.length > 0) return free[Math.floor(Math.random() * free.length)];
  return AI_AVATAR_POOL[Math.floor(Math.random() * AI_AVATAR_POOL.length)];
}

// POST /api/rooms — create room
router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { hostName, maxPlayers, turnTimerSeconds, avatarId: hostAvatarId } = parsed.data;

  const inviteCode = generateInviteCode();
  const sessionToken = generateSessionToken();

  const [room] = await db
    .insert(roomsTable)
    .values({
      inviteCode,
      maxPlayers,
      status: "lobby",
      turnTimerSeconds: turnTimerSeconds ?? null,
    })
    .returning();

  const [player] = await db
    .insert(playersTable)
    .values({
      roomId: room.id,
      name: hostName,
      sessionToken,
      isHost: true,
      orderIndex: 0,
      isConnected: false,
      isAi: false,
      avatarId: hostAvatarId ?? null,
    })
    .returning();

  await db
    .update(roomsTable)
    .set({ hostPlayerId: player.id })
    .where(eq(roomsTable.id, room.id));

  req.log.info({ roomId: room.id, inviteCode }, "Room created");

  const serialized = serializePlayer(player);

  res.status(201).json({
    room: {
      id: room.id,
      inviteCode: room.inviteCode,
      status: room.status,
      maxPlayers: room.maxPlayers,
      turnTimerSeconds: room.turnTimerSeconds,
      players: [serialized],
    },
    player: serialized,
    sessionToken,
  });
});

// GET /api/rooms/:inviteCode
router.get("/rooms/:inviteCode", async (req, res): Promise<void> => {
  const rawCode = Array.isArray(req.params.inviteCode)
    ? req.params.inviteCode[0]
    : req.params.inviteCode;

  // Accept either an invite code OR a room UUID so the lobby can look up the
  // room even if the client only has the roomId from the URL (e.g. a stale
  // session that predates persisting the invite code).
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      rawCode,
    );

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(
      isUuid
        ? eq(roomsTable.id, rawCode)
        : eq(roomsTable.inviteCode, rawCode.toUpperCase()),
    )
    .limit(1);

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, room.id))
    .orderBy(playersTable.orderIndex);

  res.json({
    id: room.id,
    inviteCode: room.inviteCode,
    status: room.status,
    maxPlayers: room.maxPlayers,
    turnTimerSeconds: room.turnTimerSeconds,
    players: players.map(serializePlayer),
  });
});

// POST /api/rooms/:roomId/join
router.post("/rooms/:roomId/join", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = JoinRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { playerName, avatarId: joiningAvatarId } = parsed.data;

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, rawId))
    .limit(1);

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.status !== "lobby") {
    res.status(400).json({ error: "Game already started" });
    return;
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, room.id));

  if (players.length >= room.maxPlayers) {
    res.status(400).json({ error: "Room is full" });
    return;
  }

  const sessionToken = generateSessionToken();
  const orderIndex = players.length;

  const [player] = await db
    .insert(playersTable)
    .values({
      roomId: room.id,
      name: playerName,
      sessionToken,
      isHost: false,
      orderIndex,
      isConnected: false,
      isAi: false,
      avatarId: joiningAvatarId ?? null,
    })
    .returning();

  const serialized = serializePlayer(player);

  broadcastToRoom(room.id, {
    type: "player_joined",
    player: serialized,
  });

  const allPlayers = [...players, player];

  res.json({
    room: {
      id: room.id,
      inviteCode: room.inviteCode,
      status: room.status,
      maxPlayers: room.maxPlayers,
      turnTimerSeconds: room.turnTimerSeconds,
      players: allPlayers.map(serializePlayer),
    },
    player: serialized,
    sessionToken,
  });
});

// POST /api/rooms/:roomId/rejoin — reclaim an existing player slot by name.
// Works for any room status (lobby OR playing), so a player who lost their
// session token can get back into a game in progress. Returns a fresh token.
router.post("/rooms/:roomId/rejoin", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = RejoinRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { playerName } = parsed.data;

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, rawId))
    .limit(1);

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, room.id))
    .orderBy(playersTable.orderIndex);

  // Match by case-insensitive name; never let someone reclaim an AI seat.
  const target = players.find(
    (p) => !p.isAi && p.name.toLowerCase() === playerName.trim().toLowerCase(),
  );
  if (!target) {
    res
      .status(404)
      .json({ error: "No player with that name in this room" });
    return;
  }

  // Issue a new session token (invalidates the old one if it still existed).
  const newToken = generateSessionToken();
  const [updated] = await db
    .update(playersTable)
    .set({ sessionToken: newToken, isConnected: false })
    .where(eq(playersTable.id, target.id))
    .returning();

  const refreshed = players.map((p) => (p.id === updated.id ? updated : p));

  res.json({
    room: {
      id: room.id,
      inviteCode: room.inviteCode,
      status: room.status,
      maxPlayers: room.maxPlayers,
      turnTimerSeconds: room.turnTimerSeconds,
      players: refreshed.map(serializePlayer),
    },
    player: serializePlayer(updated),
    sessionToken: newToken,
  });
});

// POST /api/rooms/:roomId/ai-players — host adds an AI player
router.post("/rooms/:roomId/ai-players", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = AddAiPlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sessionToken, difficulty } = parsed.data;

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, rawId))
    .limit(1);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.status !== "lobby") {
    res.status(400).json({ error: "Game already started" });
    return;
  }

  const [host] = await db
    .select()
    .from(playersTable)
    .where(
      and(
        eq(playersTable.sessionToken, sessionToken),
        eq(playersTable.roomId, rawId),
      ),
    )
    .limit(1);
  if (!host || !host.isHost) {
    res.status(403).json({ error: "Only the host can add AI players" });
    return;
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, room.id));

  if (players.length >= room.maxPlayers) {
    res.status(400).json({ error: "Room is full" });
    return;
  }

  const aiName = pickAiName(players.map((p) => p.name));
  const aiAvatarId = pickAiAvatar(players.map((p) => p.avatarId).filter((v): v is string => !!v));
  const orderIndex = players.length;
  const aiSessionToken = `ai-${randomBytes(16).toString("hex")}`;

  const [aiPlayer] = await db
    .insert(playersTable)
    .values({
      roomId: room.id,
      name: aiName,
      sessionToken: aiSessionToken,
      isHost: false,
      orderIndex,
      isConnected: true,
      isAi: true,
      avatarId: aiAvatarId,
      aiDifficulty: difficulty,
    })
    .returning();

  const serialized = serializePlayer(aiPlayer);

  broadcastToRoom(room.id, {
    type: "player_joined",
    player: serialized,
  });

  res.json(serialized);
});

// POST /api/rooms/:roomId/start
router.post("/rooms/:roomId/start", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = StartGameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, rawId))
    .limit(1);

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const [host] = await db
    .select()
    .from(playersTable)
    .where(
      and(
        eq(playersTable.sessionToken, parsed.data.sessionToken),
        eq(playersTable.roomId, rawId),
      ),
    )
    .limit(1);

  if (!host || !host.isHost) {
    res.status(403).json({ error: "Only the host can start the game" });
    return;
  }
  if (room.status !== "lobby") {
    res.status(400).json({ error: "Game already started" });
    return;
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, rawId))
    .orderBy(playersTable.orderIndex);

  if (players.length < 2) {
    res.status(400).json({ error: "Need at least 2 players to start" });
    return;
  }

  const gameData = initializeGame(
    players.map((p) => ({ id: p.id, name: p.name })),
    players.length,
  );
  gameData.turnTimerSeconds = room.turnTimerSeconds ?? null;
  updateTurnDeadline(gameData);

  await db
    .update(roomsTable)
    .set({ status: "playing", updatedAt: new Date() })
    .where(eq(roomsTable.id, rawId));

  await db
    .insert(gameStatesTable)
    .values({
      roomId: rawId,
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

  const connectedIds = getConnectedPlayerIds(rawId);
  // AI players are always considered connected
  for (const p of players) {
    if (p.isAi) connectedIds.add(p.id);
  }
  const avatarMap = new Map<string, string | null>(
    players.map((p) => [p.id, p.avatarId ?? null]),
  );
  const aiMap = new Map(
    players.map((p) => [p.id, { isAi: p.isAi, aiDifficulty: (p.aiDifficulty as AiDifficulty | null) ?? null }]),
  );

  const formatted = formatGameState(rawId, "playing", gameData, connectedIds, avatarMap, aiMap);

  for (const p of players) {
    if (p.isAi) continue;
    sendToPlayer(rawId, p.id, {
      type: "game_started",
      state: filterStateForPlayer(formatted, p.id),
    });
  }
  armTurnTimer(rawId, gameData);

  res.json(filterStateForPlayer(formatted, host.id));

  // If first player is an AI, kick off AI turns
  void runAiTurnsIfNeeded(rawId);
});

// POST /api/rooms/:roomId/rematch — host restarts the game with same players
router.post("/rooms/:roomId/rematch", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = StartGameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, rawId))
    .limit(1);

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.status !== "finished") {
    res.status(400).json({ error: "Game is not finished yet" });
    return;
  }

  const [host] = await db
    .select()
    .from(playersTable)
    .where(
      and(
        eq(playersTable.sessionToken, parsed.data.sessionToken),
        eq(playersTable.roomId, rawId),
      ),
    )
    .limit(1);

  if (!host || !host.isHost) {
    res.status(403).json({ error: "Only the host can start a rematch" });
    return;
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, rawId))
    .orderBy(playersTable.orderIndex);

  const gameData = initializeGame(
    players.map((p) => ({ id: p.id, name: p.name })),
    players.length,
  );
  gameData.turnTimerSeconds = room.turnTimerSeconds ?? null;
  updateTurnDeadline(gameData);

  await db
    .update(roomsTable)
    .set({ status: "playing", updatedAt: new Date() })
    .where(eq(roomsTable.id, rawId));

  await db
    .insert(gameStatesTable)
    .values({
      roomId: rawId,
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

  const connectedIds = getConnectedPlayerIds(rawId);
  for (const p of players) {
    if (p.isAi) connectedIds.add(p.id);
  }
  const avatarMap = new Map<string, string | null>(
    players.map((p) => [p.id, p.avatarId ?? null]),
  );
  const aiMap = new Map(
    players.map((p) => [p.id, { isAi: p.isAi, aiDifficulty: (p.aiDifficulty as AiDifficulty | null) ?? null }]),
  );

  const formatted = formatGameState(rawId, "playing", gameData, connectedIds, avatarMap, aiMap);

  // Broadcast as state_update so all clients see status change from
  // 'finished' → 'playing' without any navigation required.
  for (const p of players) {
    if (p.isAi) continue;
    sendToPlayer(rawId, p.id, {
      type: "state_update",
      state: filterStateForPlayer(formatted, p.id),
    });
  }
  armTurnTimer(rawId, gameData);

  res.json(filterStateForPlayer(formatted, host.id));

  void runAiTurnsIfNeeded(rawId);
});

// DELETE /api/rooms/:roomId/players/:playerId
router.delete(
  "/rooms/:roomId/players/:playerId",
  async (req, res): Promise<void> => {
    const rawRoomId = Array.isArray(req.params.roomId)
      ? req.params.roomId[0]
      : req.params.roomId;
    const rawPlayerId = Array.isArray(req.params.playerId)
      ? req.params.playerId[0]
      : req.params.playerId;

    const parsed = KickPlayerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [host] = await db
      .select()
      .from(playersTable)
      .where(
        and(
          eq(playersTable.sessionToken, parsed.data.sessionToken),
          eq(playersTable.roomId, rawRoomId),
        ),
      )
      .limit(1);

    if (!host || !host.isHost) {
      res.status(403).json({ error: "Not the host" });
      return;
    }

    const [kicked] = await db
      .delete(playersTable)
      .where(
        and(
          eq(playersTable.id, rawPlayerId),
          eq(playersTable.roomId, rawRoomId),
        ),
      )
      .returning();

    if (!kicked) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    broadcastToRoom(rawRoomId, { type: "player_kicked", playerId: rawPlayerId });
    // If kicking left no players, clear any pending timer
    void clearTurnTimer(rawRoomId);
    res.json({ success: true });
  },
);

export default router;
