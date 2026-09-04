import { and, eq, lte } from "drizzle-orm";
import { accountDeletionRequestsTable, accountsTable, db, pool } from "@workspace/db";
import { logger } from "../lib/logger";

async function run(): Promise<void> {
  const due = await db.select({ accountId: accountDeletionRequestsTable.accountId })
    .from(accountDeletionRequestsTable)
    .where(and(
      eq(accountDeletionRequestsTable.status, "pending"),
      lte(accountDeletionRequestsTable.executeAfter, new Date()),
  ));
  for (const row of due) {
    const deleted = await db.transaction(async (tx) => {
      const [request] = await tx.select()
        .from(accountDeletionRequestsTable)
        .where(eq(accountDeletionRequestsTable.accountId, row.accountId))
        .limit(1)
        .for("update");
      if (request?.status !== "pending" || request.executeAfter > new Date()) return false;
      await tx.delete(accountsTable).where(eq(accountsTable.id, row.accountId));
      return true;
    });
    if (deleted) logger.info({ accountId: row.accountId }, "Account deletion completed");
  }
  logger.info({ deletedAccounts: due.length }, "Account deletion pass completed");
}

run()
  .catch((error) => {
    logger.error({ error }, "Account deletion pass failed");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
