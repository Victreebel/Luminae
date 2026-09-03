import { accountsTable, db, pool } from "@workspace/db";
import { ensureAccountProgressBackfilled } from "../lib/accountProgress";

async function main(): Promise<void> {
  const accounts = await db.select({ id: accountsTable.id }).from(accountsTable);
  let completed = 0;

  for (const account of accounts) {
    await ensureAccountProgressBackfilled(account.id);
    completed += 1;
  }

  console.log(`Account progress backfill complete: ${completed}/${accounts.length}.`);
}

main()
  .catch((error: unknown) => {
    console.error("Account progress backfill failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
