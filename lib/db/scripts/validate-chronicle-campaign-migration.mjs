import fs from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const migrationUrl = new URL("../migrations/0016_chronicle_campaign_foundation.sql", import.meta.url);
const migrationSql = await fs.readFile(migrationUrl, "utf8");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for rollback-only migration validation.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertFinalShape(client, fixtureName) {
  const tableResult = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name IN (
        'account_chronicle_primary_outcomes',
        'account_chronicle_rehearsals',
        'account_calibration_insights',
        'account_campaign_facts',
        'account_campaign_dimension_contributions',
        'account_lumii_relationship_memories'
      )
  `);
  assert(tableResult.rowCount === 6, `${fixtureName}: all six campaign ledgers must exist`);

  const ruptureResult = await client.query(`
    SELECT threshold_ruptured_at, covenant_broken_at
    FROM account_blueprint_clearance
    WHERE account_id = '00000000-0000-4000-8000-000000000001'
  `);
  assert(
    ruptureResult.rows[0]?.threshold_ruptured_at?.toISOString() ===
      ruptureResult.rows[0]?.covenant_broken_at?.toISOString(),
    `${fixtureName}: legacy Covenant timestamp must backfill Threshold rupture`,
  );

  const indexes = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname IN (
        'account_chronicle_primary_outcomes_account_chronicle_idx',
        'account_chronicle_primary_outcomes_account_match_idx',
        'account_chronicle_rehearsals_account_match_idx',
        'account_calibration_insights_account_chronicle_idx',
        'account_campaign_facts_source_fact_idx',
        'account_campaign_dimension_contributions_source_idx',
        'account_lumii_relationship_memories_source_memory_idx'
      )
  `);
  assert(indexes.rowCount === 7, `${fixtureName}: all idempotency indexes must exist`);
}

async function runFixture(name, includeThresholdColumn) {
  const client = await pool.connect();
  const schema = `migration_0016_${name.replaceAll("-", "_")}_${process.pid}`;
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    await client.query(`CREATE TABLE accounts (id uuid PRIMARY KEY)`);
    await client.query(`
      CREATE TABLE account_blueprint_clearance (
        account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE cascade,
        covenant_broken_at timestamp with time zone
        ${includeThresholdColumn ? ", threshold_ruptured_at timestamp with time zone" : ""}
      )
    `);
    await client.query(`INSERT INTO accounts (id) VALUES ('00000000-0000-4000-8000-000000000001')`);
    await client.query(`
      INSERT INTO account_blueprint_clearance (account_id, covenant_broken_at)
      VALUES ('00000000-0000-4000-8000-000000000001', '2026-08-23T12:00:00Z')
    `);

    await client.query(migrationSql);
    await assertFinalShape(client, name);
    await client.query(migrationSql);
    await assertFinalShape(client, `${name}:repeat`);

    const primary = await client.query(`
      INSERT INTO account_chronicle_primary_outcomes (
        account_id, chronicle_id, definition_version, match_instance_id, outcome_id, result
      ) VALUES (
        '00000000-0000-4000-8000-000000000001', 'chronicle_trace', 1,
        'fixture:primary', 'trace_defeat', 'defeat'
      ) RETURNING id
    `);
    await client.query(`
      INSERT INTO account_chronicle_rehearsals (
        account_id, primary_outcome_id, chronicle_id, definition_version,
        match_instance_id, outcome_id, result
      ) VALUES (
        '00000000-0000-4000-8000-000000000001', $1, 'chronicle_trace', 1,
        'fixture:rehearsal', 'trace_victory', 'victory'
      )
    `, [primary.rows[0].id]);
    console.log(`PASS ${name}`);
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
  }
}

try {
  await runFixture("legacy", false);
  await runFixture("column-present", true);
} finally {
  await pool.end();
}
