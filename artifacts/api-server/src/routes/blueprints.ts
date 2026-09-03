import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import type { Request } from "express";
import { z } from "zod";
import {
  accountBlueprintClearanceTable,
  accountBlueprintLoadoutsTable,
  accountBlueprintStatsTable,
  accountBlueprintUnlocksTable,
  accountChronicleUnlocksTable,
  accountEntitlementsTable,
  db,
  gameStatesTable,
  playersTable,
  roomsTable,
} from "@workspace/db";
import {
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  BLUEPRINT_DEFINITIONS,
  BLUEPRINT_IDS,
  DEFAULT_VICTORY_REQUIREMENT,
  OUTER_VAULT_BLUEPRINT_IDS,
  CHRONICLE_DEFINITIONS,
  CHRONICLE_IDS,
  GAME_MODES,
  LUMII_THRESHOLD_DIALOGUE_CHOICE_IDS,
  type BlueprintId,
  type ChronicleId,
  type GameMode,
  type LumiiThresholdApproach,
} from "@workspace/game-types";
import { accountAuth } from "../lib/accountAuth";
import { getEquippedLuminaryArrivalSound } from "../lib/accountCosmetics";
import { BLACK_MARKET_DECRYPTION_KEY_ITEM_ID } from "../lib/storeCatalog";
import { ensureAccountProgressBackfilled } from "../lib/accountProgress";
import { readCampaignProgress } from "../lib/campaignChronicles";
import { runAiTurnsIfNeeded } from "../lib/aiTurnRunner";
import { GUIDED_LUMII_AVATAR_ID, pickUniqueAvatar } from "../lib/avatarAssignment";
import { completeFinishedGame } from "../lib/finishedGame";
import {
  formatGameState,
  initializeGame,
  normalizeState,
  parseAiDifficulty,
  type GameStateData,
} from "../lib/gameEngine";
import { withRoomLock } from "../lib/roomLock";
import { clearTurnTimer } from "../lib/turnTimer";
import {
  decideBlueprintThresholdAction,
  decideLumiiDialogueLeave,
  decideLumiiDialoguePathUpdate,
  freshLumiiEncounterMemory,
  isCompleteLumiiThresholdDialoguePath,
  isLumiiThresholdDialoguePathPrefix,
  normalizeLumiiThresholdDialoguePath,
  normalizeLumiiThresholdDialogueResolution,
} from "../lib/blueprintClearance";
import {
  filterStateForPlayer,
  getConnectedPlayerIds,
  sendToPlayer,
} from "../lib/websocket";

const router: IRouter = Router();

const CLEARANCE_SCENARIO_ID = "blueprint_clearance_lumii";
const SLOT_COUNT = 2;
const COMPETITIVE_BLUEPRINTS_ENABLED =
  process.env.BLUEPRINT_COMPETITIVE_ENABLED === "true";

function isChronicleId(value: string): value is ChronicleId {
  return (CHRONICLE_IDS as readonly string[]).includes(value);
}

const LoadoutBody = z.object({
  slots: z
    .array(z.enum(BLUEPRINT_IDS).nullable())
    .max(SLOT_COUNT)
    .transform((slots) => [slots[0] ?? null, slots[1] ?? null]),
});
const WithdrawalBody = z.object({ roomId: z.string().uuid() });
const ThresholdBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("deactivate_cipher") }),
  z.object({
    action: z.literal("choose_approach"),
    approach: z.enum(["kinship", "inquiry", "dominion"]),
  }),
  z.object({
    action: z.literal("record_dialogue_path"),
    path: z.array(z.enum(LUMII_THRESHOLD_DIALOGUE_CHOICE_IDS)).max(3),
  }),
  z.object({
    action: z.literal("resolve_dialogue"),
    resolution: z.literal("left"),
  }),
]);

class ChallengeAlreadyStartedError extends Error {}

type BlueprintClearanceRow = typeof accountBlueprintClearanceTable.$inferSelect;

function thresholdDialoguePathMatches(path: readonly string[]) {
  const lengthPredicate = sql`cardinality(${accountBlueprintClearanceTable.thresholdDialoguePath}) = ${path.length}`;
  if (path.length === 0) return lengthPredicate;
  return and(
    lengthPredicate,
    ...path.map((choice, index) =>
      sql`${accountBlueprintClearanceTable.thresholdDialoguePath}[${sql.raw(String(index + 1))}] = ${choice}`,
    ),
  );
}

function normalizeThresholdApproach(value: unknown): LumiiThresholdApproach | null {
  return value === "kinship" || value === "inquiry" || value === "dominion" ? value : null;
}

function thresholdDialogueState(clearance: BlueprintClearanceRow | undefined) {
  const thresholdApproach = normalizeThresholdApproach(clearance?.thresholdApproach);
  const storedPath = normalizeLumiiThresholdDialoguePath(clearance?.thresholdDialoguePath);
  const thresholdDialoguePath = thresholdApproach && isLumiiThresholdDialoguePathPrefix(thresholdApproach, storedPath)
    ? storedPath
    : [];
  return {
    thresholdApproach,
    thresholdDialoguePath,
    thresholdDialogueResolution: thresholdApproach
      ? normalizeLumiiThresholdDialogueResolution(clearance?.thresholdDialogueResolution)
      : null,
  };
}

function thresholdResult(clearance: BlueprintClearanceRow | undefined) {
  return {
    ok: true as const,
    status: publicClearanceStatus(clearance),
    cipherDeactivated: publicCipherDeactivated(clearance),
    decryptionKeyBypassActive: clearance?.decryptionKeyBypassActiveAt != null,
    ...thresholdDialogueState(clearance),
  };
}

function hasVaultThresholdAccess(clearance: BlueprintClearanceRow | undefined): boolean {
  return Boolean(clearance) && (
    clearance!.qualifyingWins >= BLUEPRINT_CLEARANCE_REQUIRED_WINS ||
    clearance!.decryptionKeyBypassActiveAt != null
  );
}

function hasCipherOpenForThreshold(clearance: BlueprintClearanceRow | undefined): boolean {
  return Boolean(clearance) && (
    clearance!.cipherDeactivatedAt != null ||
    clearance!.decryptionKeyBypassActiveAt != null
  );
}

function publicClearanceStatus(clearance: BlueprintClearanceRow | undefined) {
  if (clearance?.status === "cleared" || clearance?.status === "challenge_active") return clearance.status;
  if (clearance?.status === "challenge_ready" && hasVaultThresholdAccess(clearance)) return "challenge_ready";
  return "classified" as const;
}

function publicCipherDeactivated(clearance: BlueprintClearanceRow | undefined): boolean {
  return Boolean(clearance?.cipherDeactivatedAt && clearance.qualifyingWins >= BLUEPRINT_CLEARANCE_REQUIRED_WINS);
}

function publicThresholdRuptured(clearance: BlueprintClearanceRow | undefined): boolean {
  return Boolean(
    (clearance?.thresholdRupturedAt ?? clearance?.covenantBrokenAt) &&
    hasVaultThresholdAccess(clearance),
  );
}

async function clearDecryptionKeyBypassAfterExit(accountId: string): Promise<void> {
  await db
    .update(accountBlueprintClearanceTable)
    .set({
      status: sql`CASE
        WHEN ${accountBlueprintClearanceTable.qualifyingWins} >= ${BLUEPRINT_CLEARANCE_REQUIRED_WINS}
          THEN 'challenge_ready'
        ELSE 'classified'
      END`,
      challengeRoomId: null,
      ...freshLumiiEncounterMemory(),
      decryptionKeyBypassActiveAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(accountBlueprintClearanceTable.accountId, accountId),
        isNotNull(accountBlueprintClearanceTable.decryptionKeyBypassActiveAt),
      ),
    );
}

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function isBlueprintId(value: string): value is BlueprintId {
  return (BLUEPRINT_IDS as readonly string[]).includes(value);
}

function isLoadoutMode(value: string): value is Exclude<GameMode, "standard"> {
  return value === "campaign" || value === "custom" || value === "competitive";
}

function removeCard(state: GameStateData, cardId: string): void {
  for (const collection of [
    state.forgeTier1,
    state.forgeTier2,
    state.forgeTier3,
    state.deckTier1,
    state.deckTier2,
    state.deckTier3,
  ]) {
    const index = collection.indexOf(cardId);
    if (index >= 0) collection.splice(index, 1);
  }
}

function prependUnique(collection: string[], cardIds: readonly string[]): void {
  collection.unshift(...cardIds.filter((cardId) => !collection.includes(cardId)));
}

/**
 * Lumii receives a disclosed scenario advantage: three secured Antimatter
 * components, five starting Affinity, and a curated path through the Forge.
 * The components remain real cards and every Forge still follows normal rules.
 */
function configureClearanceScenario(
  state: GameStateData,
  lumiiPlayerId: string,
  thresholdApproach: LumiiThresholdApproach,
): void {
  const securedAntimatterComponents = ["t1r01", "t1p04", "t1r04"];
  const faceUpTier1 = ["t1r07", "t1s02", "t1s01", "t1o01"];
  const queuedTier1 = ["t1o05", "t1p06"];
  const faceUpTier2 = ["t2o01"];
  const curatedIds = [
    ...securedAntimatterComponents,
    ...faceUpTier1,
    ...queuedTier1,
    ...faceUpTier2,
  ];

  for (const cardId of curatedIds) removeCard(state, cardId);

  state.forgeTier1 = [...faceUpTier1, ...state.forgeTier1].slice(0, 4);
  prependUnique(state.deckTier1, queuedTier1);
  state.forgeTier2 = [...faceUpTier2, ...state.forgeTier2].slice(0, 4);

  const lumii = state.players.find((player) => player.playerId === lumiiPlayerId);
  if (!lumii) throw new Error("Lumii player missing from clearance scenario");
  lumii.reservedArtifactIds = [...securedAntimatterComponents];
  lumii.privateReservedArtifactIds = [...securedAntimatterComponents];
  lumii.affinities = {
    flare: 1,
    continuum: 1,
    verdance: 1,
    abyss: 1,
    radiance: 1,
    singularity: 0,
  };
  state.brokenCovenantDeclared = true;
  state.lumiiThresholdApproach = thresholdApproach;

  if (state.initialBoard) {
    state.initialBoard = {
      ...state.initialBoard,
      forgeTier1: [...state.forgeTier1],
      forgeTier2: [...state.forgeTier2],
      forgeTier3: [...state.forgeTier3],
      deckTier1: [...state.deckTier1],
      deckTier2: [...state.deckTier2],
      deckTier3: [...state.deckTier3],
    };
  }
}

async function getActiveChallenge(accountId: string) {
  const [clearance] = await db
    .select()
    .from(accountBlueprintClearanceTable)
    .where(eq(accountBlueprintClearanceTable.accountId, accountId))
    .limit(1);
  if (clearance?.status !== "challenge_active" || !clearance.challengeRoomId) {
    return null;
  }

  const [membership] = await db
    .select({ room: roomsTable, player: playersTable })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(
      and(
        eq(playersTable.accountId, accountId),
        eq(playersTable.roomId, clearance.challengeRoomId),
        eq(playersTable.isAi, false),
      ),
    )
    .limit(1);

  if (!membership) return null;
  if (membership.room.status === "finished") {
    const [stateRow] = await db
      .select({ state: gameStatesTable.state })
      .from(gameStatesTable)
      .where(eq(gameStatesTable.roomId, membership.room.id))
      .limit(1);
    if (stateRow) {
      await completeFinishedGame(membership.room.id, normalizeState(stateRow.state));
    }
    return null;
  }
  const legacyApproach: LumiiThresholdApproach = clearance.thresholdApproach === "kinship" ||
    clearance.thresholdApproach === "dominion"
    ? clearance.thresholdApproach
    : "inquiry";
  if (
    (clearance.thresholdRupturedAt ?? clearance.covenantBrokenAt) == null ||
    !hasCipherOpenForThreshold(clearance) ||
    clearance.thresholdApproach == null ||
    clearance.thresholdDialogueResolution !== "continued"
  ) {
    const now = new Date();
    const patch: Partial<typeof accountBlueprintClearanceTable.$inferInsert> = {
      thresholdRupturedAt: clearance.thresholdRupturedAt ?? clearance.covenantBrokenAt ?? now,
      covenantBrokenAt: clearance.covenantBrokenAt ?? now,
      thresholdApproach: clearance.thresholdApproach ?? legacyApproach,
      thresholdDialogueResolution: "continued",
      updatedAt: now,
    };
    if (clearance.cipherDeactivatedAt == null && clearance.decryptionKeyBypassActiveAt == null) {
      patch.cipherDeactivatedAt = clearance.warningSeenAt ?? now;
    }
    await db
      .update(accountBlueprintClearanceTable)
      .set(patch)
      .where(eq(accountBlueprintClearanceTable.accountId, accountId));
  }
  return {
    roomId: membership.room.id,
    inviteCode: membership.room.inviteCode,
    playerId: membership.player.id,
    sessionToken: membership.player.sessionToken,
    lumiiThresholdApproach: legacyApproach,
  };
}

router.get("/blueprints/vault", accountAuth, async (req: Request, res): Promise<void> => {
  const account = req.account!;
  await ensureAccountProgressBackfilled(account.id);

  const [clearanceRows, unlockRows, loadoutRows, statsRows, keyRows, chronicleRows, campaignProgress] = await Promise.all([
    db
      .select()
      .from(accountBlueprintClearanceTable)
      .where(eq(accountBlueprintClearanceTable.accountId, account.id))
      .limit(1),
    db
      .select()
      .from(accountBlueprintUnlocksTable)
      .where(eq(accountBlueprintUnlocksTable.accountId, account.id)),
    db
      .select()
      .from(accountBlueprintLoadoutsTable)
      .where(eq(accountBlueprintLoadoutsTable.accountId, account.id)),
    db
      .select()
      .from(accountBlueprintStatsTable)
      .where(eq(accountBlueprintStatsTable.accountId, account.id)),
    db
      .select({ id: accountEntitlementsTable.id })
      .from(accountEntitlementsTable)
      .where(
        and(
          eq(accountEntitlementsTable.accountId, account.id),
          eq(accountEntitlementsTable.itemId, BLACK_MARKET_DECRYPTION_KEY_ITEM_ID),
          isNull(accountEntitlementsTable.revokedAt),
        ),
      )
      .limit(1),
    db
      .select()
      .from(accountChronicleUnlocksTable)
      .where(eq(accountChronicleUnlocksTable.accountId, account.id)),
    readCampaignProgress(account.id),
  ]);

  const clearance = clearanceRows[0];
  const dialogueState = thresholdDialogueState(clearance);
  const cleared = clearance?.status === "cleared";
  const unlockedIds = unlockRows
    .map((row) => row.blueprintId)
    .filter(isBlueprintId);
  const loadouts = (["campaign", "custom", "competitive"] as const).map((mode) => ({
    mode,
    slots: Array.from({ length: SLOT_COUNT }, (_, slotIndex) => {
      const row = loadoutRows.find(
        (candidate) => candidate.mode === mode && candidate.slotIndex === slotIndex,
      );
      return row && isBlueprintId(row.blueprintId) ? row.blueprintId : null;
    }),
  }));
  const chronicleUnlockMap = new Map(
    chronicleRows
      .filter((row) => isChronicleId(row.chronicleId))
      .map((row) => [row.chronicleId, row]),
  );
  const chronicles = CHRONICLE_IDS.map((chronicleId) => {
    const definition = CHRONICLE_DEFINITIONS[chronicleId];
    const unlock = chronicleUnlockMap.get(chronicleId);
    return {
      id: chronicleId,
      title: definition.title,
      chapterLabel: definition.chapterLabel,
      summary: definition.summary,
      status: unlock ? "recovered" as const : "sealed" as const,
      unlockedAt: unlock?.unlockedAt.toISOString() ?? null,
      relatedBlueprintIds: [...definition.relatedBlueprintIds],
    };
  });

  res.json({
    clearance: {
      qualifyingWins: clearance?.qualifyingWins ?? 0,
      requiredWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      status: publicClearanceStatus(clearance),
      challengeRoomId: clearance?.challengeRoomId ?? null,
      warningSeen: clearance?.warningSeenAt !== null && clearance?.warningSeenAt !== undefined,
      cipherDeactivated: publicCipherDeactivated(clearance),
      ...dialogueState,
      thresholdRuptured: publicThresholdRuptured(clearance),
      covenantBroken: publicThresholdRuptured(clearance),
      decryptionKeyBypassActive: clearance?.decryptionKeyBypassActiveAt != null,
      revealPending: cleared && clearance?.completedAt != null && clearance?.vaultRevealSeenAt == null,
    },
    decryptionKeyAvailable: keyRows.length > 0,
    slotCount: SLOT_COUNT,
    competitiveEnabled: COMPETITIVE_BLUEPRINTS_ENABLED,
    unlockedBlueprintIds: cleared ? unlockedIds : [],
    blueprints: cleared
      ? unlockedIds.map((blueprintId) => BLUEPRINT_DEFINITIONS[blueprintId])
      : [],
    corruptedRecordCount: cleared
      ? OUTER_VAULT_BLUEPRINT_IDS.filter((blueprintId) => !unlockedIds.includes(blueprintId)).length
      : null,
    campaignNodes: cleared && unlockedIds.includes("bp_antimatter_detonator")
      ? [{
          id: "campaign_antimatter_first_charge",
          blueprintId: "bp_antimatter_detonator",
          title: "The First Charge",
          status: "pending_release",
        }]
      : [],
    campaignProgress,
    loadouts: cleared ? loadouts : [],
    mastery: cleared
      ? statsRows.filter((row) => isBlueprintId(row.blueprintId))
      : [],
    chronicles: cleared ? chronicles : [],
  });
});

router.post(
  "/blueprints/vault/decryption-key",
  accountAuth,
  async (req: Request, res): Promise<void> => {
    const account = req.account!;
    await ensureAccountProgressBackfilled(account.id);

    const result = await db.transaction(async (tx) => {
      const [clearance] = await tx
        .select()
        .from(accountBlueprintClearanceTable)
        .where(eq(accountBlueprintClearanceTable.accountId, account.id))
        .limit(1);

      if (!clearance || clearance.status === "cleared") {
        return { ok: false as const, status: 409, error: "The Blueprint Vault is already open" };
      }
      if (clearance.status === "challenge_active") {
        return { ok: false as const, status: 409, error: "The defense forecast is already active" };
      }
      if (clearance.qualifyingWins >= BLUEPRINT_CLEARANCE_REQUIRED_WINS) {
        return { ok: false as const, status: 409, error: "Your Architect record already opens the threshold" };
      }
      if (clearance.decryptionKeyBypassActiveAt != null) {
        return { ok: true as const, alreadyActive: true };
      }

      const [entitlement] = await tx
        .select({ id: accountEntitlementsTable.id })
        .from(accountEntitlementsTable)
        .where(
          and(
            eq(accountEntitlementsTable.accountId, account.id),
            eq(accountEntitlementsTable.itemId, BLACK_MARKET_DECRYPTION_KEY_ITEM_ID),
            isNull(accountEntitlementsTable.revokedAt),
          ),
        )
        .limit(1);
      if (!entitlement) {
        return { ok: false as const, status: 403, error: "No Black Market Decryption Key is available" };
      }

      const now = new Date();
      const [consumed] = await tx
        .update(accountEntitlementsTable)
        .set({ revokedAt: now })
        .where(
          and(
            eq(accountEntitlementsTable.id, entitlement.id),
            isNull(accountEntitlementsTable.revokedAt),
          ),
        )
        .returning({ id: accountEntitlementsTable.id });
      if (!consumed) {
        const [concurrent] = await tx
          .select({ activeAt: accountBlueprintClearanceTable.decryptionKeyBypassActiveAt })
          .from(accountBlueprintClearanceTable)
          .where(eq(accountBlueprintClearanceTable.accountId, account.id))
          .limit(1);
        if (concurrent?.activeAt != null) return { ok: true as const, alreadyActive: true };
        return { ok: false as const, status: 409, error: "That decryption key has already been spent" };
      }

      await tx
        .update(accountBlueprintClearanceTable)
        .set({
          status: "challenge_ready",
          challengeRoomId: null,
          ...freshLumiiEncounterMemory(),
          decryptionKeyBypassActiveAt: now,
          updatedAt: now,
        })
        .where(eq(accountBlueprintClearanceTable.accountId, account.id));
      return { ok: true as const, alreadyActive: false };
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({
      ok: true,
      status: "challenge_ready",
      alreadyActive: result.alreadyActive,
      decryptionKeyAvailable: false,
      decryptionKeyBypassActive: true,
    });
  },
);

router.post(
  "/blueprints/vault/threshold",
  accountAuth,
  async (req: Request, res): Promise<void> => {
    const parsed = ThresholdBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "A valid Vault threshold action is required" });
      return;
    }

    const account = req.account!;
    await ensureAccountProgressBackfilled(account.id);
    const campaignProgress = await readCampaignProgress(account.id);
    if (!campaignProgress.thresholdAvailable) {
      res.status(403).json({ error: "Complete the three opening Chronicles before approaching the Threshold" });
      return;
    }
    const readClearance = async () => {
      const [row] = await db
        .select()
        .from(accountBlueprintClearanceTable)
        .where(eq(accountBlueprintClearanceTable.accountId, account.id))
        .limit(1);
      return row;
    };
    let clearance = await readClearance();
    if (!hasVaultThresholdAccess(clearance)) {
      res.status(403).json({ error: "The Supreme Cipher has not accepted your record" });
      return;
    }

    const currentApproach = normalizeThresholdApproach(clearance.thresholdApproach);

    if (parsed.data.action === "record_dialogue_path") {
      const requestedPath = parsed.data.path;
      if (!hasCipherOpenForThreshold(clearance)) {
        res.status(409).json({ error: "The Supreme Cipher is still active" });
        return;
      }
      if (!currentApproach) {
        res.status(409).json({ error: "Choose how you will approach Lumii first" });
        return;
      }
      const currentPath = normalizeLumiiThresholdDialoguePath(clearance.thresholdDialoguePath);
      const decision = decideLumiiDialoguePathUpdate(
        {
          approach: currentApproach,
          path: currentPath,
          resolution: normalizeLumiiThresholdDialogueResolution(clearance.thresholdDialogueResolution),
        },
        requestedPath,
      );
      if (!decision.ok) {
        res.status(decision.status).json({ error: decision.error });
        return;
      }
      if (decision.writePath) {
        const [updated] = await db
          .update(accountBlueprintClearanceTable)
          .set({ thresholdDialoguePath: decision.writePath, updatedAt: new Date() })
          .where(
            and(
              eq(accountBlueprintClearanceTable.accountId, account.id),
              thresholdDialoguePathMatches(currentPath),
              isNull(accountBlueprintClearanceTable.thresholdDialogueResolution),
            ),
          )
          .returning({ accountId: accountBlueprintClearanceTable.accountId });
        clearance = await readClearance();
        const persistedPath = normalizeLumiiThresholdDialoguePath(clearance?.thresholdDialoguePath);
        const isIdempotentRepeat = persistedPath.length === requestedPath.length &&
          persistedPath.every((entry, index) => entry === requestedPath[index]);
        if (!updated && !isIdempotentRepeat) {
          res.status(409).json({ error: "Another response has already been remembered" });
          return;
        }
      }
      res.json(thresholdResult(clearance));
      return;
    }

    if (parsed.data.action === "resolve_dialogue") {
      const currentResolution = normalizeLumiiThresholdDialogueResolution(
        clearance.thresholdDialogueResolution,
      );
      const decision = currentApproach && currentResolution !== "continued"
        ? decideLumiiDialogueLeave(currentResolution)
        : { ok: true as const, writeResolution: null };
      if (!decision.ok) {
        res.status(decision.status).json({ error: decision.error });
        return;
      }
      if (decision.writeResolution) {
        const [updated] = await db
          .update(accountBlueprintClearanceTable)
          .set({ thresholdDialogueResolution: decision.writeResolution, updatedAt: new Date() })
          .where(
            and(
              eq(accountBlueprintClearanceTable.accountId, account.id),
              isNull(accountBlueprintClearanceTable.thresholdDialogueResolution),
            ),
          )
          .returning({ accountId: accountBlueprintClearanceTable.accountId });
        clearance = await readClearance();
        if (!updated && clearance?.thresholdDialogueResolution !== "left") {
          res.status(409).json({ error: "The threshold exchange has already changed" });
          return;
        }
      }
      await clearDecryptionKeyBypassAfterExit(account.id);
      clearance = await readClearance();
      res.json(thresholdResult(clearance));
      return;
    }

    const decision = decideBlueprintThresholdAction(
      {
        cipherDeactivated: hasCipherOpenForThreshold(clearance),
        thresholdApproach: currentApproach,
      },
      parsed.data,
    );
    if (!decision.ok) {
      res.status(decision.status).json({ error: decision.error });
      return;
    }

    if (decision.writeCipher && clearance.decryptionKeyBypassActiveAt == null) {
      const now = new Date();
      await db
        .update(accountBlueprintClearanceTable)
        .set({
          cipherDeactivatedAt: now,
          warningSeenAt: clearance.warningSeenAt ?? now,
          updatedAt: now,
        })
        .where(eq(accountBlueprintClearanceTable.accountId, account.id));
      clearance = await readClearance();
    }
    if (parsed.data.action === "deactivate_cipher") {
      res.json(thresholdResult(clearance));
      return;
    }

    if (decision.writeApproach) {
      await db
        .update(accountBlueprintClearanceTable)
        .set({ thresholdApproach: decision.writeApproach, updatedAt: new Date() })
        .where(
          and(
            eq(accountBlueprintClearanceTable.accountId, account.id),
            isNull(accountBlueprintClearanceTable.thresholdApproach),
          ),
        );
      clearance = await readClearance();
    }
    if (clearance?.thresholdApproach !== parsed.data.approach) {
      res.status(409).json({ error: "Your approach at this threshold has already been recorded" });
      return;
    }
    res.json(thresholdResult(clearance));
  },
);

router.post(
  "/blueprints/vault/reveal-ack",
  accountAuth,
  async (req: Request, res): Promise<void> => {
    const account = req.account!;
    await ensureAccountProgressBackfilled(account.id);
    const updated = await db
      .update(accountBlueprintClearanceTable)
      .set({ vaultRevealSeenAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(accountBlueprintClearanceTable.accountId, account.id),
          eq(accountBlueprintClearanceTable.status, "cleared"),
        ),
      )
      .returning({ accountId: accountBlueprintClearanceTable.accountId });
    if (updated.length === 0) {
      res.status(403).json({ error: "The Vault has not opened" });
      return;
    }
    res.json({ ok: true });
  },
);

router.post(
  "/blueprints/clearance-challenge",
  accountAuth,
  async (req: Request, res): Promise<void> => {
    const account = req.account!;
    await ensureAccountProgressBackfilled(account.id);

    const active = await getActiveChallenge(account.id);
    if (active) {
      res.json({
        ...active,
        resumed: true,
        scenarioId: CLEARANCE_SCENARIO_ID,
        campaignAssistance:
          "Lumii begins with five Affinity, three sealed protocols, and a curated Forge path.",
      });
      return;
    }

    const campaignProgress = await readCampaignProgress(account.id);
    if (!campaignProgress.thresholdAvailable) {
      res.status(403).json({ error: "Complete the three opening Chronicles before confronting Lumii" });
      return;
    }

    await db
      .update(accountBlueprintClearanceTable)
      .set({ status: "challenge_ready", challengeRoomId: null, updatedAt: new Date() })
      .where(
        and(
          eq(accountBlueprintClearanceTable.accountId, account.id),
          eq(accountBlueprintClearanceTable.status, "challenge_active"),
        ),
      );

    const [clearance] = await db
      .select()
      .from(accountBlueprintClearanceTable)
      .where(eq(accountBlueprintClearanceTable.accountId, account.id))
      .limit(1);
    if (!hasVaultThresholdAccess(clearance)) {
      res.status(403).json({ error: "The Supreme Cipher has not accepted your record" });
      return;
    }
    if (clearance.status === "cleared") {
      res.status(409).json({ error: "The Blueprint Vault is already open" });
      return;
    }
    if (clearance.status !== "challenge_ready") {
      res.status(409).json({ error: "The defense forecast is unavailable" });
      return;
    }
    if (!hasCipherOpenForThreshold(clearance)) {
      res.status(409).json({ error: "The Supreme Cipher is still active" });
      return;
    }
    const thresholdApproach = clearance.thresholdApproach;
    if (
      thresholdApproach !== "kinship" &&
      thresholdApproach !== "inquiry" &&
      thresholdApproach !== "dominion"
    ) {
      res.status(409).json({ error: "Choose how you will approach Lumii first" });
      return;
    }
    const thresholdDialoguePath = normalizeLumiiThresholdDialoguePath(clearance.thresholdDialoguePath);
    const thresholdDialogueResolution = normalizeLumiiThresholdDialogueResolution(
      clearance.thresholdDialogueResolution,
    );
    if (
      thresholdDialogueResolution === null &&
      !isCompleteLumiiThresholdDialoguePath(thresholdApproach, thresholdDialoguePath)
    ) {
      res.status(409).json({ error: "Finish your exchange with Lumii first" });
      return;
    }
    const luminaryArrivalSound = await getEquippedLuminaryArrivalSound(account.id);

    try {
      const challenge = await db.transaction(async (tx) => {
        const inviteCode = generateInviteCode();
        const playerSessionToken = generateSessionToken();
        const lumiiSessionToken = `ai-${generateSessionToken()}`;

        const [room] = await tx
          .insert(roomsTable)
          .values({
            inviteCode,
            status: "playing",
            maxPlayers: 2,
            victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
            cinematicMode: "epic",
            gameMode: "campaign",
            scenarioId: CLEARANCE_SCENARIO_ID,
            blueprintPolicy: "scenario",
            turnTimerSeconds: null,
          })
          .returning();

        const [player] = await tx
          .insert(playersTable)
          .values({
            roomId: room.id,
            accountId: account.id,
            name: account.username,
            sessionToken: playerSessionToken,
            isHost: true,
            orderIndex: 0,
            isConnected: false,
            isAi: false,
            avatarId: pickUniqueAvatar(null, [GUIDED_LUMII_AVATAR_ID]),
          })
          .returning();

        const [lumii] = await tx
          .insert(playersTable)
          .values({
            roomId: room.id,
            name: "Lumii",
            sessionToken: lumiiSessionToken,
            isHost: false,
            orderIndex: 1,
            isConnected: true,
            isAi: true,
            aiDifficulty: "hard",
            avatarId: GUIDED_LUMII_AVATAR_ID,
          })
          .returning();

        await tx
          .update(roomsTable)
          .set({ hostPlayerId: player.id, updatedAt: new Date() })
          .where(eq(roomsTable.id, room.id));

        const state = initializeGame(
          [
            {
              id: player.id,
              name: player.name,
              luminaryArrivalSound,
            },
            { id: lumii.id, name: lumii.name },
          ],
          2,
          15,
          "epic",
          {
            blueprintSetups: {
              [lumii.id]: {
                blueprintIds: [...OUTER_VAULT_BLUEPRINT_IDS],
                presentationVariants: {
                  bp_antimatter_detonator: "armored",
                },
              },
            },
          },
        );
        state.turnTimerSeconds = null;
        state.turnDeadline = null;
        configureClearanceScenario(state, lumii.id, thresholdApproach);

        await tx.insert(gameStatesTable).values({
          roomId: room.id,
          state: state as unknown as Record<string, unknown>,
          version: state.version,
        });

        const [claimed] = await tx
          .update(accountBlueprintClearanceTable)
          .set({
            status: "challenge_active",
            challengeRoomId: room.id,
            warningSeenAt: new Date(),
            cipherDeactivatedAt: clearance.cipherDeactivatedAt,
            thresholdApproach,
            thresholdDialogueResolution: "continued",
            thresholdRupturedAt: clearance.thresholdRupturedAt ?? clearance.covenantBrokenAt ?? new Date(),
            covenantBrokenAt: clearance.covenantBrokenAt ?? new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(accountBlueprintClearanceTable.accountId, account.id),
              eq(accountBlueprintClearanceTable.status, "challenge_ready"),
            ),
          )
          .returning({ accountId: accountBlueprintClearanceTable.accountId });
        if (!claimed) throw new ChallengeAlreadyStartedError();

        return {
          roomId: room.id,
          inviteCode: room.inviteCode,
          playerId: player.id,
          sessionToken: player.sessionToken,
        };
      });

      res.status(201).json({
        ...challenge,
        resumed: false,
        scenarioId: CLEARANCE_SCENARIO_ID,
        lumiiThresholdApproach: thresholdApproach,
        campaignAssistance:
          "Lumii begins with five Affinity, three sealed protocols, and a curated Forge path.",
      });
      void runAiTurnsIfNeeded(challenge.roomId);
    } catch (error) {
      if (!(error instanceof ChallengeAlreadyStartedError)) throw error;
      const concurrent = await getActiveChallenge(account.id);
      if (!concurrent) {
        res.status(409).json({ error: "The defense forecast is already starting" });
        return;
      }
      res.json({
        ...concurrent,
        resumed: true,
        scenarioId: CLEARANCE_SCENARIO_ID,
        campaignAssistance:
          "Lumii begins with five Affinity, three sealed protocols, and a curated Forge path.",
      });
    }
  },
);

router.post(
  "/blueprints/clearance-challenge/withdraw",
  accountAuth,
  async (req: Request, res): Promise<void> => {
    const parsed = WithdrawalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "A valid challenge room is required" });
      return;
    }

    const account = req.account!;
    const roomId = parsed.data.roomId;
    const [membership] = await db
      .select({ player: playersTable, room: roomsTable })
      .from(playersTable)
      .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
      .where(
        and(
          eq(playersTable.accountId, account.id),
          eq(playersTable.roomId, roomId),
          eq(playersTable.isAi, false),
        ),
      )
      .limit(1);
    if (!membership || membership.room.scenarioId !== CLEARANCE_SCENARIO_ID) {
      res.status(403).json({ error: "That room is not your Lumii confrontation" });
      return;
    }

    const outcome = await withRoomLock(roomId, async () => {
      const [[room], [stateRow], [clearance]] = await Promise.all([
        db.select().from(roomsTable).where(eq(roomsTable.id, roomId)).limit(1),
        db.select().from(gameStatesTable).where(eq(gameStatesTable.roomId, roomId)).limit(1),
        db.select().from(accountBlueprintClearanceTable)
          .where(eq(accountBlueprintClearanceTable.accountId, account.id)).limit(1),
      ]);
      if (!room || !stateRow) {
        return { ok: false as const, status: 404, error: "Challenge state was not found" };
      }

      const state = normalizeState(stateRow.state);
      if (state.phase === "finished") {
        if (state.finishReason !== "withdrawal") {
          return { ok: false as const, status: 409, error: "This confrontation has already ended" };
        }
        await completeFinishedGame(roomId, state);
      } else {
        if (
          room.status !== "playing" ||
          clearance?.status !== "challenge_active" ||
          clearance.challengeRoomId !== roomId
        ) {
          return { ok: false as const, status: 409, error: "This confrontation cannot be withdrawn" };
        }

        const expectedVersion = state.version;
        state.phase = "finished";
        state.finishReason = "withdrawal";
        state.winnerId = null;
        state.winTriggerLuminaryId = null;
        state.turnDeadline = null;
        state.lastAction = { type: "withdraw_clearance", playerId: membership.player.id };
        state.version += 1;

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
          .returning({ roomId: gameStatesTable.roomId });
        if (updated.length === 0) {
          return { ok: false as const, status: 409, error: "Challenge state changed; try again" };
        }
        clearTurnTimer(roomId);
        await completeFinishedGame(roomId, state);
      }

      const allPlayers = await db.select().from(playersTable).where(eq(playersTable.roomId, roomId));
      const connectedIds = getConnectedPlayerIds(roomId);
      for (const player of allPlayers) if (player.isAi) connectedIds.add(player.id);
      const avatarMap = new Map(allPlayers.map((player) => [player.id, player.avatarId ?? null]));
      const aiMap = new Map(allPlayers.map((player) => [
        player.id,
        {
          isAi: player.isAi,
          aiDifficulty: player.aiDifficulty != null ? parseAiDifficulty(player.aiDifficulty) : null,
        },
      ]));
      const formatted = formatGameState(
        roomId,
        "finished",
        state,
        connectedIds,
        avatarMap,
        aiMap,
        CLEARANCE_SCENARIO_ID,
      );
      for (const player of allPlayers) {
        if (player.isAi) continue;
        sendToPlayer(roomId, player.id, {
          type: "state_update",
          state: filterStateForPlayer(formatted, player.id),
        });
      }
      return { ok: true as const };
    });

    if (!outcome.ok) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    const [updatedClearance] = await db
      .select({ status: accountBlueprintClearanceTable.status })
      .from(accountBlueprintClearanceTable)
      .where(eq(accountBlueprintClearanceTable.accountId, account.id))
      .limit(1);
    res.json({
      roomId,
      status: updatedClearance?.status === "challenge_ready" ? "challenge_ready" : "classified",
    });
  },
);

router.put(
  "/blueprints/loadouts/:mode",
  accountAuth,
  async (req: Request, res): Promise<void> => {
    const rawMode = Array.isArray(req.params.mode) ? req.params.mode[0] : req.params.mode;
    if (!(GAME_MODES as readonly string[]).includes(rawMode) || !isLoadoutMode(rawMode)) {
      res.status(400).json({ error: "Blueprint loadouts are not available in standard play" });
      return;
    }
    const parsed = LoadoutBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "A Blueprint loadout contains exactly two slots" });
      return;
    }

    const account = req.account!;
    await ensureAccountProgressBackfilled(account.id);
    const [clearance] = await db
      .select()
      .from(accountBlueprintClearanceTable)
      .where(eq(accountBlueprintClearanceTable.accountId, account.id))
      .limit(1);
    if (clearance?.status !== "cleared") {
      res.status(403).json({ error: "Blueprint clearance is required" });
      return;
    }
    if (rawMode === "competitive" && !COMPETITIVE_BLUEPRINTS_ENABLED) {
      res.status(403).json({ error: "Competitive Blueprints remain behind the balance gate" });
      return;
    }

    const slots = parsed.data.slots;
    const selected = slots.filter((blueprintId): blueprintId is BlueprintId => blueprintId !== null);
    if (new Set(selected).size !== selected.length) {
      res.status(400).json({ error: "A Blueprint can occupy only one loadout slot" });
      return;
    }

    if (rawMode === "competitive") {
      if (selected.some((id) => !BLUEPRINT_DEFINITIONS[id].competitiveApproved)) {
        res.status(400).json({ error: "That Blueprint is not in the approved seasonal pool" });
        return;
      }
    } else if (selected.length > 0) {
      const ownedRows = await db
        .select({ blueprintId: accountBlueprintUnlocksTable.blueprintId })
        .from(accountBlueprintUnlocksTable)
        .where(
          and(
            eq(accountBlueprintUnlocksTable.accountId, account.id),
            inArray(accountBlueprintUnlocksTable.blueprintId, selected),
          ),
        );
      const owned = new Set(ownedRows.map((row) => row.blueprintId));
      if (selected.some((id) => !owned.has(id))) {
        res.status(403).json({ error: "Campaign ownership is required for this loadout" });
        return;
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(accountBlueprintLoadoutsTable)
        .where(
          and(
            eq(accountBlueprintLoadoutsTable.accountId, account.id),
            eq(accountBlueprintLoadoutsTable.mode, rawMode),
          ),
        );
      const values = slots.flatMap((blueprintId, slotIndex) =>
        blueprintId
          ? [{ accountId: account.id, mode: rawMode, slotIndex, blueprintId }]
          : [],
      );
      if (values.length > 0) await tx.insert(accountBlueprintLoadoutsTable).values(values);
    });

    res.json({ mode: rawMode, slots });
  },
);

export default router;
