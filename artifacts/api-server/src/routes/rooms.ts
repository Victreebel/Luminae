import { Router, type IRouter } from "express";
import { eq, and, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db, roomsTable, playersTable, gameStatesTable } from "@workspace/db";
import {
  CreateRoomBody,
  JoinRoomBody,
  RejoinRoomBody,
  StartGameBody,
  KickPlayerBody,
  AddAiPlayerBody,
} from "@workspace/api-zod";
import { optionalAccountAuth } from "../lib/accountAuth";
import { randomBytes } from "crypto";
import {
  initializeGame,
  formatGameState,
  parseAiDifficulty,
  zAiDifficulty,
} from "../lib/gameEngine";
import { broadcastToRoom, getConnectedPlayerIds, sendToPlayer, filterStateForPlayer } from "../lib/websocket";
import { runAiTurnsIfNeeded } from "../lib/aiTurnRunner";
import { armTurnTimer, updateTurnDeadline, clearTurnTimer } from "../lib/turnTimer";
import { castVote, getRematchInfo } from "../lib/rematchManager";
import { GUIDED_LUMII_AVATAR_ID, pickUniqueAvatar } from "../lib/avatarAssignment";
import { ensureAccountProgressBackfilled } from "../lib/accountProgress";
import {
  accountHasBlueprintClearance,
  BlueprintRoomAccessError,
  resolveBlueprintSetupsForMatch,
} from "../lib/blueprintLoadouts";
import { readAccountCivilizationIdentity } from "../lib/accountIdentity";
import { authorizePlayerRejoin } from "../lib/rejoinAuthorization";
import { requireUuidParam } from "../lib/routeParams";
import {
  addBalanceLabMemoryAiPlayer,
  applyBalanceLabRoomRuleset,
  getBalanceLabMemoryPlayerBySession,
  getBalanceLabMemoryRoom,
  getBalanceLabMemoryRoomByInvite,
  getBalanceLabRoomRuleset,
  isBalanceLabRoom,
  startBalanceLabMemoryRoom,
  type BalanceLabMemoryPlayer,
  type BalanceLabMemoryRoom,
} from "../lib/balanceLabRooms";

const router: IRouter = Router();
router.param("roomId", requireUuidParam);

function generateInviteCode(): string {
  return randomBytes(5).toString("hex").toUpperCase();
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

type DbPlayer = typeof playersTable.$inferSelect;
type DbRoom = typeof roomsTable.$inferSelect;

type SerializablePlayer = DbPlayer | BalanceLabMemoryPlayer;
type SerializableRoom = DbRoom | BalanceLabMemoryRoom;

function serializePlayer(p: SerializablePlayer) {
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

function serializeRoomBase(room: SerializableRoom) {
  return {
    id: room.id,
    inviteCode: room.inviteCode,
    status: room.status,
    maxPlayers: room.maxPlayers,
    victoryRequirement: room.victoryRequirement,
    cinematicMode: room.cinematicMode,
    turnTimerSeconds: room.turnTimerSeconds,
    gameMode: room.gameMode,
    scenarioId: room.scenarioId,
    blueprintPolicy: room.blueprintPolicy,
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

function pickAiName(existing: string[]): string {
  const taken = new Set(existing);
  const free = AI_NAME_POOL.filter((n) => !taken.has(n));
  if (free.length > 0) return free[Math.floor(Math.random() * free.length)];
  return `AI-${Math.floor(Math.random() * 10000)}`;
}

function pickAiAvatar(existing: string[]): string {
  return pickUniqueAvatar(null, existing, true);
}

async function ensureUniquePlayerAvatars(players: DbPlayer[]): Promise<DbPlayer[]> {
  const taken = new Set<string>();
  const normalized: DbPlayer[] = [];

  for (const player of players) {
    if (player.isAi && player.name === "Lumii" && player.avatarId === GUIDED_LUMII_AVATAR_ID) {
      taken.add(GUIDED_LUMII_AVATAR_ID);
      normalized.push(player);
      continue;
    }
    const avatarId = pickUniqueAvatar(player.avatarId, taken);
    taken.add(avatarId);
    if (avatarId === player.avatarId) {
      normalized.push(player);
      continue;
    }
    const [updated] = await db
      .update(playersTable)
      .set({ avatarId })
      .where(eq(playersTable.id, player.id))
      .returning();
    normalized.push(updated);
  }
  return normalized;
}

const MAX_ACTIVE_GAMES = 5;
const GameSessionToken = z.string().regex(/^[a-f0-9]{64}$/);
const PlayerName = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Player name contains unsupported characters");

const UpdateRoomSettingsBody = z.object({
  sessionToken: GameSessionToken,
  cinematicMode: z.union([z.literal("standard"), z.literal("epic")]).optional(),
  blueprintPolicy: z.union([z.literal("none"), z.literal("owned")]).optional(),
}).strict();

const PublicCreateRoomBody = CreateRoomBody.omit({
  gameMode: true,
  scenarioId: true,
  blueprintPolicy: true,
}).extend({
  hostName: PlayerName,
  maxPlayers: z.number().int().min(2).max(4),
  victoryRequirement: z.union([z.literal(15), z.literal(20), z.literal(25)]).default(20),
  cinematicMode: z.union([z.literal("standard"), z.literal("epic")]).default("standard"),
  turnTimerSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]).nullable().optional(),
  avatarId: z.string().min(1).max(64).nullable().optional(),
  gameMode: z.union([z.literal("standard"), z.literal("custom")]).default("standard"),
  blueprintPolicy: z.union([z.literal("none"), z.literal("owned")]).optional(),
}).strict().superRefine((value, context) => {
  const policy = value.blueprintPolicy ?? (value.gameMode === "custom" ? "owned" : "none");
  if (value.gameMode === "standard" && policy !== "none") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["blueprintPolicy"],
      message: "Standard rooms cannot enable Blueprints",
    });
  }
});

const JoinRoomRequestBody = JoinRoomBody.extend({
  playerName: PlayerName,
  avatarId: z.string().min(1).max(64).nullable().optional(),
}).strict();

const RejoinRoomRequestBody = RejoinRoomBody.extend({
  playerName: PlayerName,
  sessionToken: GameSessionToken.optional(),
}).strict();

const AddAiPlayerRequestBody = AddAiPlayerBody.extend({
  sessionToken: GameSessionToken,
}).strict();

const StartGameRequestBody = StartGameBody.extend({
  sessionToken: GameSessionToken,
}).strict();

const KickPlayerRequestBody = KickPlayerBody.extend({
  sessionToken: GameSessionToken,
}).strict();

const RematchBody = StartGameRequestBody.extend({
  action: z.enum(["join", "decline", "withdraw"]).optional(),
  sameBoard: z.boolean().optional(),
}).strict();

const QuitRoomBody = z.object({ sessionToken: GameSessionToken }).strict();

async function countActiveGames(accountId: string): Promise<number> {
  const rows = await db
    .select({ roomId: playersTable.roomId })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(
      and(
        eq(playersTable.accountId, accountId),
        eq(playersTable.isAi, false),
        isNull(playersTable.quitAt),
        ne(roomsTable.status, "finished"),
      ),
    );
  return rows.length;
}

// POST /api/rooms — create room
router.post("/rooms", optionalAccountAuth, async (req, res): Promise<void> => {
  const parsed = PublicCreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const {
    hostName,
    maxPlayers,
    victoryRequirement,
    cinematicMode,
    turnTimerSeconds,
    avatarId: hostAvatarId,
    gameMode,
  } = parsed.data;
  const blueprintPolicy =
    parsed.data.blueprintPolicy ?? (gameMode === "custom" ? "owned" : "none");

  if (blueprintPolicy !== "none") {
    if (!req.account) {
      res.status(401).json({ error: "A cleared account is required for Blueprint rooms" });
      return;
    }
    await ensureAccountProgressBackfilled(req.account.id);
    if (!(await accountHasBlueprintClearance(req.account.id))) {
      res.status(403).json({ error: "Clear the Blueprint Vault before creating this room" });
      return;
    }
  }

  if (req.account) {
    const active = await countActiveGames(req.account.id);
    if (active >= MAX_ACTIVE_GAMES) {
      res.status(409).json({ error: `You already have ${MAX_ACTIVE_GAMES} active games. Finish or leave one before creating a new one.` });
      return;
    }
  }

  const inviteCode = generateInviteCode();
  const sessionToken = generateSessionToken();

  const [room] = await db
    .insert(roomsTable)
    .values({
      inviteCode,
      maxPlayers,
      victoryRequirement,
      cinematicMode,
      status: "lobby",
      turnTimerSeconds: turnTimerSeconds ?? null,
      gameMode,
      blueprintPolicy,
    })
    .returning();

  const [player] = await db
    .insert(playersTable)
    .values({
      roomId: room.id,
      accountId: req.account?.id ?? null,
      name: hostName,
      sessionToken,
      isHost: true,
      orderIndex: 0,
      isConnected: false,
      isAi: false,
      avatarId: pickUniqueAvatar(hostAvatarId, []),
    })
    .returning();

  await db
    .update(roomsTable)
    .set({ hostPlayerId: player.id })
    .where(eq(roomsTable.id, room.id));

  req.log.info({ roomId: room.id }, "Room created");

  const serialized = serializePlayer(player);

  res.status(201).json({
    room: {
      ...serializeRoomBase(room),
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
  const normalizedCode = rawCode.trim().toUpperCase();

  const memoryRoom = getBalanceLabMemoryRoom(rawCode) ??
    getBalanceLabMemoryRoomByInvite(rawCode);
  if (memoryRoom) {
    res.json({
      ...serializeRoomBase(memoryRoom),
      players: memoryRoom.players.map(serializePlayer),
    });
    return;
  }

  // Accept either an invite code OR a room UUID so the lobby can look up the
  // room even if the client only has the roomId from the URL (e.g. a stale
  // session that predates persisting the invite code).
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      rawCode,
    );
  if (!isUuid && !/^(?:[A-F0-9]{8}|[A-F0-9]{10})$/.test(normalizedCode)) {
    res.status(400).json({ error: "Invalid invite code" });
    return;
  }

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(
      isUuid
        ? eq(roomsTable.id, rawCode)
        : eq(roomsTable.inviteCode, normalizedCode),
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
    ...serializeRoomBase(room),
    players: players.map(serializePlayer),
  });
});

// POST /api/rooms/:roomId/join
router.post("/rooms/:roomId/join", optionalAccountAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = JoinRoomRequestBody.safeParse(req.body);
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

  if (room.blueprintPolicy !== "none") {
    if (!req.account) {
      res.status(401).json({ error: "A cleared account is required for Blueprint rooms" });
      return;
    }
    await ensureAccountProgressBackfilled(req.account.id);
    if (!(await accountHasBlueprintClearance(req.account.id))) {
      res.status(403).json({ error: "Clear the Blueprint Vault before joining this room" });
      return;
    }
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, room.id));

  if (players.length >= room.maxPlayers) {
    res.status(400).json({ error: "Room is full" });
    return;
  }

  const balanceLabRoom = isBalanceLabRoom(room.id);
  if (req.account && !balanceLabRoom) {
    const active = await countActiveGames(req.account.id);
    if (active >= MAX_ACTIVE_GAMES) {
      res.status(409).json({ error: `You already have ${MAX_ACTIVE_GAMES} active games. Finish or leave one before joining a new one.` });
      return;
    }
  }

  const sessionToken = generateSessionToken();
  const orderIndex = players.length;
  const avatarId = pickUniqueAvatar(joiningAvatarId, players.map((p) => p.avatarId));

  const [player] = await db
    .insert(playersTable)
    .values({
      roomId: room.id,
      accountId: balanceLabRoom ? null : req.account?.id ?? null,
      name: playerName,
      sessionToken,
      isHost: false,
      orderIndex,
      isConnected: false,
      isAi: false,
      avatarId,
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
      ...serializeRoomBase(room),
      players: allPlayers.map(serializePlayer),
    },
    player: serialized,
    sessionToken,
  });
});

// POST /api/rooms/:roomId/rejoin — rotate an existing player's game token.
// Account players prove ownership with their account session; guests must
// still possess the current game session token.
router.post("/rooms/:roomId/rejoin", optionalAccountAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = RejoinRoomRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { playerName, sessionToken } = parsed.data;

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

  const authorization = authorizePlayerRejoin({
    targetAccountId: target.accountId,
    targetSessionToken: target.sessionToken,
    requesterAccountId: req.account?.id ?? null,
    providedSessionToken: sessionToken,
  });
  if (!authorization.allowed) {
    res.status(authorization.status).json({ error: authorization.error });
    return;
  }

  // Issue a new session token and atomically invalidate the prior one.
  const newToken = generateSessionToken();
  const [updated] = await db
    .update(playersTable)
    .set({ sessionToken: newToken, isConnected: false })
    .where(
      and(
        eq(playersTable.id, target.id),
        eq(playersTable.sessionToken, target.sessionToken),
      ),
    )
    .returning();

  if (!updated) {
    res.status(409).json({ error: "This player session changed; try again" });
    return;
  }

  const refreshed = players.map((p) => (p.id === updated.id ? updated : p));

  res.json({
    room: {
      ...serializeRoomBase(room),
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

  const parsed = AddAiPlayerRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sessionToken, difficulty } = parsed.data;

  const difficultyResult = zAiDifficulty.safeParse(difficulty);
  if (!difficultyResult.success) {
    res.status(400).json({ error: `Invalid AI difficulty: "${difficulty}". Must be one of: easy, medium, hard, passive.` });
    return;
  }
  const validatedDifficulty = difficultyResult.data;

  const memoryRoom = getBalanceLabMemoryRoom(rawId);
  if (memoryRoom) {
    if (memoryRoom.status !== "lobby") {
      res.status(400).json({ error: "Game already started" });
      return;
    }
    const host = getBalanceLabMemoryPlayerBySession(rawId, sessionToken);
    if (!host?.isHost) {
      res.status(403).json({ error: "Only the host can add AI players" });
      return;
    }
    if (memoryRoom.players.length >= memoryRoom.maxPlayers) {
      res.status(400).json({ error: "Room is full" });
      return;
    }

    const isGuidedLumii = validatedDifficulty === "passive";
    const aiName = isGuidedLumii
      ? "Lumii"
      : pickAiName(memoryRoom.players.map((player) => player.name));
    const aiAvatarId = isGuidedLumii
      ? GUIDED_LUMII_AVATAR_ID
      : pickAiAvatar(memoryRoom.players
          .map((player) => player.avatarId)
          .filter((avatarId): avatarId is string => !!avatarId));
    const aiPlayer = addBalanceLabMemoryAiPlayer(rawId, {
      name: aiName,
      avatarId: aiAvatarId,
      difficulty: validatedDifficulty,
    });
    const serialized = serializePlayer(aiPlayer);
    broadcastToRoom(rawId, { type: "player_joined", player: serialized });
    res.json(serialized);
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

  // Passive AI is reserved for the guided match. Lumii passes legally and
  // never forges, leaving the player room to learn the board.
  const isGuidedLumii = validatedDifficulty === "passive";
  const aiName = isGuidedLumii ? "Lumii" : pickAiName(players.map((p) => p.name));
  const aiAvatarId = isGuidedLumii
    ? GUIDED_LUMII_AVATAR_ID
    : pickAiAvatar(players.map((p) => p.avatarId).filter((v): v is string => !!v));
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
      aiDifficulty: validatedDifficulty,
    })
    .returning();

  const serialized = serializePlayer(aiPlayer);

  broadcastToRoom(room.id, {
    type: "player_joined",
    player: serialized,
  });

  res.json(serialized);
});

// PATCH /api/rooms/:roomId/settings — update lobby room settings
router.patch("/rooms/:roomId/settings", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = UpdateRoomSettingsBody.safeParse(req.body);
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

  if (room.status !== "lobby") {
    res.status(400).json({ error: "Room settings can only be changed before the game starts" });
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
    res.status(403).json({ error: "Only the host can change room settings" });
    return;
  }

  const [updatedRoom] = await db
    .update(roomsTable)
    .set({
      cinematicMode: parsed.data.cinematicMode ?? room.cinematicMode,
      blueprintPolicy:
        room.gameMode === "custom"
          ? parsed.data.blueprintPolicy ?? room.blueprintPolicy
          : "none",
      updatedAt: new Date(),
    })
    .where(eq(roomsTable.id, rawId))
    .returning();

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, rawId))
    .orderBy(playersTable.orderIndex);

  broadcastToRoom(rawId, {
    type: "room_updated",
    room: serializeRoomBase(updatedRoom),
  });

  res.json({
    ...serializeRoomBase(updatedRoom),
    players: players.map(serializePlayer),
  });
});

// POST /api/rooms/:roomId/start
router.post("/rooms/:roomId/start", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = StartGameRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const memoryRoom = getBalanceLabMemoryRoom(rawId);
  if (memoryRoom) {
    const host = getBalanceLabMemoryPlayerBySession(
      rawId,
      parsed.data.sessionToken,
    );
    if (!host?.isHost) {
      res.status(403).json({ error: "Only the host can start the game" });
      return;
    }
    if (memoryRoom.status !== "lobby") {
      res.status(400).json({ error: "Game already started" });
      return;
    }
    if (memoryRoom.players.length < 2) {
      res.status(400).json({ error: "Need at least 2 players to start" });
      return;
    }

    const balanceRuleset = getBalanceLabRoomRuleset(rawId);
    if (!balanceRuleset) {
      res.status(409).json({ error: "Balance laboratory ruleset is unavailable" });
      return;
    }
    const gameData = initializeGame(
      memoryRoom.players.map((player) => ({ id: player.id, name: player.name })),
      memoryRoom.players.length,
      memoryRoom.victoryRequirement,
      memoryRoom.cinematicMode,
      {
        applyTurnOrderCompensation: balanceRuleset.luminaryBaseEminence !== "none",
        balanceRuleset,
      },
    );
    applyBalanceLabRoomRuleset(rawId, gameData);
    gameData.turnTimerSeconds = null;
    updateTurnDeadline(gameData);
    if (!startBalanceLabMemoryRoom(rawId, gameData)) {
      res.status(409).json({ error: "Balance room could not be started" });
      return;
    }

    const connectedIds = getConnectedPlayerIds(rawId);
    for (const player of memoryRoom.players) {
      if (player.isAi) connectedIds.add(player.id);
    }
    const avatarMap = new Map<string, string | null>(
      memoryRoom.players.map((player) => [player.id, player.avatarId]),
    );
    const aiMap = new Map(
      memoryRoom.players.map((player) => [player.id, {
        isAi: player.isAi,
        aiDifficulty: player.aiDifficulty,
      }]),
    );
    const formatted = formatGameState(
      rawId,
      "playing",
      gameData,
      connectedIds,
      avatarMap,
      aiMap,
      null,
    );
    for (const player of memoryRoom.players) {
      if (player.isAi) continue;
      sendToPlayer(rawId, player.id, {
        type: "game_started",
        state: filterStateForPlayer(formatted, player.id),
      });
    }
    res.json(filterStateForPlayer(formatted, host.id));
    void runAiTurnsIfNeeded(rawId);
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

  let players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, rawId))
    .orderBy(playersTable.orderIndex);

  if (players.length < 2) {
    res.status(400).json({ error: "Need at least 2 players to start" });
    return;
  }

  players = await ensureUniquePlayerAvatars(players);

  let blueprintSetups;
  try {
    blueprintSetups = await resolveBlueprintSetupsForMatch(room, players);
  } catch (error) {
    if (!(error instanceof BlueprintRoomAccessError)) throw error;
    res.status(403).json({ error: error.message });
    return;
  }

  const civilizationIdentities = Object.fromEntries(await Promise.all(
    players.map(async (player) => [
      player.id,
      player.accountId ? await readAccountCivilizationIdentity(player.accountId) : null,
    ] as const),
  ));

  const balanceRuleset = getBalanceLabRoomRuleset(rawId);
  const gameData = initializeGame(
    players.map((p) => ({ id: p.id, name: p.name })),
    players.length,
    room.victoryRequirement,
    room.cinematicMode === "epic" ? "epic" : "standard",
    {
      blueprintSetups,
      civilizationIdentities,
      applyTurnOrderCompensation: balanceRuleset?.luminaryBaseEminence !== "none",
      balanceRuleset: balanceRuleset ?? undefined,
    },
  );
  applyBalanceLabRoomRuleset(rawId, gameData);
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
    players.map((p) => [p.id, { isAi: p.isAi, aiDifficulty: p.aiDifficulty != null ? parseAiDifficulty(p.aiDifficulty) : null }]),
  );

  const formatted = formatGameState(rawId, "playing", gameData, connectedIds, avatarMap, aiMap, room.scenarioId);

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

// GET /api/rooms/:roomId/rematch — recover the current invitation after a
// refresh or reconnect.
router.get("/rooms/:roomId/rematch", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;
  const sessionToken =
    typeof req.query.sessionToken === "string" ? req.query.sessionToken : "";

  const [player] = await db
    .select()
    .from(playersTable)
    .where(
      and(
        eq(playersTable.sessionToken, sessionToken),
        eq(playersTable.roomId, rawId),
      ),
    )
    .limit(1);

  if (!player) {
    res.status(403).json({ error: "Not a member of this room" });
    return;
  }

  const [room] = await db
    .select({ scenarioId: roomsTable.scenarioId })
    .from(roomsTable)
    .where(eq(roomsTable.id, rawId))
    .limit(1);
  if (room?.scenarioId === "blueprint_clearance_lumii") {
    res.status(403).json({ error: "Return to the Vault for scenario outcomes" });
    return;
  }

  res.json(getRematchInfo(rawId));
});

// POST /api/rooms/:roomId/rematch — join, decline, or withdraw from a rematch
// invitation. Nothing starts until every human player has explicitly responded.
router.post("/rooms/:roomId/rematch", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = RematchBody.safeParse(req.body);
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
  if (room.scenarioId === "blueprint_clearance_lumii") {
    res.status(403).json({
      error: "Return to the Vault to begin a fresh defense forecast",
    });
    return;
  }

  // Verify the caller is a member of this room (any player, not just host)
  const [player] = await db
    .select()
    .from(playersTable)
    .where(
      and(
        eq(playersTable.sessionToken, parsed.data.sessionToken),
        eq(playersTable.roomId, rawId),
      ),
    )
    .limit(1);

  if (!player) {
    res.status(403).json({ error: "Not a member of this room" });
    return;
  }

  if (
    (parsed.data.action ?? "join") === "join" &&
    parsed.data.sameBoard === true
  ) {
    const [gameStateRow] = await db
      .select({ state: gameStatesTable.state })
      .from(gameStatesTable)
      .where(eq(gameStatesTable.roomId, rawId))
      .limit(1);

    const savedState = gameStateRow?.state as { initialBoard?: unknown } | undefined;
    if (!savedState?.initialBoard) {
      res.status(409).json({
        error:
          "Replay Same Board is only available for games started after opening board snapshots were added.",
      });
      return;
    }
  }

  const allPlayers = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, rawId))
    .orderBy(playersTable.orderIndex);

  const voteInfo = await castVote(
    rawId,
    player.id,
    allPlayers.map((p) => ({ id: p.id, name: p.name, isAi: p.isAi })),
    {
      action: parsed.data.action ?? "join",
      sameBoard: parsed.data.sameBoard === true,
    },
  );

  // Broadcast updated vote state to all players in the room
  for (const p of allPlayers) {
    if (p.isAi) continue;
    sendToPlayer(rawId, p.id, {
      type: "rematch_vote_update",
      ...voteInfo,
    });
  }

  res.json(voteInfo);
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

    const parsed = KickPlayerRequestBody.safeParse(req.body);
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

// POST /api/rooms/:roomId/quit — account player forfeits/leaves a game
router.post("/rooms/:roomId/quit", optionalAccountAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId)
    ? req.params.roomId[0]
    : req.params.roomId;

  const parsed = QuitRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid sessionToken is required" });
    return;
  }
  const { sessionToken } = parsed.data;

  const [room] = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, rawId))
    .limit(1);

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const [player] = await db
    .select()
    .from(playersTable)
    .where(
      and(
        eq(playersTable.sessionToken, sessionToken),
        eq(playersTable.roomId, rawId),
      ),
    )
    .limit(1);

  // If an account token was provided, verify it matches the player's linked account
  if (req.account && player && player.accountId !== req.account.id) {
    res.status(403).json({ error: "Account does not match player" });
    return;
  }

  if (!player) {
    res.status(403).json({ error: "Not a member of this room" });
    return;
  }

  // Record quit time (preserves accountId for history) and mark disconnected
  await db
    .update(playersTable)
    .set({ isConnected: false, quitAt: new Date() })
    .where(eq(playersTable.id, player.id));

  // Finish the room only if no other human players remain (connected or not, excluding quitters)
  const remaining = await db
    .select()
    .from(playersTable)
    .where(and(eq(playersTable.roomId, rawId), eq(playersTable.isAi, false)));

  const otherHumans = remaining.filter(
    (p) => p.id !== player.id && p.quitAt === null,
  );

  if (otherHumans.length === 0 && room.status !== "finished") {
    // No other humans connected — mark room as finished
    await db
      .update(roomsTable)
      .set({ status: "finished", updatedAt: new Date() })
      .where(eq(roomsTable.id, rawId));
  }

  broadcastToRoom(rawId, { type: "player_quit", playerId: player.id });
  void clearTurnTimer(rawId);

  req.log.info({ roomId: rawId, playerId: player.id }, "Player quit room");
  res.json({ ok: true });
});

export default router;
