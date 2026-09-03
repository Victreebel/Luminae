import { and, eq, gte, sql } from "drizzle-orm";
import {
  accountEngagementTable,
  accountLumeTransactionsTable,
  db,
} from "@workspace/db";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type LumeTransactionCategory = "earned" | "purchased" | "granted" | "spent" | "refunded";

export class InsufficientLumeError extends Error {}

export interface ApplyLumeTransactionInput {
  accountId: string;
  amount: number;
  source: string;
  category: LumeTransactionCategory;
  idempotencyKey: string;
  externalReference?: string | null;
  metadata?: Record<string, unknown>;
}

function validateSignedAmount(input: ApplyLumeTransactionInput): number {
  const amount = Math.trunc(input.amount);
  if (!Number.isFinite(input.amount) || amount === 0) {
    throw new Error("Lume transactions require a nonzero integer amount");
  }
  const positive = input.category === "earned" || input.category === "purchased" || input.category === "granted";
  if ((positive && amount < 0) || (!positive && amount > 0)) {
    throw new Error(`Lume ${input.category} amount has the wrong sign`);
  }
  return amount;
}

function lifetimeUpdate(category: LumeTransactionCategory, amount: number) {
  const magnitude = Math.abs(amount);
  if (category === "earned") {
    return { lifetimeEarnedLume: sql`${accountEngagementTable.lifetimeEarnedLume} + ${magnitude}` };
  }
  if (category === "purchased") {
    return { lifetimePurchasedLume: sql`${accountEngagementTable.lifetimePurchasedLume} + ${magnitude}` };
  }
  if (category === "granted") {
    return { lifetimeGrantedLume: sql`${accountEngagementTable.lifetimeGrantedLume} + ${magnitude}` };
  }
  if (category === "spent") {
    return { lifetimeSpentLume: sql`${accountEngagementTable.lifetimeSpentLume} + ${magnitude}` };
  }
  return { lifetimeRefundedLume: sql`${accountEngagementTable.lifetimeRefundedLume} + ${magnitude}` };
}

export async function applyLumeTransaction(
  tx: Transaction,
  input: ApplyLumeTransactionInput,
): Promise<{ applied: boolean; balance: number; transactionId: string }> {
  const amount = validateSignedAmount(input);
  await tx.insert(accountEngagementTable)
    .values({ accountId: input.accountId })
    .onConflictDoNothing({ target: accountEngagementTable.accountId });

  const [pending] = await tx.insert(accountLumeTransactionsTable).values({
    accountId: input.accountId,
    source: input.source,
    category: input.category,
    amount,
    balanceAfter: null,
    idempotencyKey: input.idempotencyKey,
    externalReference: input.externalReference ?? null,
    metadata: input.metadata ?? {},
  }).onConflictDoNothing({
    target: accountLumeTransactionsTable.idempotencyKey,
  }).returning({ id: accountLumeTransactionsTable.id });

  if (!pending) {
    const [existing] = await tx.select({
      id: accountLumeTransactionsTable.id,
      balanceAfter: accountLumeTransactionsTable.balanceAfter,
    }).from(accountLumeTransactionsTable)
      .where(eq(accountLumeTransactionsTable.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (!existing || existing.balanceAfter === null) {
      throw new Error("Lume transaction is already being applied");
    }
    return { applied: false, balance: existing.balanceAfter, transactionId: existing.id };
  }

  const updateWhere = input.category === "spent"
    ? and(
        eq(accountEngagementTable.accountId, input.accountId),
        gte(accountEngagementTable.lumeBalance, Math.abs(amount)),
      )
    : eq(accountEngagementTable.accountId, input.accountId);
  const [engagement] = await tx.update(accountEngagementTable).set({
    lumeBalance: sql`${accountEngagementTable.lumeBalance} + ${amount}`,
    ...lifetimeUpdate(input.category, amount),
    updatedAt: new Date(),
  }).where(updateWhere).returning({ balance: accountEngagementTable.lumeBalance });

  if (!engagement) throw new InsufficientLumeError("Not enough Lume");

  await tx.update(accountLumeTransactionsTable)
    .set({ balanceAfter: engagement.balance })
    .where(eq(accountLumeTransactionsTable.id, pending.id));

  return { applied: true, balance: engagement.balance, transactionId: pending.id };
}
