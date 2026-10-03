import { Router, type IRouter } from "express";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  accountsTable,
  accountSessionsTable,
  accountBlueprintClearanceTable,
  accountDeletionRequestsTable,
  accountLumiiRelationshipMemoriesTable,
  playersTable,
  roomsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { accountAuth } from "../lib/accountAuth";
import { buildAccountArchiveFromPersistedStats } from "../lib/accountArchive";
import { ensureAccountProgressBackfilled, readAccountProgress } from "../lib/accountProgress";
import { getEquippedCosmeticItems } from "../lib/accountCosmetics";
import {
  isLumiiThresholdDialoguePathPrefix,
  normalizeLumiiThresholdDialoguePath,
  normalizeLumiiThresholdDialogueResolution,
} from "../lib/blueprintClearance";
import {
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  CIVILIZATION_RECORD_VERSION,
  isArchitectFirstContactStance,
  summarizeCivilizationRecord,
  type CivilizationRecord,
} from "@workspace/game-types";
import type { Request } from "express";
import { rateLimit } from "../lib/httpSecurity";
import { getRoomEventFrequency } from "../lib/roomEventSettings";

const router: IRouter = Router();

const SALT_ROUNDS = 10;
const SESSION_DAYS = 30;
const FIRST_CONTACT_MEMORY_SOURCE_ID = "00000000-0000-4000-8000-000000000001";
const FIRST_CONTACT_MEMORY_KEY = "first_contact_stance";

type AccountClearanceRow = typeof accountBlueprintClearanceTable.$inferSelect | undefined;

function hasVaultThresholdAccess(clearance: AccountClearanceRow): boolean {
  return Boolean(clearance) && (
    clearance!.qualifyingWins >= BLUEPRINT_CLEARANCE_REQUIRED_WINS ||
    clearance!.decryptionKeyBypassActiveAt != null
  );
}

function publicClearanceStatus(clearance: AccountClearanceRow) {
  if (clearance?.status === "cleared" || clearance?.status === "challenge_active") return clearance.status;
  if (clearance?.status === "challenge_ready" && hasVaultThresholdAccess(clearance)) return "challenge_ready";
  return "classified" as const;
}

function publicCipherDeactivated(clearance: AccountClearanceRow): boolean {
  return Boolean(clearance?.cipherDeactivatedAt && clearance.qualifyingWins >= BLUEPRINT_CLEARANCE_REQUIRED_WINS);
}

function publicThresholdRuptured(clearance: AccountClearanceRow): boolean {
  return Boolean(
    (clearance?.thresholdRupturedAt ?? clearance?.covenantBrokenAt) &&
    hasVaultThresholdAccess(clearance),
  );
}

function storedCivilizationRecord(value: unknown): CivilizationRecord | null {
  const version = typeof value === "object" && value !== null
    ? (value as { version?: unknown }).version
    : null;
  return typeof value === "object" && value !== null &&
    (version === 1 || version === CIVILIZATION_RECORD_VERSION)
    ? value as CivilizationRecord
    : null;
}

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
router.post("/auth/register", rateLimit({ scope: "register", max: 8, windowMs: 15 * 60_000 }), async (req, res): Promise<void> => {
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
router.post("/auth/login", rateLimit({ scope: "login", max: 12, windowMs: 15 * 60_000 }), async (req, res): Promise<void> => {
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

  const [cancelledDeletion] = await db
    .update(accountDeletionRequestsTable)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(
      eq(accountDeletionRequestsTable.accountId, account.id),
      eq(accountDeletionRequestsTable.status, "pending"),
    ))
    .returning({ id: accountDeletionRequestsTable.id });

  const token = generateToken();
  const [session] = await db
    .insert(accountSessionsTable)
    .values({ accountId: account.id, token, expiresAt: sessionExpiry() })
    .returning();

  req.log.info({ accountId: account.id, deletionCancelled: Boolean(cancelledDeletion) }, "Account logged in");

  res.json({
    account: { id: account.id, username: account.username, email: account.email },
    token: session.token,
    expiresAt: session.expiresAt,
    deletionCancelled: Boolean(cancelledDeletion),
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

  await ensureAccountProgressBackfilled(account.id);

  const [playerRows, clearanceRows, cosmeticLoadout] = await Promise.all([
    db
      .select({ player: playersTable, room: roomsTable })
      .from(playersTable)
      .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
      .where(
        and(
          eq(playersTable.accountId, account.id),
          eq(playersTable.isAi, false),
        ),
      ),
    db
      .select()
      .from(accountBlueprintClearanceTable)
      .where(eq(accountBlueprintClearanceTable.accountId, account.id))
      .limit(1),
    getEquippedCosmeticItems(account.id),
  ]);
  const clearance = clearanceRows[0];
  const thresholdApproach = clearance?.thresholdApproach === "kinship" ||
    clearance?.thresholdApproach === "inquiry" ||
    clearance?.thresholdApproach === "dominion"
    ? clearance.thresholdApproach
    : null;
  const storedDialoguePath = normalizeLumiiThresholdDialoguePath(clearance?.thresholdDialoguePath);
  const thresholdDialoguePath = thresholdApproach && isLumiiThresholdDialoguePathPrefix(
    thresholdApproach,
    storedDialoguePath,
  ) ? storedDialoguePath : [];
  const visibleCosmeticLoadout = clearance?.status === "cleared"
    ? cosmeticLoadout
    : cosmeticLoadout.filter((item) => item.slot !== "blueprint_presentation");

  const activeRooms = playerRows
    .filter((r) => r.room.status !== "finished")
    .map((r) => ({
      roomId: r.room.id,
      inviteCode: r.room.inviteCode,
      status: r.room.status,
      sessionToken: r.player.sessionToken,
      playerId: r.player.id,
      isHost: r.player.isHost,
      gameMode: r.room.gameMode,
      eventFrequency: getRoomEventFrequency(r.room),
      scenarioId: r.room.scenarioId,
    }));

  res.json({
    id: account.id,
    username: account.username,
    email: account.email,
    createdAt: account.createdAt,
    clearance: {
      qualifyingWins: clearance?.qualifyingWins ?? 0,
      requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      status: publicClearanceStatus(clearance),
      challengeRoomId: clearance?.challengeRoomId ?? null,
      cipherDeactivated: publicCipherDeactivated(clearance),
      thresholdApproach,
      thresholdDialoguePath,
      thresholdDialogueResolution: thresholdApproach
        ? normalizeLumiiThresholdDialogueResolution(clearance?.thresholdDialogueResolution)
        : null,
      thresholdRuptured: publicThresholdRuptured(clearance),
      covenantBroken: publicThresholdRuptured(clearance),
      decryptionKeyBypassActive: clearance?.decryptionKeyBypassActiveAt != null,
      revealPending: clearance?.status === "cleared" && clearance.completedAt != null && clearance.vaultRevealSeenAt == null,
    },
    cosmeticLoadout: visibleCosmeticLoadout,
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
      eventFrequency: getRoomEventFrequency(r.room),
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
  const progress = await readAccountProgress(account.id);
  const roomIds = [...new Set(progress.matchHistory.map((match) => match.roomId))];
  const rooms = roomIds.length > 0
    ? await db.select({ id: roomsTable.id, inviteCode: roomsTable.inviteCode })
      .from(roomsTable)
      .where(inArray(roomsTable.id, roomIds))
    : [];
  const inviteCodes = new Map(rooms.map((room) => [room.id, room.inviteCode]));
  const archive = buildAccountArchiveFromPersistedStats({
    artifacts: progress.artifactStats,
    luminaries: progress.luminaryStats,
    chronicles: progress.chronicleUnlocks,
    qualifyingWins: progress.clearance?.qualifyingWins ?? 0,
    clearanceStatus: publicClearanceStatus(progress.clearance),
    challengeRoomId: progress.clearance?.challengeRoomId ?? null,
  });
  const summary = progress.summary;
  const gamesPlayed = summary?.gamesPlayed ?? 0;
  const recentGames = progress.matchHistory.map((match) => ({
    roomId: match.roomId,
    inviteCode: inviteCodes.get(match.roomId) ?? "ARCHIVED",
    finishedAt: match.finishedAt.toISOString(),
    result: match.result as "win" | "loss" | "tie",
    eminenceEarned: match.eminence,
    totalPlayers: match.totalPlayers,
    civilizationRecord: summarizeCivilizationRecord(
      storedCivilizationRecord(match.civilizationRecord),
    ),
  }));
  const avgEminence = gamesPlayed > 0
    ? (summary?.totalEminence ?? 0) / gamesPlayed
    : 0;

  res.json({
    gamesPlayed,
    wins: summary?.wins ?? 0,
    losses: summary?.losses ?? 0,
    ties: summary?.ties ?? 0,
    avgEminence: Math.round(avgEminence * 10) / 10,
    totalLume: summary?.totalLume ?? 0,
    recentGames: recentGames.slice(0, 20),
    matchHistory: recentGames,
    archive,
  });
});

// GET /api/auth/me/preferences
router.get("/auth/me/preferences", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  const [firstContactMemory] = await db
    .select({ detail: accountLumiiRelationshipMemoriesTable.detail })
    .from(accountLumiiRelationshipMemoriesTable)
    .where(and(
      eq(accountLumiiRelationshipMemoriesTable.accountId, account.id),
      eq(accountLumiiRelationshipMemoriesTable.sourceKind, "tutorial"),
      eq(accountLumiiRelationshipMemoriesTable.sourceRecordId, FIRST_CONTACT_MEMORY_SOURCE_ID),
      eq(accountLumiiRelationshipMemoriesTable.memoryKey, FIRST_CONTACT_MEMORY_KEY),
    ))
    .limit(1);
  res.json({
    skipCinematics: account.skipCinematics,
    abridgedAnims: account.abridgedAnims,
    hintsEnabled: account.hintsEnabled,
    muted: account.muted,
    hintsSeen: account.hintsSeen ?? [],
    tutorialSeen: account.tutorialSeen ?? false,
    tutorialCompleted: account.tutorialCompleted ?? false,
    firstContactStance: isArchitectFirstContactStance(firstContactMemory?.detail)
      ? firstContactMemory.detail
      : null,
  });
});

// PATCH /api/auth/me/preferences
const PreferencesBody = z.object({
  skipCinematics: z.boolean().optional(),
  abridgedAnims: z.boolean().optional(),
  hintsEnabled: z.boolean().optional(),
  muted: z.boolean().optional(),
  hintsSeen: z.array(z.string()).optional(),
  tutorialSeen: z.boolean().optional(),
}).strict();

router.patch("/auth/me/preferences", accountAuth, async (req: Request, res): Promise<void> => {
  const parsed = PreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const account = req.account!;
  const {
    skipCinematics,
    abridgedAnims,
    hintsEnabled,
    muted,
    hintsSeen,
    tutorialSeen,
  } = parsed.data;

  const updates: Partial<typeof accountsTable.$inferInsert> = {};
  if (skipCinematics !== undefined) updates.skipCinematics = skipCinematics;
  if (abridgedAnims !== undefined) updates.abridgedAnims = abridgedAnims;
  if (hintsEnabled !== undefined) updates.hintsEnabled = hintsEnabled;
  if (muted !== undefined) updates.muted = muted;
  if (hintsSeen !== undefined) updates.hintsSeen = hintsSeen;
  if (tutorialSeen !== undefined) updates.tutorialSeen = tutorialSeen;

  if (Object.keys(updates).length > 0) {
    await db
      .update(accountsTable)
      .set(updates)
      .where(eq(accountsTable.id, account.id));
  }

  res.json({ ok: true });
});

const DeleteAccountBody = z.object({ password: z.string().min(1).max(200) });

router.delete(
  "/auth/me",
  accountAuth,
  rateLimit({ scope: "account-delete", max: 3, windowMs: 60 * 60_000 }),
  async (req: Request, res): Promise<void> => {
    const parsed = DeleteAccountBody.safeParse(req.body);
    if (!parsed.success || !await bcrypt.compare(parsed.data.password, req.account!.passwordHash)) {
      res.status(401).json({ error: "Password confirmation failed" });
      return;
    }
    const now = new Date();
    const executeAfter = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
    await db.insert(accountDeletionRequestsTable).values({
      accountId: req.account!.id,
      status: "pending",
      requestedAt: now,
      executeAfter,
      cancelledAt: null,
      completedAt: null,
    }).onConflictDoUpdate({
      target: accountDeletionRequestsTable.accountId,
      set: { status: "pending", requestedAt: now, executeAfter, cancelledAt: null, completedAt: null },
    });
    await db.delete(accountSessionsTable).where(eq(accountSessionsTable.accountId, req.account!.id));
    req.log.info({ accountId: req.account!.id, executeAfter }, "Account deletion scheduled");
    res.status(202).json({ ok: true, executeAfter: executeAfter.toISOString() });
  },
);

export default router;
