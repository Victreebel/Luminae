import fs from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const lumeSql = await fs.readFile(new URL("../migrations/0018_lume_ledger.sql", import.meta.url), "utf8");
const safetySql = await fs.readFile(new URL("../migrations/0019_release_safety_operations.sql", import.meta.url), "utf8");
const victoryRequirementSql = await fs.readFile(
  new URL("../migrations/0020_default_victory_requirement.sql", import.meta.url),
  "utf8",
);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for rollback-only release migration validation.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const accountId = "00000000-0000-4000-8000-000000000018";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const client = await pool.connect();
const schema = `release_migrations_${process.pid}`;
try {
  await client.query("BEGIN");
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET LOCAL search_path TO ${schema}`);
  await client.query(`CREATE TABLE accounts (id uuid PRIMARY KEY)`);
  await client.query(`
    CREATE TABLE rooms (
      id uuid PRIMARY KEY,
      victory_requirement integer DEFAULT 15 NOT NULL
    )
  `);
  await client.query(`
    CREATE TABLE account_engagement (
      account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE cascade,
      cosmetic_balance integer DEFAULT 0 NOT NULL
    )
  `);
  await client.query(`INSERT INTO accounts (id) VALUES ($1)`, [accountId]);
  await client.query(`INSERT INTO account_engagement (account_id, cosmetic_balance) VALUES ($1, 275)`, [accountId]);

  await client.query(lumeSql);
  await client.query(lumeSql);
  await client.query(safetySql);
  await client.query(safetySql);
  await client.query(victoryRequirementSql);
  await client.query(victoryRequirementSql);

  const engagement = await client.query(`
    SELECT lume_balance, lifetime_granted_lume
    FROM account_engagement
    WHERE account_id = $1
  `, [accountId]);
  assert(engagement.rows[0]?.lume_balance === 275, "legacy spendable balance was not preserved");
  assert(engagement.rows[0]?.lifetime_granted_lume === 275, "legacy balance provenance was not preserved");

  const opening = await client.query(`
    SELECT amount, balance_after
    FROM account_lume_transactions
    WHERE idempotency_key = $1
  `, [`legacy-opening:${accountId}`]);
  assert(opening.rowCount === 1, "legacy opening ledger entry must be idempotent");
  assert(opening.rows[0]?.amount === 275 && opening.rows[0]?.balance_after === 275,
    "legacy opening ledger entry must match the preserved balance");

  const requiredTables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = $1
      AND table_name IN (
        'account_lume_transactions',
        'account_native_purchases',
        'account_blocks',
        'moderation_reports',
        'moderation_events',
        'account_deletion_requests',
        'telemetry_events'
      )
  `, [schema]);
  assert(requiredTables.rowCount === 7, "all release ledger, purchase, safety, and telemetry tables must exist");
  const roomDefault = await client.query(`
    INSERT INTO rooms (id)
    VALUES ('00000000-0000-4000-8000-000000000020')
    RETURNING victory_requirement
  `);
  assert(
    roomDefault.rows[0]?.victory_requirement === 20,
    "new rooms must default to the 20-Eminence standard target",
  );
  console.log("Release migrations preserve balances and are repeatable in the supported partial-upgrade fixture.");
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  client.release();
  await pool.end();
}
