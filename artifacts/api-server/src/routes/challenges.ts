import { Router, type IRouter } from "express";
import type { Request } from "express";
import { eq, and, or, lt } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  challengesTable,
  accountsTable,
  roomsTable,
  playersTable,
  friendshipsTable,
} from "@workspace/db";
import { accountAuth } from "../lib/accountAuth";
import { broadcastToRoom, sendToPlayer } from "../lib/websocket";
import { randomBytes } from "crypto";
import { z } from "zod";
import { DEFAULT_VICTORY_REQUIREMENT } from "@workspace/game-types";
import { pickUniqueAvatar } from "../lib/avatarAssignment";

const router: IRouter = Router();

const CHALLENGE_EXPIRY_MINUTES = 30;

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function challengeExpiry(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + CHALLENGE_EXPIRY_MINUTES);
  return d;
}

// Map of accountId -> currently connected WS player (for challenge pushes)
// We use existing broadcastToRoom for in-room players; for non-room players we
// track a lightweight registry via account WS connections (see websocket.ts)
// For now, push via existing room infrastructure if the target is in a room.
async function notifyChallengedPlayer(
  challengedAccountId: string,
  payload: unknown,
): Promise<void> {
  // Find any room where this account has a connected player
  const rows = await db
    .select({ player: playersTable })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(
      and(
        eq(playersTable.accountId, challengedAccountId),
        eq(playersTable.isConnected, true),
      ),
    )
    .limit(1);

  if (rows[0]) {
    sendToPlayer(rows[0].player.roomId, rows[0].player.id, payload);
  }
}

// POST /api/challenges — create a challenge
router.post("/challenges", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;

  const parsed = z.object({
    challengedUsername: z.string(),
    maxPlayers: z.number().int().min(2).max(4).optional().default(2),
    victoryRequirement: z.union([z.literal(15), z.literal(20), z.literal(25)])
      .optional()
      .default(DEFAULT_VICTORY_REQUIREMENT),
    cinematicMode: z.union([z.literal("standard"), z.literal("epic")]).optional().default("standard"),
    turnTimerSeconds: z.number().int().nullable().optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "challengedUsername is required" });
    return;
  }

  const { challengedUsername, maxPlayers, victoryRequirement, cinematicMode, turnTimerSeconds } = parsed.data;

  if (challengedUsername.toLowerCase() === account.username.toLowerCase()) {
    res.status(400).json({ error: "Cannot challenge yourself" });
    return;
  }

  const [target] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.username, challengedUsername))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Check they are friends
  const [friendship] = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.status, "accepted"),
        or(
          and(eq(friendshipsTable.requesterId, account.id), eq(friendshipsTable.addresseeId, target.id)),
          and(eq(friendshipsTable.requesterId, target.id), eq(friendshipsTable.addresseeId, account.id)),
        ),
      ),
    )
    .limit(1);

  if (!friendship) {
    res.status(403).json({ error: "You can only challenge friends" });
    return;
  }

  // Check no pending challenge already exists between these two
  const [existingChallenge] = await db
    .select()
    .from(challengesTable)
    .where(
      and(
        eq(challengesTable.challengerAccountId, account.id),
        eq(challengesTable.challengedAccountId, target.id),
        eq(challengesTable.status, "pending"),
      ),
    )
    .limit(1);

  if (existingChallenge) {
    res.status(409).json({ error: "A pending challenge already exists" });
    return;
  }

  // Create the private room
  const inviteCode = generateInviteCode();
  const hostSessionToken = generateSessionToken();

  const [room] = await db
    .insert(roomsTable)
    .values({
      inviteCode,
      maxPlayers,
      victoryRequirement,
      cinematicMode,
      gameMode: victoryRequirement === DEFAULT_VICTORY_REQUIREMENT ? "standard" : "custom",
      status: "lobby",
      turnTimerSeconds: turnTimerSeconds ?? null,
    })
    .returning();

  const [hostPlayer] = await db
    .insert(playersTable)
    .values({
      roomId: room.id,
      accountId: account.id,
      name: account.username,
      sessionToken: hostSessionToken,
      isHost: true,
      orderIndex: 0,
      isConnected: false,
      isAi: false,
      avatarId: pickUniqueAvatar(null, []),
    })
    .returning();

  await db
    .update(roomsTable)
    .set({ hostPlayerId: hostPlayer.id })
    .where(eq(roomsTable.id, room.id));

  // Create challenge record
  const [challenge] = await db
    .insert(challengesTable)
    .values({
      challengerAccountId: account.id,
      challengedAccountId: target.id,
      roomId: room.id,
      status: "pending",
      expiresAt: challengeExpiry(),
    })
    .returning();

  // Notify the challenged player if online
  await notifyChallengedPlayer(target.id, {
    type: "challenge_received",
    challenge: {
      id: challenge.id,
      challengerUsername: account.username,
      roomId: room.id,
      inviteCode: room.inviteCode,
      expiresAt: challenge.expiresAt,
    },
  });

  req.log.info({ challengeId: challenge.id, roomId: room.id }, "Challenge created");

  res.status(201).json({
    id: challenge.id,
    roomId: room.id,
    inviteCode: room.inviteCode,
    challengedUsername: target.username,
    expiresAt: challenge.expiresAt,
    sessionToken: hostSessionToken,
    playerId: hostPlayer.id,
  });
});

// POST /api/rooms/:roomId/invite-friend — invite an existing friend to join the current lobby room.
// Creates a challenge pointing at the existing room (no new room created).
// The standard PATCH /api/challenges/:id accept flow then adds them as a player.
router.post("/rooms/:roomId/invite-friend", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  const { roomId } = req.params as { roomId: string };

  const parsed = z.object({
    sessionToken: z.string(),
    friendUsername: z.string(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "sessionToken and friendUsername are required" });
    return;
  }

  const { sessionToken, friendUsername } = parsed.data;

  // Verify the room exists and is still in lobby
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId)).limit(1);
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.status !== "lobby") {
    res.status(400).json({ error: "Game has already started" });
    return;
  }

  // Verify the caller holds a valid session in this room
  const [player] = await db
    .select()
    .from(playersTable)
    .where(
      and(
        eq(playersTable.roomId, roomId),
        eq(playersTable.sessionToken, sessionToken),
        eq(playersTable.accountId, account.id),
      ),
    )
    .limit(1);

  if (!player) {
    res.status(403).json({ error: "Not a member of this room" });
    return;
  }

  // Check there is still space
  const allPlayers = await db.select().from(playersTable).where(eq(playersTable.roomId, roomId));
  if (allPlayers.length >= room.maxPlayers) {
    res.status(400).json({ error: "Room is full" });
    return;
  }

  // Resolve the friend's account
  if (friendUsername.toLowerCase() === account.username.toLowerCase()) {
    res.status(400).json({ error: "Cannot invite yourself" });
    return;
  }

  const [target] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.username, friendUsername))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Must be friends
  const [friendship] = await db
    .select()
    .from(friendshipsTable)
    .where(
      and(
        eq(friendshipsTable.status, "accepted"),
        or(
          and(eq(friendshipsTable.requesterId, account.id), eq(friendshipsTable.addresseeId, target.id)),
          and(eq(friendshipsTable.requesterId, target.id), eq(friendshipsTable.addresseeId, account.id)),
        ),
      ),
    )
    .limit(1);

  if (!friendship) {
    res.status(403).json({ error: "You can only invite friends" });
    return;
  }

  // Don't double-invite
  const [existing] = await db
    .select()
    .from(challengesTable)
    .where(
      and(
        eq(challengesTable.challengerAccountId, account.id),
        eq(challengesTable.challengedAccountId, target.id),
        eq(challengesTable.roomId, roomId),
        eq(challengesTable.status, "pending"),
      ),
    )
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Already invited this player" });
    return;
  }

  const [challenge] = await db
    .insert(challengesTable)
    .values({
      challengerAccountId: account.id,
      challengedAccountId: target.id,
      roomId: room.id,
      status: "pending",
      expiresAt: challengeExpiry(),
    })
    .returning();

  await notifyChallengedPlayer(target.id, {
    type: "challenge_received",
    challenge: {
      id: challenge.id,
      challengerUsername: account.username,
      roomId: room.id,
      inviteCode: room.inviteCode,
      expiresAt: challenge.expiresAt,
    },
  });

  req.log.info({ challengeId: challenge.id, roomId }, "Friend invited to existing room");

  res.status(201).json({ ok: true, challengeId: challenge.id });
});

// GET /api/challenges — list incoming pending challenges for current account
router.get("/challenges", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;

  const now = new Date();

  // Auto-expire stale challenges using a proper time predicate
  await db
    .update(challengesTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(challengesTable.status, "pending"),
        lt(challengesTable.expiresAt, now),
      ),
    );

  const rows = await db
    .select({
      challenge: challengesTable,
      challenger: { id: accountsTable.id, username: accountsTable.username },
      room: { id: roomsTable.id, inviteCode: roomsTable.inviteCode, status: roomsTable.status },
    })
    .from(challengesTable)
    .innerJoin(accountsTable, eq(accountsTable.id, challengesTable.challengerAccountId))
    .innerJoin(roomsTable, eq(roomsTable.id, challengesTable.roomId))
    .where(
      and(
        eq(challengesTable.challengedAccountId, account.id),
        eq(challengesTable.status, "pending"),
      ),
    );

  const active = rows.filter((r) => r.challenge.expiresAt > now);

  const challenges = active.map((r) => ({
    id: r.challenge.id,
    challengerUsername: r.challenger.username,
    challengerAccountId: r.challenger.id,
    roomId: r.room.id,
    inviteCode: r.room.inviteCode,
    expiresAt: r.challenge.expiresAt,
  }));

  res.json({ challenges });
});

// PATCH /api/challenges/:id — accept or decline
router.patch("/challenges/:id", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  const { id } = req.params as { id: string };

  const parsed = z.object({ action: z.enum(["accept", "decline"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "action must be 'accept' or 'decline'" });
    return;
  }

  const { action } = parsed.data;

  const now = new Date();

  const [row] = await db
    .select({
      challenge: challengesTable,
      challenger: { id: accountsTable.id, username: accountsTable.username },
      room: roomsTable,
    })
    .from(challengesTable)
    .innerJoin(accountsTable, eq(accountsTable.id, challengesTable.challengerAccountId))
    .innerJoin(roomsTable, eq(roomsTable.id, challengesTable.roomId))
    .where(
      and(
        eq(challengesTable.id, id),
        eq(challengesTable.challengedAccountId, account.id),
        eq(challengesTable.status, "pending"),
      ),
    )
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Challenge not found or already resolved" });
    return;
  }

  if (row.challenge.expiresAt <= now) {
    await db.update(challengesTable).set({ status: "expired" }).where(eq(challengesTable.id, id));
    res.status(410).json({ error: "Challenge has expired" });
    return;
  }

  if (action === "decline") {
    await db.update(challengesTable).set({ status: "declined" }).where(eq(challengesTable.id, id));

    // Notify challenger
    await notifyChallengedPlayer(row.challenge.challengerAccountId, {
      type: "challenge_resolved",
      challengeId: id,
      resolution: "declined",
      challengedUsername: account.username,
    });

    res.json({ ok: true, resolution: "declined" });
    return;
  }

  // Accept — join the room
  const sessionToken = generateSessionToken();
  const existingPlayers = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, row.room.id));

  if (existingPlayers.length >= row.room.maxPlayers) {
    res.status(400).json({ error: "Room is full" });
    return;
  }
  const avatarId = pickUniqueAvatar(null, existingPlayers.map((player) => player.avatarId));

  const [joinedPlayer] = await db
    .insert(playersTable)
    .values({
      roomId: row.room.id,
      accountId: account.id,
      name: account.username,
      sessionToken,
      isHost: false,
      orderIndex: existingPlayers.length,
      isConnected: false,
      isAi: false,
      avatarId,
    })
    .returning();

  await db
    .update(challengesTable)
    .set({ status: "accepted" })
    .where(eq(challengesTable.id, id));

  broadcastToRoom(row.room.id, {
    type: "player_joined",
    player: {
      id: joinedPlayer.id,
      name: joinedPlayer.name,
      isHost: joinedPlayer.isHost,
      isConnected: joinedPlayer.isConnected,
      orderIndex: joinedPlayer.orderIndex,
      isAi: joinedPlayer.isAi,
      aiDifficulty: joinedPlayer.aiDifficulty,
      avatarId: joinedPlayer.avatarId,
    },
  });

  // Notify challenger of acceptance
  await notifyChallengedPlayer(row.challenge.challengerAccountId, {
    type: "challenge_resolved",
    challengeId: id,
    resolution: "accepted",
    challengedUsername: account.username,
    roomId: row.room.id,
  });

  res.json({
    ok: true,
    resolution: "accepted",
    room: {
      id: row.room.id,
      inviteCode: row.room.inviteCode,
      status: row.room.status,
      maxPlayers: row.room.maxPlayers,
      victoryRequirement: row.room.victoryRequirement,
      cinematicMode: row.room.cinematicMode,
      turnTimerSeconds: row.room.turnTimerSeconds,
    },
    player: {
      id: joinedPlayer.id,
      name: joinedPlayer.name,
      isHost: joinedPlayer.isHost,
      avatarId: joinedPlayer.avatarId,
    },
    sessionToken,
  });
});

export default router;
