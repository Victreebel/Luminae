import { Router, type IRouter } from "express";
import { eq, and, inArray, isNull, count, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  accountsTable,
  accountSessionsTable,
  playersTable,
  roomsTable,
  gameStatesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { accountAuth } from "../lib/accountAuth";
import type { Request } from "express";

const router: IRouter = Router();

const SALT_ROUNDS = 10;
const SESSION_DAYS = 30;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function sessionExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

const RegisterBody = z.object({
  username: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  password: z.string().min(6),
  email: z.string().email().optional(),
});

const LoginBody = z.object({
  username: z.string(),
  password: z.string(),
});

// POST /api/auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { username, password, email } = parsed.data;

  const [existing] = await db
    .select({ id: accountsTable.id })
    .from(accountsTable)
    .where(eq(accountsTable.username, username))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  if (email) {
    const [emailExists] = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(eq(accountsTable.email, email))
      .limit(1);
    if (emailExists) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [account] = await db
    .insert(accountsTable)
    .values({ username, email: email ?? null, passwordHash })
    .returning();

  const token = generateToken();
  const [session] = await db
    .insert(accountSessionsTable)
    .values({ accountId: account.id, token, expiresAt: sessionExpiry() })
    .returning();

  req.log.info({ accountId: account.id }, "Account registered");

  res.status(201).json({
    account: { id: account.id, username: account.username, email: account.email },
    token: session.token,
    expiresAt: session.expiresAt,
  });
});

// POST /api/auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { username, password } = parsed.data;

  const [account] = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.username, username))
    .limit(1);

  if (!account) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const valid = await bcrypt.compare(password, account.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = generateToken();
  const [session] = await db
    .insert(accountSessionsTable)
    .values({ accountId: account.id, token, expiresAt: sessionExpiry() })
    .returning();

  req.log.info({ accountId: account.id }, "Account logged in");

  res.json({
    account: { id: account.id, username: account.username, email: account.email },
    token: session.token,
    expiresAt: session.expiresAt,
  });
});

// POST /api/auth/logout
router.post("/auth/logout", accountAuth, async (req: Request, res): Promise<void> => {
  if (req.accountSessionId) {
    await db
      .delete(accountSessionsTable)
      .where(eq(accountSessionsTable.id, req.accountSessionId));
  }
  res.json({ ok: true });
});

// GET /api/auth/me — returns account info + active rooms
router.get("/auth/me", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;

  const playerRows = await db
    .select({ player: playersTable, room: roomsTable })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(
      and(
        eq(playersTable.accountId, account.id),
        eq(playersTable.isAi, false),
      ),
    );

  const activeRooms = playerRows
    .filter((r) => r.room.status !== "finished")
    .map((r) => ({
      roomId: r.room.id,
      inviteCode: r.room.inviteCode,
      status: r.room.status,
      sessionToken: r.player.sessionToken,
      playerId: r.player.id,
      isHost: r.player.isHost,
    }));

  res.json({
    id: account.id,
    username: account.username,
    email: account.email,
    createdAt: account.createdAt,
    activeRooms,
  });
});

// GET /api/auth/me/games — list active (non-finished, non-quit) rooms for this account
router.get("/auth/me/games", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;

  const playerRows = await db
    .select({
      player: playersTable,
      room: roomsTable,
    })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(
      and(
        eq(playersTable.accountId, account.id),
        eq(playersTable.isAi, false),
        isNull(playersTable.quitAt),
      ),
    );

  const activeRoomIds = playerRows
    .filter((r) => r.room.status !== "finished")
    .map((r) => r.room.id);

  // Fetch all human players for these rooms in one query (names + avatars for the roster)
  const roomPlayerRows = activeRoomIds.length > 0
    ? await db
        .select({
          roomId: playersTable.roomId,
          name: playersTable.name,
          avatarId: playersTable.avatarId,
        })
        .from(playersTable)
        .where(
          and(
            inArray(playersTable.roomId, activeRoomIds),
            eq(playersTable.isAi, false),
            isNull(playersTable.quitAt),
          ),
        )
    : [];

  // Group by roomId
  const playersByRoom = new Map<string, { name: string; avatarId: string | null }[]>();
  for (const p of roomPlayerRows) {
    const arr = playersByRoom.get(p.roomId) ?? [];
    arr.push({ name: p.name, avatarId: p.avatarId });
    playersByRoom.set(p.roomId, arr);
  }

  const activeGames = playerRows
    .filter((r) => r.room.status !== "finished")
    .map((r) => ({
      roomId: r.room.id,
      inviteCode: r.room.inviteCode,
      status: r.room.status,
      maxPlayers: r.room.maxPlayers,
      currentPlayers: playersByRoom.get(r.room.id)?.length ?? 1,
      humanPlayers: playersByRoom.get(r.room.id) ?? [],
      updatedAt: r.room.updatedAt,
      sessionToken: r.player.sessionToken,
      playerId: r.player.id,
      isHost: r.player.isHost,
      playerName: r.player.name,
      avatarId: r.player.avatarId,
    }));

  res.json({ games: activeGames });
});

// GET /api/auth/me/stats — lifetime stats and recent game history for this account
router.get("/auth/me/stats", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;

  // Find all finished rooms where this account had a human player
  const finishedRows = await db
    .select({
      player: playersTable,
      room: roomsTable,
    })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(
      and(
        eq(playersTable.accountId, account.id),
        eq(playersTable.isAi, false),
        eq(roomsTable.status, "finished"),
      ),
    )
    .orderBy(desc(roomsTable.updatedAt));

  if (finishedRows.length === 0) {
    res.json({
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      avgEminence: 0,
      recentGames: [],
    });
    return;
  }

  const roomIds = finishedRows.map((r) => r.room.id);

  // Load game states and human player counts for all finished rooms in parallel
  const [gameStateRows, humanPlayerCounts] = await Promise.all([
    db
      .select()
      .from(gameStatesTable)
      .where(inArray(gameStatesTable.roomId, roomIds)),
    db
      .select({ roomId: playersTable.roomId, count: count() })
      .from(playersTable)
      .where(
        and(
          inArray(playersTable.roomId, roomIds),
          eq(playersTable.isAi, false),
        ),
      )
      .groupBy(playersTable.roomId),
  ]);

  const gameStateByRoomId = new Map(gameStateRows.map((gs) => [gs.roomId, gs.state as Record<string, unknown>]));
  const humanCountByRoomId = new Map(humanPlayerCounts.map((r) => [r.roomId, Number(r.count)]));

  // Tally stats
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let totalEminence = 0;

  interface GameHistoryEntry {
    roomId: string;
    inviteCode: string;
    finishedAt: string;
    result: "win" | "loss" | "tie";
    eminenceEarned: number;
    totalPlayers: number;
  }

  const recentGames: GameHistoryEntry[] = [];

  for (const row of finishedRows) {
    const state = gameStateByRoomId.get(row.room.id);
    if (!state) continue;

    const winnerId = state.winnerId as string | null;
    const players = (state.players as Array<{ playerId: string; lumens: number }>) ?? [];

    const playerData = players.find((p) => p.playerId === row.player.id);
    const eminenceEarned = playerData?.lumens ?? 0;

    let result: "win" | "loss" | "tie";
    if (winnerId === null) {
      result = "tie";
      ties++;
    } else if (winnerId === row.player.id) {
      result = "win";
      wins++;
    } else {
      result = "loss";
      losses++;
    }

    totalEminence += eminenceEarned;

    recentGames.push({
      roomId: row.room.id,
      inviteCode: row.room.inviteCode,
      finishedAt: row.room.updatedAt.toISOString(),
      result,
      eminenceEarned,
      totalPlayers: humanCountByRoomId.get(row.room.id) ?? players.length,
    });
  }

  const gamesPlayed = wins + losses + ties;
  const avgEminence = gamesPlayed > 0 ? totalEminence / gamesPlayed : 0;

  res.json({
    gamesPlayed,
    wins,
    losses,
    ties,
    avgEminence: Math.round(avgEminence * 10) / 10,
    recentGames: recentGames.slice(0, 20),
  });
});

// GET /api/auth/me/preferences
router.get("/auth/me/preferences", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  res.json({
    skipCinematics: account.skipCinematics,
    abridgedAnims: account.abridgedAnims,
    hintsEnabled: account.hintsEnabled,
    muted: account.muted,
  });
});

// PATCH /api/auth/me/preferences
const PreferencesBody = z.object({
  skipCinematics: z.boolean().optional(),
  abridgedAnims: z.boolean().optional(),
  hintsEnabled: z.boolean().optional(),
  muted: z.boolean().optional(),
});

router.patch("/auth/me/preferences", accountAuth, async (req: Request, res): Promise<void> => {
  const parsed = PreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const account = req.account!;
  const { skipCinematics, abridgedAnims, hintsEnabled, muted } = parsed.data;

  const updates: Partial<typeof accountsTable.$inferInsert> = {};
  if (skipCinematics !== undefined) updates.skipCinematics = skipCinematics;
  if (abridgedAnims !== undefined) updates.abridgedAnims = abridgedAnims;
  if (hintsEnabled !== undefined) updates.hintsEnabled = hintsEnabled;
  if (muted !== undefined) updates.muted = muted;

  if (Object.keys(updates).length > 0) {
    await db
      .update(accountsTable)
      .set(updates)
      .where(eq(accountsTable.id, account.id));
  }

  res.json({ ok: true });
});

export default router;
