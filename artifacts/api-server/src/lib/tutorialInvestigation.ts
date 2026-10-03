import { and, eq, sql } from "drizzle-orm";
import {
  accountEngagementTable,
  accountInvestigationProgressTable,
  accountLumiiRelationshipMemoriesTable,
  accountsTable,
  db,
} from "@workspace/db";
import {
  FIRST_CONTACT_COMPLETION_LUME,
  FIRST_CONTACT_INVESTIGATION_ID,
  FIRST_CONTACT_INVESTIGATION_VERSION,
  TUTORIAL_DISCOVERY_IDS,
  isFirstContactRapport,
  type ArchitectFirstContactStance,
  type FirstContactRapport,
  type TutorialDiscoveryId,
  type TutorialInvestigationProgress,
} from "@workspace/game-types";
import { applyLumeTransaction } from "./lumeLedger";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ProgressRow = typeof accountInvestigationProgressTable.$inferSelect;

export const FIRST_CONTACT_MEMORY_SOURCE_ID = "00000000-0000-4000-8000-000000000001";
export const FIRST_CONTACT_MEMORY_KEY = "first_contact_stance";
export const FIRST_CONTACT_RAPPORT_MEMORY_KEY = "first_contact_rapport";

export function normalizeTutorialDiscoveries(values: readonly string[]): TutorialDiscoveryId[] {
  const allowed = new Set<string>(TUTORIAL_DISCOVERY_IDS);
  return TUTORIAL_DISCOVERY_IDS.filter((id) => allowed.has(id) && values.includes(id));
}

function mergeDiscoveries(
  existing: readonly string[],
  incoming: readonly TutorialDiscoveryId[],
): TutorialDiscoveryId[] {
  const values = new Set([...existing, ...incoming]);
  return TUTORIAL_DISCOVERY_IDS.filter((id) => values.has(id));
}

async function ensureProgressRow(tx: Transaction, accountId: string): Promise<ProgressRow> {
  await tx.insert(accountInvestigationProgressTable).values({
    accountId,
    investigationId: FIRST_CONTACT_INVESTIGATION_ID,
    definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
  }).onConflictDoNothing({
    target: [
      accountInvestigationProgressTable.accountId,
      accountInvestigationProgressTable.investigationId,
    ],
  });

  await tx.execute(sql`
    SELECT "id"
    FROM "account_investigation_progress"
    WHERE "account_id" = ${accountId}
      AND "investigation_id" = ${FIRST_CONTACT_INVESTIGATION_ID}
    FOR UPDATE
  `);

  const [row] = await tx.select().from(accountInvestigationProgressTable).where(and(
    eq(accountInvestigationProgressTable.accountId, accountId),
    eq(accountInvestigationProgressTable.investigationId, FIRST_CONTACT_INVESTIGATION_ID),
  )).limit(1);
  if (!row) throw new Error("Tutorial investigation progress could not be initialized");
  return row;
}

async function grantCompletionLume(
  tx: Transaction,
  accountId: string,
  row: ProgressRow,
): Promise<ProgressRow> {
  if (row.completionLumeAwarded >= FIRST_CONTACT_COMPLETION_LUME) return row;
  await applyLumeTransaction(tx, {
    accountId,
    amount: FIRST_CONTACT_COMPLETION_LUME,
    source: "first_contact_completion",
    category: "granted",
    idempotencyKey: `first-contact:completion:${accountId}`,
    metadata: { investigationId: FIRST_CONTACT_INVESTIGATION_ID },
  });
  const [updated] = await tx.update(accountInvestigationProgressTable).set({
    completionLumeAwarded: FIRST_CONTACT_COMPLETION_LUME,
    updatedAt: new Date(),
  }).where(eq(accountInvestigationProgressTable.id, row.id)).returning();
  return updated ?? row;
}

async function applyExistingCompleterBackfill(
  tx: Transaction,
  accountId: string,
  row: ProgressRow,
): Promise<ProgressRow> {
  if (row.completedAt) return grantCompletionLume(tx, accountId, row);
  const [account] = await tx.select({ tutorialCompleted: accountsTable.tutorialCompleted })
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId))
    .limit(1);
  if (!account?.tutorialCompleted) return row;
  const [completed] = await tx.update(accountInvestigationProgressTable).set({
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(accountInvestigationProgressTable.id, row.id)).returning();
  return grantCompletionLume(tx, accountId, completed ?? row);
}

async function readLumeBalance(tx: Transaction, accountId: string): Promise<number | null> {
  const [engagement] = await tx.select({ balance: accountEngagementTable.lumeBalance })
    .from(accountEngagementTable)
    .where(eq(accountEngagementTable.accountId, accountId))
    .limit(1);
  return engagement?.balance ?? null;
}

async function readFirstContactRapport(
  tx: Transaction,
  accountId: string,
): Promise<FirstContactRapport | null> {
  const [memory] = await tx.select({ detail: accountLumiiRelationshipMemoriesTable.detail })
    .from(accountLumiiRelationshipMemoriesTable)
    .where(and(
      eq(accountLumiiRelationshipMemoriesTable.accountId, accountId),
      eq(accountLumiiRelationshipMemoriesTable.sourceKind, "tutorial"),
      eq(accountLumiiRelationshipMemoriesTable.sourceRecordId, FIRST_CONTACT_MEMORY_SOURCE_ID),
      eq(accountLumiiRelationshipMemoriesTable.memoryKey, FIRST_CONTACT_RAPPORT_MEMORY_KEY),
    ))
    .limit(1);
  return isFirstContactRapport(memory?.detail) ? memory.detail : null;
}

async function projectProgress(
  tx: Transaction,
  accountId: string,
  row: ProgressRow,
): Promise<TutorialInvestigationProgress> {
  const discoveries = normalizeTutorialDiscoveries(row.discoveries);
  return {
    investigationId: FIRST_CONTACT_INVESTIGATION_ID,
    definitionVersion: row.definitionVersion,
    completed: row.completedAt != null,
    completedAt: row.completedAt?.toISOString() ?? null,
    firstContactRapport: await readFirstContactRapport(tx, accountId),
    discoveries,
    completionLumeAwarded: row.completionLumeAwarded,
    lumeBalance: await readLumeBalance(tx, accountId),
  };
}

export async function readTutorialInvestigation(
  accountId: string,
): Promise<TutorialInvestigationProgress> {
  return db.transaction(async (tx) => {
    const row = await applyExistingCompleterBackfill(tx, accountId, await ensureProgressRow(tx, accountId));
    return projectProgress(tx, accountId, row);
  });
}

export async function completeTutorialInvestigation(
  accountId: string,
  stance: ArchitectFirstContactStance,
  rapport: FirstContactRapport | null,
  discoveries: readonly TutorialDiscoveryId[],
): Promise<TutorialInvestigationProgress> {
  return db.transaction(async (tx) => {
    let row = await applyExistingCompleterBackfill(tx, accountId, await ensureProgressRow(tx, accountId));
    // First Contact is canonical account history. Later or concurrent completion
    // calls are idempotent and cannot rewrite its stance or discoveries.
    if (row.completedAt) {
      await tx.update(accountsTable).set({
        tutorialSeen: true,
        tutorialCompleted: true,
      }).where(eq(accountsTable.id, accountId));
      return projectProgress(tx, accountId, row);
    }

    const completedAt = new Date();
    const mergedDiscoveries = mergeDiscoveries(row.discoveries, discoveries);
    const [updated] = await tx.update(accountInvestigationProgressTable).set({
      definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
      discoveries: mergedDiscoveries,
      completedAt,
      updatedAt: new Date(),
    }).where(eq(accountInvestigationProgressTable.id, row.id)).returning();
    row = await grantCompletionLume(tx, accountId, updated ?? row);

    await tx.update(accountsTable).set({
      tutorialSeen: true,
      tutorialCompleted: true,
    }).where(eq(accountsTable.id, accountId));

    await tx.insert(accountLumiiRelationshipMemoriesTable).values({
      accountId,
      sourceKind: "tutorial",
      sourceRecordId: FIRST_CONTACT_MEMORY_SOURCE_ID,
      definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
      memoryKey: FIRST_CONTACT_MEMORY_KEY,
      valence: 0,
      detail: stance,
      visibility: "account",
      simulation: false,
    }).onConflictDoUpdate({
      target: [
        accountLumiiRelationshipMemoriesTable.accountId,
        accountLumiiRelationshipMemoriesTable.sourceKind,
        accountLumiiRelationshipMemoriesTable.sourceRecordId,
        accountLumiiRelationshipMemoriesTable.memoryKey,
      ],
      set: {
        definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
        detail: stance,
        recordedAt: new Date(),
      },
    });

    if (rapport) {
      await tx.insert(accountLumiiRelationshipMemoriesTable).values({
        accountId,
        sourceKind: "tutorial",
        sourceRecordId: FIRST_CONTACT_MEMORY_SOURCE_ID,
        definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
        memoryKey: FIRST_CONTACT_RAPPORT_MEMORY_KEY,
        valence: 0,
        detail: rapport,
        visibility: "account",
        simulation: false,
      }).onConflictDoUpdate({
        target: [
          accountLumiiRelationshipMemoriesTable.accountId,
          accountLumiiRelationshipMemoriesTable.sourceKind,
          accountLumiiRelationshipMemoriesTable.sourceRecordId,
          accountLumiiRelationshipMemoriesTable.memoryKey,
        ],
        set: {
          definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
          detail: rapport,
          recordedAt: new Date(),
        },
      });
    }

    return projectProgress(tx, accountId, row);
  });
}
