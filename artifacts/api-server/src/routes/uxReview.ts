import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import {
  accountBlueprintClearanceTable,
  accountBlueprintLoadoutsTable,
  accountBlueprintUnlocksTable,
  accountCampaignDimensionContributionsTable,
  accountCampaignFactsTable,
  accountChroniclePrimaryOutcomesTable,
  accountChronicleUnlocksTable,
  accountLumiiRelationshipMemoriesTable,
  accountSessionsTable,
  accountsTable,
  db,
} from "@workspace/db";
import {
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  type ChronicleDefinitionAuthoring,
  type ChronicleOutcomeAuthoring,
} from "@workspace/game-types";
import { accountAuth } from "../lib/accountAuth";
import { TRACE_CHRONICLE_DEFINITION } from "../lib/traceChronicle";
import { RECURRENCE_CHRONICLE_DEFINITION } from "../lib/recurrenceChronicle";
import { TRIANGULATION_CHRONICLE_DEFINITION } from "../lib/triangulationChronicle";
import {
  UX_REVIEW_CHECKPOINT_RECIPES,
  UX_REVIEW_CHECKPOINT_IDS,
  uxReviewServerAllowed,
  type UxReviewCheckpointId,
} from "../lib/uxReviewCheckpoints";

const router: IRouter = Router();
const REVIEW_ACCOUNT_PREFIX = "ux_review_";
const REVIEW_SESSION_DAYS = 7;
const REVIEW_HEADER = "x-luminae-ux-review";
const REVIEW_ACCOUNT_LABELS: Record<UxReviewCheckpointId, string> = {
  fresh: "fresh",
  post_tutorial: "tutorial",
  trace_ready: "trace",
  recurrence_ready: "recur",
  triangulation_ready: "triang",
  vault_ready: "vault",
  vault_reveal: "reveal",
  vault_hub: "hub",
};

const CreateReviewSessionBody = z.object({
  checkpointId: z.enum(UX_REVIEW_CHECKPOINT_IDS),
});

const CHRONICLE_SEEDS: ReadonlyArray<{
  definition: ChronicleDefinitionAuthoring;
  outcomeId: string;
}> = [
  { definition: TRACE_CHRONICLE_DEFINITION, outcomeId: "trace_exposed_victory" },
  { definition: RECURRENCE_CHRONICLE_DEFINITION, outcomeId: "recurrence_conditional_victory" },
  {
    definition: TRIANGULATION_CHRONICLE_DEFINITION,
    outcomeId: "triangulation_measure_deme_reference",
  },
];

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function isLoopbackRequest(req: Request): boolean {
  const hostname = req.hostname.toLowerCase();
  const address = req.socket.remoteAddress?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" ||
    address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function reviewGuard(req: Request, res: Response, next: NextFunction): void {
  const allowed = uxReviewServerAllowed({
    nodeEnv: process.env.NODE_ENV,
    explicitEnable: process.env.LUMINAE_UX_REVIEW_ENABLED,
    loopback: isLoopbackRequest(req),
  });
  if (!allowed || req.headers[REVIEW_HEADER] !== "1") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  next();
}

function sessionExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REVIEW_SESSION_DAYS);
  return expiry;
}

function authoredOutcome(
  definition: ChronicleDefinitionAuthoring,
  outcomeId: string,
): ChronicleOutcomeAuthoring {
  const outcome = definition.outcomes.find((candidate) => candidate.outcomeId === outcomeId);
  if (!outcome) throw new Error(`UX review outcome is not authored: ${outcomeId}`);
  return outcome;
}

async function seedChronicleOutcome(
  tx: Transaction,
  input: {
    accountId: string;
    sequence: number;
    definition: ChronicleDefinitionAuthoring;
    outcomeId: string;
    completedAt: Date;
  },
): Promise<void> {
  const outcome = authoredOutcome(input.definition, input.outcomeId);
  const [record] = await tx
    .insert(accountChroniclePrimaryOutcomesTable)
    .values({
      accountId: input.accountId,
      chronicleId: outcome.chronicleId,
      definitionVersion: outcome.definitionVersion,
      roomId: null,
      matchInstanceId: `ux-review:${input.accountId}:${input.sequence}:${outcome.chronicleId}`,
      outcomeId: outcome.outcomeId,
      result: outcome.result,
      lumeEarned: 0,
      completedAt: input.completedAt,
    })
    .returning({ id: accountChroniclePrimaryOutcomesTable.id });
  if (!record) throw new Error(`Could not seed UX review outcome: ${outcome.outcomeId}`);

  if (outcome.facts.length > 0) {
    await tx.insert(accountCampaignFactsTable).values(outcome.facts.map((fact) => ({
      accountId: input.accountId,
      sourceKind: "ux_review_checkpoint",
      sourceRecordId: record.id,
      definitionVersion: outcome.definitionVersion,
      factKey: fact.key,
      value: fact.value,
      visibility: fact.visibility,
    })));
  }
  if (outcome.dimensionContributions.length > 0) {
    await tx.insert(accountCampaignDimensionContributionsTable).values(
      outcome.dimensionContributions.map((contribution) => ({
        accountId: input.accountId,
        sourceKind: "ux_review_checkpoint",
        sourceRecordId: record.id,
        definitionVersion: outcome.definitionVersion,
        dimension: contribution.dimension,
        direction: contribution.direction,
        magnitude: contribution.magnitude,
        rationaleKey: contribution.rationaleKey,
        visibility: contribution.visibility,
      })),
    );
  }
  if (outcome.lumiiMemories.length > 0) {
    await tx.insert(accountLumiiRelationshipMemoriesTable).values(
      outcome.lumiiMemories.map((memory) => ({
        accountId: input.accountId,
        sourceKind: "ux_review_checkpoint",
        sourceRecordId: record.id,
        definitionVersion: outcome.definitionVersion,
        memoryKey: memory.key,
        valence: memory.valence,
        detail: memory.detail ?? null,
        visibility: memory.visibility,
        simulation: true,
      })),
    );
  }
  for (const entitlement of outcome.baselineEntitlements) {
    if (entitlement.kind !== "archive_record") continue;
    await tx
      .insert(accountChronicleUnlocksTable)
      .values({
        accountId: input.accountId,
        chronicleId: entitlement.entitlementId,
        source: "ux_review_checkpoint",
        metadata: { sourceRecordId: record.id, synthetic: true },
        unlockedAt: input.completedAt,
      })
      .onConflictDoNothing({
        target: [accountChronicleUnlocksTable.accountId, accountChronicleUnlocksTable.chronicleId],
      });
  }
}

async function seedVaultState(
  tx: Transaction,
  accountId: string,
  checkpointId: UxReviewCheckpointId,
  now: Date,
): Promise<void> {
  const vaultState = UX_REVIEW_CHECKPOINT_RECIPES[checkpointId].vaultState;
  if (vaultState === "none") return;

  if (vaultState === "ready") {
    await tx.insert(accountBlueprintClearanceTable).values({
      accountId,
      qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
      status: "challenge_ready",
      updatedAt: now,
    });
    return;
  }

  await tx.insert(accountBlueprintClearanceTable).values({
    accountId,
    qualifyingWins: BLUEPRINT_CLEARANCE_REQUIRED_WINS,
    status: "cleared",
    warningSeenAt: now,
    cipherDeactivatedAt: now,
    thresholdApproach: "inquiry",
    thresholdDialoguePath: [],
    thresholdDialogueResolution: "continued",
    thresholdRupturedAt: now,
    covenantBrokenAt: now,
    completedAt: now,
    vaultRevealSeenAt: vaultState === "opened" ? now : null,
    updatedAt: now,
  });
  await tx.insert(accountBlueprintUnlocksTable).values({
    accountId,
    blueprintId: "bp_antimatter_detonator",
    source: "ux_review_checkpoint",
    unlockedAt: now,
  });
  await tx.insert(accountChronicleUnlocksTable).values({
    accountId,
    chronicleId: "chronicle_outer_vault_access",
    source: "ux_review_checkpoint",
    metadata: {
      blueprintId: "bp_antimatter_detonator",
      recordKind: "threshold_record",
      canonicalChronicle: false,
      synthetic: true,
    },
    unlockedAt: now,
  });
  await tx.insert(accountBlueprintLoadoutsTable).values([
    {
      accountId,
      mode: "campaign",
      slotIndex: 0,
      blueprintId: "bp_antimatter_detonator",
      updatedAt: now,
    },
    {
      accountId,
      mode: "custom",
      slotIndex: 0,
      blueprintId: "bp_antimatter_detonator",
      updatedAt: now,
    },
  ]);
}

router.use("/dev/ux-review", reviewGuard);

router.get("/dev/ux-review", (_req, res) => {
  res.json({
    available: true,
    checkpointIds: UX_REVIEW_CHECKPOINT_IDS,
    safety: "Disposable local accounts; synthetic checkpoints never rewrite played history.",
  });
});

router.post("/dev/ux-review/sessions", async (req: Request, res): Promise<void> => {
  const parsed = CreateReviewSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid UX review checkpoint is required" });
    return;
  }

  const checkpointId = parsed.data.checkpointId;
  const recipe = UX_REVIEW_CHECKPOINT_RECIPES[checkpointId];
  const suffix = randomBytes(5).toString("hex");
  const username = `${REVIEW_ACCOUNT_PREFIX}${REVIEW_ACCOUNT_LABELS[checkpointId]}_${suffix}`;
  const password = `Review-${randomBytes(12).toString("base64url")}`;
  const passwordHash = await bcrypt.hash(password, 4);
  const token = randomBytes(32).toString("hex");
  const expiresAt = sessionExpiry();
  const now = new Date();

  const account = await db.transaction(async (tx) => {
    const [created] = await tx.insert(accountsTable).values({
      username,
      email: null,
      passwordHash,
      skipCinematics: false,
      abridgedAnims: false,
      hintsEnabled: true,
      muted: false,
      hintsSeen: [],
      tutorialSeen: recipe.tutorialCompleted,
      tutorialCompleted: recipe.tutorialCompleted,
      createdAt: now,
    }).returning();
    if (!created) throw new Error("Could not create UX review account");

    await tx.insert(accountSessionsTable).values({
      accountId: created.id,
      token,
      expiresAt,
      createdAt: now,
    });

    for (let index = 0; index < recipe.completedChronicleCount; index += 1) {
      const seed = CHRONICLE_SEEDS[index];
      if (!seed) continue;
      await seedChronicleOutcome(tx, {
        accountId: created.id,
        sequence: index + 1,
        definition: seed.definition,
        outcomeId: seed.outcomeId,
        completedAt: new Date(now.getTime() - (recipe.completedChronicleCount - index) * 1_000),
      });
    }
    await seedVaultState(tx, created.id, checkpointId, now);
    return created;
  });

  req.log.info({ accountId: account.id, checkpointId }, "UX review account created");
  res.status(201).json({
    checkpointId,
    seeded: recipe.seeded,
    syntheticState: recipe.seeded,
    credentials: { username, password },
    session: {
      account: { id: account.id, username: account.username, email: account.email },
      token,
      expiresAt: expiresAt.toISOString(),
    },
  });
});

router.delete(
  "/dev/ux-review/sessions/current",
  accountAuth,
  async (req: Request, res): Promise<void> => {
    const account = req.account!;
    if (!account.username.startsWith(REVIEW_ACCOUNT_PREFIX)) {
      res.status(403).json({ error: "Only disposable UX review accounts can be removed here" });
      return;
    }
    await db.delete(accountsTable).where(eq(accountsTable.id, account.id));
    res.json({ ok: true });
  },
);

export default router;
