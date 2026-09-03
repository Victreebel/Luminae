import { and, asc, eq } from "drizzle-orm";
import {
  accountBlueprintClearanceTable,
  accountCampaignChoicesTable,
  accountCampaignNodesTable,
  accountCampaignPresentationsTable,
  accountCampaignProgressTable,
  accountsTable,
  db,
} from "@workspace/db";
import {
  BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  type ArchitectRecordState,
  type CampaignNodeStatus,
  type CampaignPresentation,
  type FirstContactStance,
} from "@workspace/game-types";
import {
  ARCHITECT_RECORD_CAMPAIGN_ID,
  ARCHITECT_RECORD_DEFINITION,
  deriveArchitectRecordNodeStatuses,
  getArchitectRecordBackfillPresentations,
  getArchitectRecordInterludeLines,
  type CampaignNodeDefinition,
} from "./architectRecordDefinition.js";

export { ARCHITECT_RECORD_CAMPAIGN_ID } from "./architectRecordDefinition.js";

const ARCHITECT_RECORD_BACKFILL_VERSION = 1;

function isFirstContactStance(value: unknown): value is FirstContactStance {
  return value === "curious" || value === "guarded" || value === "resolute";
}

function currentNodeId(
  statuses: ReturnType<typeof deriveArchitectRecordNodeStatuses>,
): CampaignNodeDefinition["id"] {
  if (statuses.vault_threshold === "completed") return "first_charge";
  if (statuses.vault_threshold === "active" || statuses.vault_threshold === "available") {
    return "vault_threshold";
  }
  return statuses.first_contact === "completed" ? "architect_record" : "first_contact";
}

async function persistNodeStatuses(
  executor: Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db,
  accountId: string,
  statuses: Record<CampaignNodeDefinition["id"], CampaignNodeStatus>,
): Promise<void> {
  for (const node of ARCHITECT_RECORD_DEFINITION) {
    const status = statuses[node.id];
    await executor
      .insert(accountCampaignNodesTable)
      .values({
        accountId,
        campaignId: ARCHITECT_RECORD_CAMPAIGN_ID,
        nodeId: node.id,
        status,
        activatedAt: status === "active" ? new Date() : null,
        completedAt: status === "completed" ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [
          accountCampaignNodesTable.accountId,
          accountCampaignNodesTable.campaignId,
          accountCampaignNodesTable.nodeId,
        ],
        set: {
          status,
          activatedAt: status === "active" ? new Date() : null,
          completedAt: status === "completed" ? new Date() : null,
          updatedAt: new Date(),
        },
      });
  }
}

export async function ensureArchitectRecord(accountId: string): Promise<void> {
  const [progressRows, clearanceRows, accountRows] = await Promise.all([
    db.select().from(accountCampaignProgressTable).where(and(
      eq(accountCampaignProgressTable.accountId, accountId),
      eq(accountCampaignProgressTable.campaignId, ARCHITECT_RECORD_CAMPAIGN_ID),
    )).limit(1),
    db.select().from(accountBlueprintClearanceTable).where(eq(accountBlueprintClearanceTable.accountId, accountId)).limit(1),
    db.select({ tutorialCompleted: accountsTable.tutorialCompleted }).from(accountsTable).where(eq(accountsTable.id, accountId)).limit(1),
  ]);
  const existing = progressRows[0];
  if (existing && existing.backfillVersion >= ARCHITECT_RECORD_BACKFILL_VERSION) return;

  const clearance = clearanceRows[0];
  const qualifyingWins = Math.min(
    BLUEPRINT_CLEARANCE_REQUIRED_WINS,
    Math.max(0, clearance?.qualifyingWins ?? 0),
  );
  const tutorialCompleted = existing?.tutorialCompletedAt != null || accountRows[0]?.tutorialCompleted === true;
  const statuses = deriveArchitectRecordNodeStatuses({
    tutorialCompleted,
    qualifyingWins,
    clearanceStatus: clearance?.status ?? "classified",
  });

  await db.transaction(async (tx) => {
    await tx
      .insert(accountCampaignProgressTable)
      .values({
        accountId,
        campaignId: ARCHITECT_RECORD_CAMPAIGN_ID,
        currentNodeId: currentNodeId(statuses),
        tutorialCompletedAt: tutorialCompleted ? new Date() : null,
        backfillVersion: ARCHITECT_RECORD_BACKFILL_VERSION,
      })
      .onConflictDoUpdate({
        target: [accountCampaignProgressTable.accountId, accountCampaignProgressTable.campaignId],
        set: {
          currentNodeId: currentNodeId(statuses),
          tutorialCompletedAt: tutorialCompleted ? existing?.tutorialCompletedAt ?? new Date() : null,
          backfillVersion: ARCHITECT_RECORD_BACKFILL_VERSION,
          updatedAt: new Date(),
        },
      });
    await persistNodeStatuses(tx, accountId, statuses);

    if (!existing && qualifyingWins > 0) {
      for (const presentation of getArchitectRecordBackfillPresentations(qualifyingWins)) {
        await tx.insert(accountCampaignPresentationsTable).values({
          accountId,
          campaignId: ARCHITECT_RECORD_CAMPAIGN_ID,
          presentationId: presentation.presentationId,
          kind: presentation.kind,
          ordinal: presentation.ordinal,
          acknowledgedAt: presentation.acknowledged ? new Date() : null,
        }).onConflictDoNothing({
          target: [
            accountCampaignPresentationsTable.accountId,
            accountCampaignPresentationsTable.campaignId,
            accountCampaignPresentationsTable.presentationId,
          ],
        });
      }
    }
  });
}

export async function claimArchitectRecordOnboarding(input: {
  accountId: string;
  claimId: string;
  stance: FirstContactStance | null;
}): Promise<void> {
  const now = new Date();
  await ensureArchitectRecord(input.accountId);
  const [clearanceRows, progressRows] = await Promise.all([
    db.select().from(accountBlueprintClearanceTable)
      .where(eq(accountBlueprintClearanceTable.accountId, input.accountId)).limit(1),
    db.select().from(accountCampaignProgressTable).where(and(
      eq(accountCampaignProgressTable.accountId, input.accountId),
      eq(accountCampaignProgressTable.campaignId, ARCHITECT_RECORD_CAMPAIGN_ID),
    )).limit(1),
  ]);
  const clearance = clearanceRows[0];
  if (progressRows[0]?.lastOnboardingClaimId === input.claimId) return;
  const qualifyingWins = Math.min(
    BLUEPRINT_CLEARANCE_REQUIRED_WINS,
    Math.max(0, clearance?.qualifyingWins ?? 0),
  );
  const statuses = deriveArchitectRecordNodeStatuses({
    tutorialCompleted: true,
    qualifyingWins,
    clearanceStatus: clearance?.status ?? "classified",
  });
  await db.transaction(async (tx) => {
    await tx
      .insert(accountCampaignProgressTable)
      .values({
        accountId: input.accountId,
        campaignId: ARCHITECT_RECORD_CAMPAIGN_ID,
        currentNodeId: currentNodeId(statuses),
        tutorialCompletedAt: now,
        firstContactStance: input.stance,
        lastOnboardingClaimId: input.claimId,
        backfillVersion: ARCHITECT_RECORD_BACKFILL_VERSION,
      })
      .onConflictDoUpdate({
        target: [accountCampaignProgressTable.accountId, accountCampaignProgressTable.campaignId],
        set: {
          currentNodeId: currentNodeId(statuses),
          tutorialCompletedAt: now,
          ...(input.stance ? { firstContactStance: input.stance } : {}),
          lastOnboardingClaimId: input.claimId,
          backfillVersion: ARCHITECT_RECORD_BACKFILL_VERSION,
          updatedAt: now,
        },
      });
    if (input.stance) {
      await tx.insert(accountCampaignChoicesTable).values({
        accountId: input.accountId,
        campaignId: ARCHITECT_RECORD_CAMPAIGN_ID,
        claimId: input.claimId,
        choiceId: "first_contact_stance",
        value: input.stance,
      }).onConflictDoNothing({
        target: [
          accountCampaignChoicesTable.accountId,
          accountCampaignChoicesTable.campaignId,
          accountCampaignChoicesTable.claimId,
          accountCampaignChoicesTable.choiceId,
        ],
      });
    }
    await tx.update(accountsTable).set({ tutorialSeen: true, tutorialCompleted: true }).where(eq(accountsTable.id, input.accountId));
    await persistNodeStatuses(tx, input.accountId, statuses);
  });
}

export async function enqueueArchitectRecordInterlude(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  accountId: string,
  ordinal: number,
): Promise<void> {
  if (!getArchitectRecordInterludeLines(ordinal)) return;
  await tx.insert(accountCampaignPresentationsTable).values({
    accountId,
    campaignId: ARCHITECT_RECORD_CAMPAIGN_ID,
    presentationId: `clearance_signal_${ordinal}`,
    kind: "clearance_signal",
    ordinal,
  }).onConflictDoNothing({
    target: [
      accountCampaignPresentationsTable.accountId,
      accountCampaignPresentationsTable.campaignId,
      accountCampaignPresentationsTable.presentationId,
    ],
  });
  const recordComplete = ordinal >= BLUEPRINT_CLEARANCE_REQUIRED_WINS;
  await tx.update(accountCampaignNodesTable).set({
    status: recordComplete ? "completed" : "active",
    completedAt: recordComplete ? new Date() : null,
    updatedAt: new Date(),
  }).where(and(
    eq(accountCampaignNodesTable.accountId, accountId),
    eq(accountCampaignNodesTable.campaignId, ARCHITECT_RECORD_CAMPAIGN_ID),
    eq(accountCampaignNodesTable.nodeId, "architect_record"),
  ));
  if (recordComplete) {
    await tx.update(accountCampaignNodesTable).set({
      status: "available",
      updatedAt: new Date(),
    }).where(and(
      eq(accountCampaignNodesTable.accountId, accountId),
      eq(accountCampaignNodesTable.campaignId, ARCHITECT_RECORD_CAMPAIGN_ID),
      eq(accountCampaignNodesTable.nodeId, "vault_threshold"),
    ));
    await tx.update(accountCampaignProgressTable).set({
      currentNodeId: "vault_threshold",
      updatedAt: new Date(),
    }).where(and(
      eq(accountCampaignProgressTable.accountId, accountId),
      eq(accountCampaignProgressTable.campaignId, ARCHITECT_RECORD_CAMPAIGN_ID),
    ));
  }
}

function presentationCopy(row: typeof accountCampaignPresentationsTable.$inferSelect): CampaignPresentation {
  const lines = row.kind === "clearance_recap"
    ? [
        `Your Architect Record contains ${row.ordinal} earlier signal${row.ordinal === 1 ? "" : "s"}.`,
        "Lumii has preserved their pattern here instead of replaying each interruption.",
      ]
    : [...(getArchitectRecordInterludeLines(row.ordinal) ?? ["An unexplained response was recorded."])];
  return {
    id: row.presentationId,
    kind: row.kind === "clearance_recap" ? "clearance_recap" : "clearance_signal",
    ordinal: row.ordinal,
    title: row.kind === "clearance_recap" ? "Recovered Signal Record" : `Signal ${row.ordinal} of ${BLUEPRINT_CLEARANCE_REQUIRED_WINS}`,
    lines,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
  };
}

export async function readArchitectRecord(accountId: string): Promise<ArchitectRecordState> {
  await ensureArchitectRecord(accountId);
  const [progressRows, clearanceRows, presentationRows] = await Promise.all([
    db.select().from(accountCampaignProgressTable).where(and(
      eq(accountCampaignProgressTable.accountId, accountId),
      eq(accountCampaignProgressTable.campaignId, ARCHITECT_RECORD_CAMPAIGN_ID),
    )).limit(1),
    db.select().from(accountBlueprintClearanceTable).where(eq(accountBlueprintClearanceTable.accountId, accountId)).limit(1),
    db.select().from(accountCampaignPresentationsTable).where(and(
      eq(accountCampaignPresentationsTable.accountId, accountId),
      eq(accountCampaignPresentationsTable.campaignId, ARCHITECT_RECORD_CAMPAIGN_ID),
    )).orderBy(asc(accountCampaignPresentationsTable.createdAt)),
  ]);
  const progress = progressRows[0];
  const clearance = clearanceRows[0];
  const tutorialCompleted = progress?.tutorialCompletedAt != null;
  const qualifyingWins = Math.min(BLUEPRINT_CLEARANCE_REQUIRED_WINS, Math.max(0, clearance?.qualifyingWins ?? 0));
  const statuses = deriveArchitectRecordNodeStatuses({ tutorialCompleted, qualifyingWins, clearanceStatus: clearance?.status ?? "classified" });
  await persistNodeStatuses(db, accountId, statuses);
  const cleared = clearance?.status === "cleared";
  const visiblePresentationRows = presentationRows.filter(
    (row) => row.ordinal <= BLUEPRINT_CLEARANCE_REQUIRED_WINS,
  );

  return {
    campaignId: ARCHITECT_RECORD_CAMPAIGN_ID,
    tutorialCompleted,
    firstContactStance: isFirstContactStance(progress?.firstContactStance) ? progress.firstContactStance : null,
    nodes: ARCHITECT_RECORD_DEFINITION.filter((node) => cleared || node.id !== "first_charge").map((node) => ({
      id: node.id,
      title: node.id === "vault_threshold" && !cleared ? "Restricted Record" : node.publicTitle,
      status: statuses[node.id],
      progress: node.id === "architect_record" ? qualifyingWins : statuses[node.id] === "completed" ? 1 : 0,
      requiredProgress: node.id === "architect_record" ? BLUEPRINT_CLEARANCE_REQUIRED_WINS : 1,
    })),
    presentations: visiblePresentationRows.map(presentationCopy),
    pendingPresentations: visiblePresentationRows
      .filter((row) => row.acknowledgedAt == null)
      .map(presentationCopy),
    vaultShortcutVisible: cleared,
  };
}

export async function acknowledgeArchitectRecordPresentation(
  accountId: string,
  presentationId: string,
): Promise<boolean> {
  const [updated] = await db.update(accountCampaignPresentationsTable).set({ acknowledgedAt: new Date() }).where(and(
    eq(accountCampaignPresentationsTable.accountId, accountId),
    eq(accountCampaignPresentationsTable.campaignId, ARCHITECT_RECORD_CAMPAIGN_ID),
    eq(accountCampaignPresentationsTable.presentationId, presentationId),
  )).returning({ id: accountCampaignPresentationsTable.id });
  return Boolean(updated);
}
