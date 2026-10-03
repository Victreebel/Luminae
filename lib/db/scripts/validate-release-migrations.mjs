import fs from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const lumeSql = await fs.readFile(new URL("../migrations/0018_lume_ledger.sql", import.meta.url), "utf8");
const safetySql = await fs.readFile(new URL("../migrations/0019_release_safety_operations.sql", import.meta.url), "utf8");
const victoryRequirementSql = await fs.readFile(
  new URL("../migrations/0020_default_victory_requirement.sql", import.meta.url),
  "utf8",
);
const eventFrequencySql = await fs.readFile(
  new URL("../migrations/0022_room_event_frequency.sql", import.meta.url),
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
      victory_requirement integer DEFAULT 15 NOT NULL,
      game_mode text NOT NULL DEFAULT 'standard',
      scenario_id text
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
  await client.query(`
    INSERT INTO rooms (id, game_mode, scenario_id) VALUES
      ('00000000-0000-4000-8000-000000000021', 'campaign', 'chronicle_trace'),
      ('00000000-0000-4000-8000-000000000022', 'standard', NULL)
  `);
  await client.query(eventFrequencySql);
  await client.query(`
    UPDATE rooms SET event_frequency = 'frequent'
    WHERE id = '00000000-0000-4000-8000-000000000022'
  `);
  await client.query(eventFrequencySql);
  const eventSettings = await client.query(`
    SELECT event_frequency FROM rooms ORDER BY id
  `);
  assert(eventSettings.rows[0]?.event_frequency === "off", "authored scenario rooms must exclude random Events");
  assert(eventSettings.rows[1]?.event_frequency === "frequent", "reapplying migration must preserve regular room choices");

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
    RETURNING victory_requirement, event_frequency
  `);
  assert(
    roomDefault.rows[0]?.victory_requirement === 20,
    "new rooms must default to the 20-Eminence standard target",
  );
  assert(roomDefault.rows[0]?.event_frequency === "standard", "new regular rooms must default to standard Event frequency");
  await client.query("SAVEPOINT invalid_event_frequency");
  let rejectedInvalidFrequency = false;
  try {
    await client.query(`UPDATE rooms SET event_frequency = 'unlimited'`);
  } catch (error) {
    rejectedInvalidFrequency = error.code === "23514";
    await client.query("ROLLBACK TO SAVEPOINT invalid_event_frequency");
  }
  assert(rejectedInvalidFrequency, "unsupported Event settings must fail the database constraint");
  console.log("Release migrations preserve balances and are repeatable in the supported partial-upgrade fixture.");
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  client.release();
  await pool.end();
}
