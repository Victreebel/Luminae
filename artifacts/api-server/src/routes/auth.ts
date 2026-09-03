import { Router, type IRouter } from "express";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  accountsTable,
  accountSessionsTable,
  accountBlueprintClearanceTable,
  playersTable,
  roomsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
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
  ARTIFACT_IDS,
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  BLUEPRINT_DEFINITIONS,
  BLUEPRINT_IDS,
  LUMINARY_IDS,
  NATURAL_AFFINITY_KEYS,
  TECHNOLOGY_LINEAGES,
  type CivilizationIdentitySelection,
  type CivilizationIdentitySummary,
} from "@workspace/game-types";
import {
  readAccountCivilizationIdentity,
  validateCivilizationIdentitySelection,
  writeAccountCivilizationIdentity,
} from "../lib/accountIdentity";
import type { Request } from "express";
import {
  generateAccountSessionToken,
  hashAccountSessionToken,
} from "../lib/accountSessionTokens";

const router: IRouter = Router();

const SALT_ROUNDS = 10;
const SESSION_DAYS = 30;
const INVALID_PASSWORD_HASH = bcrypt.hashSync("luminae-invalid-account", SALT_ROUNDS);

type AccountClearanceRow = typeof accountBlueprintClearanceTable.$inferSelect | undefined;

function hasVaultThresholdAccess(clearance: AccountClearanceRow): boolean {
  return Boolean(clearance) && (
    clearance!.qualifyingWins >= BLUEPRINT_CLEARANCE_REQUIRED_WINS ||
    clearance!.decryptionKeyBypassActiveAt != null
  );
}

function publicClearanceStatus(clearance: AccountClearanceRow) {
  if (clearance?.status === "cleared" || clearance?.status === "challenge_active") return clearance.status;
  if (hasVaultThresholdAccess(clearance)) return "challenge_ready";
  return "classified" as const;
}

function publicCipherDeactivated(clearance: AccountClearanceRow): boolean {
  return Boolean(clearance?.cipherDeactivatedAt && clearance.qualifyingWins >= BLUEPRINT_CLEARANCE_REQUIRED_WINS);
}

function publicCovenantBroken(clearance: AccountClearanceRow): boolean {
  return Boolean(clearance?.covenantBrokenAt && hasVaultThresholdAccess(clearance));
}

function sessionExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DAYS);
  return d;
}

const RegisterBody = z.object({
  username: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  password: z.string().min(10).max(128),
  email: z.string().trim().toLowerCase().email().optional(),
}).strict();

const LoginBody = z.object({
  username: z.string().trim().min(1).max(32),
  password: z.string().min(1).max(128),
}).strict();

const CivilizationIdentityBody = z.object({
  lineage: z.enum(TECHNOLOGY_LINEAGES).nullable(),
  affinity: z.enum(NATURAL_AFFINITY_KEYS).nullable(),
  signatureArtifactId: z.string()
    .refine((value) => ARTIFACT_IDS.includes(value as typeof ARTIFACT_IDS[number]), "Unknown Artifact")
    .nullable(),
  signatureLuminaryId: z.enum(LUMINARY_IDS).nullable(),
  signatureBlueprintId: z.enum(BLUEPRINT_IDS).nullable(),
}).strict();

function asIdentitySnapshot(value: unknown): CivilizationIdentitySummary | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CivilizationIdentitySummary>;
  return typeof candidate.scaleType === "number" && typeof candidate.scaleLabel === "string"
    ? candidate as CivilizationIdentitySummary
    : null;
}

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

  const token = generateAccountSessionToken();
  const expiresAt = sessionExpiry();
  let account: typeof accountsTable.$inferSelect;

  try {
    account = await db.transaction(async (tx) => {
      const [createdAccount] = await tx
        .insert(accountsTable)
        .values({ username, email: email ?? null, passwordHash })
        .returning();
      await tx
        .insert(accountSessionsTable)
        .values({
          accountId: createdAccount.id,
          token: hashAccountSessionToken(token),
          expiresAt,
        });
      return createdAccount;
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      res.status(409).json({ error: "Username or email already in use" });
      return;
    }
    throw error;
  }

  req.log.info({ accountId: account.id }, "Account registered");

  res.status(201).json({
    account: { id: account.id, username: account.username, email: account.email },
    token,
    expiresAt,
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

  const valid = await bcrypt.compare(password, account?.passwordHash ?? INVALID_PASSWORD_HASH);
  if (!account || !valid) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = generateAccountSessionToken();
  const expiresAt = sessionExpiry();
  await db
    .insert(accountSessionsTable)
    .values({
      accountId: account.id,
      token: hashAccountSessionToken(token),
      expiresAt,
    });

  req.log.info({ accountId: account.id }, "Account logged in");

  res.json({
    account: { id: account.id, username: account.username, email: account.email },
    token,
    expiresAt,
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

  const [playerRows, clearanceRows, cosmeticLoadout, civilizationIdentity] = await Promise.all([
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
    readAccountCivilizationIdentity(account.id),
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
      scenarioId: r.room.scenarioId,
    }));

  res.json({
    id: account.id,
    username: account.username,
    email: account.email,
    createdAt: account.createdAt,
    clearance: {
      qualifyingWins: Math.min(clearance?.qualifyingWins ?? 0, BLUEPRINT_CLEARANCE_REQUIRED_WINS),
      requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      status: publicClearanceStatus(clearance),
      challengeRoomId: clearance?.challengeRoomId ?? null,
      cipherDeactivated: publicCipherDeactivated(clearance),
      thresholdApproach,
      thresholdDialoguePath,
      thresholdDialogueResolution: thresholdApproach
        ? normalizeLumiiThresholdDialogueResolution(clearance?.thresholdDialogueResolution)
        : null,
      covenantBroken: publicCovenantBroken(clearance),
      decryptionKeyBypassActive: clearance?.decryptionKeyBypassActiveAt != null,
      revealPending: clearance?.status === "cleared" && clearance.completedAt != null && clearance.vaultRevealSeenAt == null,
    },
    cosmeticLoadout: visibleCosmeticLoadout,
    civilizationIdentity,
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
    blueprints: progress.blueprintStats.map((entry) => ({
      blueprintId: entry.blueprintId as typeof BLUEPRINT_IDS[number],
      manifestationCount: entry.manifestations,
    })),
    qualifyingWins: progress.clearance?.qualifyingWins ?? 0,
    clearanceStatus: publicClearanceStatus(progress.clearance),
    challengeRoomId: progress.clearance?.challengeRoomId ?? null,
    identitySelection: progress.identitySelection,
    highestKardashevType: (progress.summary?.highestKardashevType ?? 0) as 0 | 1 | 2 | 3,
    revealedProjectNames: progress.blueprintStats
      .filter((entry) => entry.manifestations > 0 && entry.blueprintId in BLUEPRINT_DEFINITIONS)
      .map((entry) => BLUEPRINT_DEFINITIONS[entry.blueprintId as typeof BLUEPRINT_IDS[number]].name),
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
    civilizationIdentity: asIdentitySnapshot(match.civilizationIdentitySnapshot),
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
    recentGames: recentGames.slice(0, 20),
    matchHistory: recentGames,
    archive,
  });
});

// PUT /api/auth/me/civilization-identity — confirm an earned public identity.
router.put("/auth/me/civilization-identity", accountAuth, async (req: Request, res): Promise<void> => {
  const parsed = CivilizationIdentityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid identity" });
    return;
  }

  const account = req.account!;
  const progress = await readAccountProgress(account.id);
  const archive = buildAccountArchiveFromPersistedStats({
    artifacts: progress.artifactStats,
    luminaries: progress.luminaryStats,
    blueprints: progress.blueprintStats.map((entry) => ({
      blueprintId: entry.blueprintId as typeof BLUEPRINT_IDS[number],
      manifestationCount: entry.manifestations,
    })),
    qualifyingWins: progress.clearance?.qualifyingWins ?? 0,
    clearanceStatus: publicClearanceStatus(progress.clearance),
    challengeRoomId: progress.clearance?.challengeRoomId ?? null,
    identitySelection: progress.identitySelection,
    highestKardashevType: (progress.summary?.highestKardashevType ?? 0) as 0 | 1 | 2 | 3,
  });
  const selection = parsed.data as CivilizationIdentitySelection;
  const validationError = validateCivilizationIdentitySelection(selection, archive.identity.options);
  if (validationError) {
    res.status(403).json({ error: validationError });
    return;
  }

  await writeAccountCivilizationIdentity(account.id, selection);
  const civilizationIdentity = await readAccountCivilizationIdentity(account.id);
  res.json({ ok: true, civilizationIdentity });
});

// GET /api/auth/me/preferences
router.get("/auth/me/preferences", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  res.json({
    skipCinematics: account.skipCinematics,
    abridgedAnims: account.abridgedAnims,
    hintsEnabled: account.hintsEnabled,
    muted: account.muted,
    hintsSeen: account.hintsSeen ?? [],
    tutorialSeen: account.tutorialSeen ?? false,
    tutorialCompleted: account.tutorialCompleted ?? false,
  });
});

// PATCH /api/auth/me/preferences
const HINT_KEYS = [
  "luminae_swipe_hint_seen",
  "luminae_undo_hint_seen",
  "luminae_reserve_hint_seen",
  "luminae_deck_reserve_hint_seen",
  "luminae_forge_hint_seen",
] as const;
const PreferencesBody = z.object({
  skipCinematics: z.boolean().optional(),
  abridgedAnims: z.boolean().optional(),
  hintsEnabled: z.boolean().optional(),
  muted: z.boolean().optional(),
  hintsSeen: z.array(z.enum(HINT_KEYS)).max(HINT_KEYS.length)
    .transform((keys) => [...new Set(keys)])
    .optional(),
  tutorialSeen: z.boolean().optional(),
  tutorialCompleted: z.boolean().optional(),
}).strict();

router.patch("/auth/me/preferences", accountAuth, async (req: Request, res): Promise<void> => {
  const parsed = PreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const account = req.account!;
  const { skipCinematics, abridgedAnims, hintsEnabled, muted, hintsSeen, tutorialSeen, tutorialCompleted } = parsed.data;

  const updates: Partial<typeof accountsTable.$inferInsert> = {};
  if (skipCinematics !== undefined) updates.skipCinematics = skipCinematics;
  if (abridgedAnims !== undefined) updates.abridgedAnims = abridgedAnims;
  if (hintsEnabled !== undefined) updates.hintsEnabled = hintsEnabled;
  if (muted !== undefined) updates.muted = muted;
  if (hintsSeen !== undefined) updates.hintsSeen = hintsSeen;
  if (tutorialSeen !== undefined) updates.tutorialSeen = tutorialSeen;
  if (tutorialCompleted !== undefined) updates.tutorialCompleted = tutorialCompleted;

  if (Object.keys(updates).length > 0) {
    await db
      .update(accountsTable)
      .set(updates)
      .where(eq(accountsTable.id, account.id));
  }

  res.json({ ok: true });
});

export default router;
