import { and, asc, eq } from "drizzle-orm";
import {
  accountBlueprintUnlocksTable,
  accountCalibrationInsightsTable,
  accountCampaignDimensionContributionsTable,
  accountCampaignFactsTable,
  accountChroniclePrimaryOutcomesTable,
  accountChronicleRehearsalsTable,
  accountChronicleHistoricalRecordsTable,
  accountChronicleUnlocksTable,
  accountEntitlementsTable,
  accountLumiiRelationshipMemoriesTable,
  accountMatchRollupsTable,
  db,
  roomsTable,
} from "@workspace/db";
import {
  buildCampaignProgressProjection,
  rehearsalEntitlementsAreNonPower,
  validateChronicleDefinitionAuthoring,
  validateChronicleOutcomeAuthoring,
  type CampaignEntitlementAuthoring,
  type CampaignProgressProjection,
  type ChronicleDefinitionAuthoring,
  type ChronicleOutcomeAuthoring,
  type ChroniclePrimaryOutcomeSummary,
  type ChronicleRehearsalSummary,
  type LumiiRelationshipMemoryAuthoring,
} from "@workspace/game-types";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const RELEASED_PRIMARY_CHRONICLE_IDS: readonly string[] = [
  "chronicle_trace",
  "chronicle_recurrence",
];

export class ChronicleCompletionError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404 | 409,
  ) {
    super(message);
  }
}

export interface CompleteChroniclePrimaryInput {
  accountId: string;
  roomId: string;
  matchInstanceId: string;
  definition: ChronicleDefinitionAuthoring;
  outcomeId: string;
  preparednessObjectiveMet: boolean;
  historicalRecords?: readonly ChronicleHistoricalRecordInput[];
  completedAt?: Date;
}

export interface ChronicleHistoricalRecordInput {
  recordKind: "domain" | "civilization";
  recordKey: string;
  payload: Record<string, unknown>;
}

export interface CompleteChronicleRehearsalInput {
  accountId: string;
  roomId: string;
  matchInstanceId: string;
  definition: ChronicleDefinitionAuthoring;
  outcomeId: string;
  preparednessObjectiveMet: boolean;
  entitlements?: readonly CampaignEntitlementAuthoring[];
  lumiiMemories?: readonly LumiiRelationshipMemoryAuthoring[];
  completedAt?: Date;
}

export interface ChronicleCompletionResult<T> {
  record: T;
  created: boolean;
}

async function verifyFinishedScenario(
  tx: Transaction,
  input: {
    accountId: string;
    roomId: string;
    matchInstanceId: string;
    scenarioId: string;
    result: ChronicleOutcomeAuthoring["result"];
  },
) {
  const [room] = await tx
    .select({ id: roomsTable.id, status: roomsTable.status, scenarioId: roomsTable.scenarioId })
    .from(roomsTable)
    .where(eq(roomsTable.id, input.roomId))
    .limit(1);
  if (!room) throw new ChronicleCompletionError("Chronicle room not found", 404);
  if (room.status !== "finished") {
    throw new ChronicleCompletionError("Chronicle room is not finished", 409);
  }
  if (room.scenarioId !== input.scenarioId) {
    throw new ChronicleCompletionError("Chronicle scenario does not match", 409);
  }

  const [rollup] = await tx
    .select()
    .from(accountMatchRollupsTable)
    .where(and(
      eq(accountMatchRollupsTable.accountId, input.accountId),
      eq(accountMatchRollupsTable.roomId, input.roomId),
      eq(accountMatchRollupsTable.matchInstanceId, input.matchInstanceId),
    ))
    .limit(1);
  if (!rollup) {
    throw new ChronicleCompletionError("Authoritative Chronicle closure is unavailable", 409);
  }
  const expectedResult = rollup.result === "win" ? "victory" : "defeat";
  if (expectedResult !== input.result) {
    throw new ChronicleCompletionError("Chronicle outcome does not match authoritative closure", 409);
  }
  return rollup;
}

function authoredOutcome(
  definition: ChronicleDefinitionAuthoring,
  outcomeId: string,
): ChronicleOutcomeAuthoring {
  const definitionErrors = validateChronicleDefinitionAuthoring(definition);
  if (definitionErrors.length > 0) {
    throw new ChronicleCompletionError(definitionErrors.join("; "), 400);
  }
  const outcome = definition.outcomes.find((candidate) => candidate.outcomeId === outcomeId);
  if (!outcome) throw new ChronicleCompletionError("Chronicle outcome is not authored", 400);
  return outcome;
}

async function grantEntitlements(
  tx: Transaction,
  input: {
    accountId: string;
    chronicleId: string;
    sourceRecordId: string;
    entitlements: readonly CampaignEntitlementAuthoring[];
  },
): Promise<void> {
  for (const entitlement of input.entitlements) {
    const source = `chronicle:${input.chronicleId}`;
    if (entitlement.kind === "blueprint") {
      await tx.insert(accountBlueprintUnlocksTable).values({
        accountId: input.accountId,
        blueprintId: entitlement.entitlementId,
        source,
      }).onConflictDoNothing({
        target: [accountBlueprintUnlocksTable.accountId, accountBlueprintUnlocksTable.blueprintId],
      });
      continue;
    }
    if (entitlement.kind === "archive_record") {
      await tx.insert(accountChronicleUnlocksTable).values({
        accountId: input.accountId,
        chronicleId: entitlement.entitlementId,
        source,
        metadata: { sourceRecordId: input.sourceRecordId },
      }).onConflictDoNothing({
        target: [accountChronicleUnlocksTable.accountId, accountChronicleUnlocksTable.chronicleId],
      });
      continue;
    }
    await tx.insert(accountEntitlementsTable).values({
      accountId: input.accountId,
      itemId: entitlement.entitlementId,
      source,
      receiptId: `chronicle:${input.accountId}:${input.chronicleId}:${entitlement.entitlementId}`,
      metadata: {
        sourceRecordId: input.sourceRecordId,
        entitlementKind: entitlement.kind,
        nonGameplay: !entitlement.competitivePower,
      },
    }).onConflictDoNothing({
      target: [accountEntitlementsTable.accountId, accountEntitlementsTable.itemId],
    });
  }
}

async function grantCalibrationInsight(
  tx: Transaction,
  input: {
    accountId: string;
    chronicleId: string;
    sourceKind: "primary" | "rehearsal";
    sourceRecordId: string;
  },
): Promise<void> {
  await tx.insert(accountCalibrationInsightsTable).values(input).onConflictDoNothing({
    target: [
      accountCalibrationInsightsTable.accountId,
      accountCalibrationInsightsTable.chronicleId,
    ],
  });
}

function primarySummary(
  row: typeof accountChroniclePrimaryOutcomesTable.$inferSelect,
): ChroniclePrimaryOutcomeSummary {
  return {
    chronicleId: row.chronicleId,
    definitionVersion: row.definitionVersion,
    outcomeId: row.outcomeId,
    result: row.result as ChroniclePrimaryOutcomeSummary["result"],
    roomId: row.roomId,
    completedAt: row.completedAt.toISOString(),
    lumeEarned: row.lumeEarned,
  };
}

function rehearsalSummary(
  row: typeof accountChronicleRehearsalsTable.$inferSelect,
): ChronicleRehearsalSummary {
  return {
    chronicleId: row.chronicleId,
    definitionVersion: row.definitionVersion,
    outcomeId: row.outcomeId,
    result: row.result as ChronicleRehearsalSummary["result"],
    roomId: row.roomId,
    completedAt: row.completedAt.toISOString(),
    preparednessObjectiveMet: row.preparednessObjectiveMet,
  };
}

async function persistChronicleHistoricalRecords(
  tx: Transaction,
  input: {
    accountId: string;
    primaryOutcomeId: string;
    chronicleId: string;
    definitionVersion: number;
    records: readonly ChronicleHistoricalRecordInput[];
    recordedAt: Date;
  },
): Promise<void> {
  if (input.records.length === 0) return;
  const recordKeys = new Set<string>();
  for (const record of input.records) {
    if (!record.recordKey.trim() || recordKeys.has(record.recordKey)) {
      throw new ChronicleCompletionError("Chronicle historical record keys must be unique", 400);
    }
    recordKeys.add(record.recordKey);
  }
  await tx.insert(accountChronicleHistoricalRecordsTable).values(input.records.map((record) => ({
    accountId: input.accountId,
    primaryOutcomeId: input.primaryOutcomeId,
    chronicleId: input.chronicleId,
    definitionVersion: input.definitionVersion,
    recordKind: record.recordKind,
    recordKey: record.recordKey,
    payload: record.payload,
    recordedAt: input.recordedAt,
  }))).onConflictDoNothing();
}

export async function completeChroniclePrimaryOutcome(
  input: CompleteChroniclePrimaryInput,
): Promise<ChronicleCompletionResult<ChroniclePrimaryOutcomeSummary>> {
  const outcome = authoredOutcome(input.definition, input.outcomeId);
  const authoringErrors = validateChronicleOutcomeAuthoring(outcome);
  if (authoringErrors.length > 0) {
    throw new ChronicleCompletionError(authoringErrors.join("; "), 400);
  }

  return db.transaction(async (tx) => {
    const rollup = await verifyFinishedScenario(tx, {
      accountId: input.accountId,
      roomId: input.roomId,
      matchInstanceId: input.matchInstanceId,
      scenarioId: input.definition.scenarioId,
      result: outcome.result,
    });
    const lumeEarned = input.definition.lumePolicy === "award" ? rollup.lumeEarned : 0;

    const [inserted] = await tx.insert(accountChroniclePrimaryOutcomesTable).values({
      accountId: input.accountId,
      chronicleId: outcome.chronicleId,
      definitionVersion: outcome.definitionVersion,
      roomId: input.roomId,
      matchInstanceId: input.matchInstanceId,
      outcomeId: outcome.outcomeId,
      result: outcome.result,
      lumeEarned,
      completedAt: input.completedAt ?? new Date(),
    }).onConflictDoNothing().returning();

    if (!inserted) {
      const [existing] = await tx.select()
        .from(accountChroniclePrimaryOutcomesTable)
        .where(and(
          eq(accountChroniclePrimaryOutcomesTable.accountId, input.accountId),
          eq(accountChroniclePrimaryOutcomesTable.chronicleId, outcome.chronicleId),
        ))
        .limit(1);
      if (!existing) {
        throw new ChronicleCompletionError("Chronicle completion conflicts with another match", 409);
      }
      await persistChronicleHistoricalRecords(tx, {
        accountId: input.accountId,
        primaryOutcomeId: existing.id,
        chronicleId: outcome.chronicleId,
        definitionVersion: outcome.definitionVersion,
        records: input.historicalRecords ?? [],
        recordedAt: input.completedAt ?? existing.completedAt,
      });
      return { record: primarySummary(existing), created: false };
    }

    await persistChronicleHistoricalRecords(tx, {
      accountId: input.accountId,
      primaryOutcomeId: inserted.id,
      chronicleId: outcome.chronicleId,
      definitionVersion: outcome.definitionVersion,
      records: input.historicalRecords ?? [],
      recordedAt: input.completedAt ?? inserted.completedAt,
    });

    if (outcome.facts.length > 0) {
      await tx.insert(accountCampaignFactsTable).values(outcome.facts.map((fact) => ({
        accountId: input.accountId,
        sourceKind: "primary",
        sourceRecordId: inserted.id,
        definitionVersion: outcome.definitionVersion,
        factKey: fact.key,
        value: fact.value,
        visibility: fact.visibility,
      }))).onConflictDoNothing();
    }
    if (outcome.dimensionContributions.length > 0) {
      await tx.insert(accountCampaignDimensionContributionsTable).values(
        outcome.dimensionContributions.map((contribution) => ({
          accountId: input.accountId,
          sourceKind: "primary",
          sourceRecordId: inserted.id,
          definitionVersion: outcome.definitionVersion,
          dimension: contribution.dimension,
          direction: contribution.direction,
          magnitude: contribution.magnitude,
          rationaleKey: contribution.rationaleKey,
          visibility: contribution.visibility,
        })),
      ).onConflictDoNothing();
    }
    if (outcome.lumiiMemories.length > 0) {
      await tx.insert(accountLumiiRelationshipMemoriesTable).values(
        outcome.lumiiMemories.map((memory) => ({
          accountId: input.accountId,
          sourceKind: "primary",
          sourceRecordId: inserted.id,
          definitionVersion: outcome.definitionVersion,
          memoryKey: memory.key,
          valence: memory.valence,
          detail: memory.detail ?? null,
          visibility: memory.visibility,
          simulation: false,
        })),
      ).onConflictDoNothing();
    }
    await grantEntitlements(tx, {
      accountId: input.accountId,
      chronicleId: outcome.chronicleId,
      sourceRecordId: inserted.id,
      entitlements: [
        ...outcome.baselineEntitlements,
        ...(outcome.expressionEntitlements ?? []),
      ],
    });
    if (input.preparednessObjectiveMet) {
      await grantCalibrationInsight(tx, {
        accountId: input.accountId,
        chronicleId: outcome.chronicleId,
        sourceKind: "primary",
        sourceRecordId: inserted.id,
      });
    }
    return { record: primarySummary(inserted), created: true };
  });
}

export async function completeChronicleRehearsal(
  input: CompleteChronicleRehearsalInput,
): Promise<ChronicleCompletionResult<ChronicleRehearsalSummary>> {
  const outcome = authoredOutcome(input.definition, input.outcomeId);
  const authoringErrors = validateChronicleOutcomeAuthoring(outcome);
  if (authoringErrors.length > 0) {
    throw new ChronicleCompletionError(authoringErrors.join("; "), 400);
  }
  const entitlements = input.entitlements ?? [];
  if (!rehearsalEntitlementsAreNonPower(entitlements)) {
    throw new ChronicleCompletionError("Rehearsals cannot grant competitive power", 400);
  }

  return db.transaction(async (tx) => {
    const rollup = await verifyFinishedScenario(tx, {
      accountId: input.accountId,
      roomId: input.roomId,
      matchInstanceId: input.matchInstanceId,
      scenarioId: input.definition.scenarioId,
      result: outcome.result,
    });
    if (rollup.lumeEarned !== 0) {
      throw new ChronicleCompletionError("Rehearsal closure must use a zero-Lume policy", 409);
    }
    const [primary] = await tx.select()
      .from(accountChroniclePrimaryOutcomesTable)
      .where(and(
        eq(accountChroniclePrimaryOutcomesTable.accountId, input.accountId),
        eq(accountChroniclePrimaryOutcomesTable.chronicleId, outcome.chronicleId),
      ))
      .limit(1);
    if (!primary) {
      throw new ChronicleCompletionError("A primary outcome is required before Rehearsal", 409);
    }

    const [inserted] = await tx.insert(accountChronicleRehearsalsTable).values({
      accountId: input.accountId,
      primaryOutcomeId: primary.id,
      chronicleId: outcome.chronicleId,
      definitionVersion: outcome.definitionVersion,
      roomId: input.roomId,
      matchInstanceId: input.matchInstanceId,
      outcomeId: outcome.outcomeId,
      result: outcome.result,
      preparednessObjectiveMet: input.preparednessObjectiveMet,
      completedAt: input.completedAt ?? new Date(),
    }).onConflictDoNothing().returning();

    if (!inserted) {
      const [existing] = await tx.select()
        .from(accountChronicleRehearsalsTable)
        .where(and(
          eq(accountChronicleRehearsalsTable.accountId, input.accountId),
          eq(accountChronicleRehearsalsTable.matchInstanceId, input.matchInstanceId),
        ))
        .limit(1);
      if (!existing) throw new ChronicleCompletionError("Rehearsal completion conflicts", 409);
      return { record: rehearsalSummary(existing), created: false };
    }

    await grantEntitlements(tx, {
      accountId: input.accountId,
      chronicleId: outcome.chronicleId,
      sourceRecordId: inserted.id,
      entitlements,
    });
    if (input.preparednessObjectiveMet) {
      await grantCalibrationInsight(tx, {
        accountId: input.accountId,
        chronicleId: outcome.chronicleId,
        sourceKind: "rehearsal",
        sourceRecordId: inserted.id,
      });
    }
    const rehearsalMemories = input.lumiiMemories ?? [];
    if (rehearsalMemories.length > 0) {
      await tx.insert(accountLumiiRelationshipMemoriesTable).values(
        rehearsalMemories.map((memory) => ({
          accountId: input.accountId,
          sourceKind: "rehearsal",
          sourceRecordId: inserted.id,
          definitionVersion: outcome.definitionVersion,
          memoryKey: memory.key,
          valence: memory.valence,
          detail: memory.detail ?? null,
          visibility: memory.visibility,
          simulation: true,
        })),
      ).onConflictDoNothing();
    }
    return { record: rehearsalSummary(inserted), created: true };
  });
}

export async function readCampaignProgress(
  accountId: string,
  releasedChronicleIds: readonly string[] = RELEASED_PRIMARY_CHRONICLE_IDS,
): Promise<CampaignProgressProjection> {
  const [primaryRows, rehearsalRows, insightRows] = await Promise.all([
    db.select().from(accountChroniclePrimaryOutcomesTable)
      .where(eq(accountChroniclePrimaryOutcomesTable.accountId, accountId))
      .orderBy(asc(accountChroniclePrimaryOutcomesTable.completedAt)),
    db.select().from(accountChronicleRehearsalsTable)
      .where(eq(accountChronicleRehearsalsTable.accountId, accountId))
      .orderBy(asc(accountChronicleRehearsalsTable.completedAt)),
    db.select({ chronicleId: accountCalibrationInsightsTable.chronicleId })
      .from(accountCalibrationInsightsTable)
      .where(eq(accountCalibrationInsightsTable.accountId, accountId)),
  ]);

  return buildCampaignProgressProjection({
    releasedChronicleIds,
    primaryOutcomes: primaryRows.map(primarySummary),
    rehearsals: rehearsalRows.map(rehearsalSummary),
    calibrationInsightChronicleIds: insightRows.map((row) => row.chronicleId),
  });
}

export async function readPrivateCampaignEvidence(
  authenticatedAccountId: string,
  requestedAccountId: string,
) {
  if (authenticatedAccountId !== requestedAccountId) {
    throw new ChronicleCompletionError("Campaign evidence is account-private", 403);
  }
  const [facts, dimensions, lumiiMemories] = await Promise.all([
    db.select().from(accountCampaignFactsTable)
      .where(eq(accountCampaignFactsTable.accountId, requestedAccountId)),
    db.select().from(accountCampaignDimensionContributionsTable)
      .where(eq(accountCampaignDimensionContributionsTable.accountId, requestedAccountId)),
    db.select().from(accountLumiiRelationshipMemoriesTable)
      .where(eq(accountLumiiRelationshipMemoriesTable.accountId, requestedAccountId)),
  ]);
  return { facts, dimensions, lumiiMemories };
}
