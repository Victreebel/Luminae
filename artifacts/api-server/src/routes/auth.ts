import { Router, type IRouter } from "express";
import { eq, and, gt, inArray, isNull, count } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  accountsTable,
  accountSessionsTable,
  playersTable,
  roomsTable,
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

  const activePlayers = await db
    .select({ roomId: playersTable.roomId, count: count() })
    .from(playersTable)
    .where(
      and(
        eq(playersTable.isAi, false),
        isNull(playersTable.quitAt),
      ),
    )
    .groupBy(playersTable.roomId);

  const playerCountByRoom = new Map(activePlayers.map((r) => [r.roomId, Number(r.count)]));

  const activeGames = playerRows
    .filter((r) => r.room.status !== "finished")
    .map((r) => ({
      roomId: r.room.id,
      inviteCode: r.room.inviteCode,
      status: r.room.status,
      maxPlayers: r.room.maxPlayers,
      currentPlayers: playerCountByRoom.get(r.room.id) ?? 1,
      updatedAt: r.room.updatedAt,
      sessionToken: r.player.sessionToken,
      playerId: r.player.id,
      isHost: r.player.isHost,
      playerName: r.player.name,
      avatarId: r.player.avatarId,
    }));

  res.json({ games: activeGames });
});

export default router;
