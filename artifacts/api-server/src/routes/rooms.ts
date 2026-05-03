import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import {
  CreateRoomBody,
  JoinRoomBody,
  StartGameBody,
  KickPlayerBody,
} from "@workspace/api-zod";
import { randomBytes } from "crypto";
import {
  initializeGame,
  formatGameState,
  type GameStateData,
} from "../lib/gameEngine";
import { broadcastToRoom, getConnectedPlayerIds } from "../lib/websocket";

const router: IRouter = Router();

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

// POST /api/rooms — create room
router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { hostName, maxPlayers } = parsed.data;

  const inviteCode = generateInviteCode();
  const sessionToken = generateSessionToken();

  // Create room + host player in a transaction-like sequence
  const [room] = await db
    .insert(roomsTable)
    .values({ inviteCode, maxPlayers, status: "lobby" })
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
    })
    .returning();

  // Update room with host player id
  await db
    .update(roomsTable)
    .set({ hostPlayerId: player.id })
    .where(eq(roomsTable.id, room.id));

  req.log.info({ roomId: room.id, inviteCode }, "Room created");

  res.status(201).json({
    room: {
      id: room.id,
      inviteCode: room.inviteCode,
      status: room.status,
      maxPlayers: room.maxPlayers,
      players: [
        {
          id: player.id,
          name: player.name,
          isHost: player.isHost,
          isConnected: player.isConnected,
          orderIndex: player.orderIndex,
        },
      ],
    },
    player: {
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      isConnected: player.isConnected,
      orderIndex: player.orderIndex,
    },
    sessionToken,
  });
});

// GET /api/rooms/:inviteCode — get room info
router.get("/rooms/:inviteCode", async (req, res): Promise<void> => {
  const rawCode = Array.isArray(req.params.inviteCode)
    ? req.params.inviteCode[0]
    : req.params.inviteCode;

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.inviteCode, rawCode.toUpperCase()))
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
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isConnected: p.isConnected,
      orderIndex: p.orderIndex,
    })),
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
    })
    .returning();

  // Notify room via WebSocket
  broadcastToRoom(room.id, {
    type: "player_joined",
    player: {
      id: player.id,
      name: player.name,
      isHost: false,
      isConnected: false,
      orderIndex,
    },
  });

  const allPlayers = [...players, player];

  res.json({
    room: {
      id: room.id,
      inviteCode: room.inviteCode,
      status: room.status,
      maxPlayers: room.maxPlayers,
      players: allPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isConnected: p.isConnected,
        orderIndex: p.orderIndex,
      })),
    },
    player: {
      id: player.id,
      name: player.name,
      isHost: player.isHost,
      isConnected: player.isConnected,
      orderIndex: player.orderIndex,
    },
    sessionToken,
  });
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

  // Verify host
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

  // Initialize game state
  const gameData = initializeGame(
    players.map((p) => ({ id: p.id, name: p.name })),
    players.length,
  );

  // Update room status
  await db
    .update(roomsTable)
    .set({ status: "playing", updatedAt: new Date() })
    .where(eq(roomsTable.id, rawId));

  // Upsert game state
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
  const formatted = formatGameState(rawId, "playing", gameData, connectedIds);

  // Notify via WebSocket
  broadcastToRoom(rawId, { type: "game_started", state: formatted });

  res.json(formatted);
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
    res.json({ success: true });
  },
);

export default router;
