import fs from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const migrationUrl = new URL("../migrations/0015_civilization_records.sql", import.meta.url);
const migrationSql = await fs.readFile(migrationUrl, "utf8");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for rollback-only migration validation.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function columnMap(client) {
  const result = await client.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name IN ('account_match_rollups', 'account_archive_summary')
    ORDER BY table_name, ordinal_position
  `);
  return new Map(result.rows.map((row) => [`${row.table_name}.${row.column_name}`, row]));
}

async function assertFinalShape(client, fixtureName) {
  const columns = await columnMap(client);
  const record = columns.get("account_match_rollups.civilization_record");
  const lume = columns.get("account_match_rollups.lume_earned");
  const totalLume = columns.get("account_archive_summary.total_lume");

  assert(record?.data_type === "jsonb", `${fixtureName}: civilization_record must be jsonb`);
  assert(record?.is_nullable === "YES", `${fixtureName}: civilization_record must remain nullable`);
  assert(lume?.data_type === "integer", `${fixtureName}: lume_earned must be integer`);
  assert(lume?.is_nullable === "NO", `${fixtureName}: lume_earned must be non-null`);
  assert(lume?.column_default?.includes("0"), `${fixtureName}: lume_earned must default to zero`);
  assert(totalLume?.data_type === "integer", `${fixtureName}: total_lume must be integer`);
  assert(totalLume?.is_nullable === "NO", `${fixtureName}: total_lume must be non-null`);
  assert(totalLume?.column_default?.includes("0"), `${fixtureName}: total_lume must default to zero`);

  const rollup = await client.query(`
    SELECT civilization_record, lume_earned
    FROM account_match_rollups
    WHERE id = 'fixture-rollup'
  `);
  const summary = await client.query(`
    SELECT total_lume
    FROM account_archive_summary
    WHERE account_id = 'fixture-account'
  `);
  assert(rollup.rows[0]?.civilization_record === null, `${fixtureName}: existing record must backfill null`);
  assert(rollup.rows[0]?.lume_earned === 0, `${fixtureName}: existing rollup must backfill zero Lume`);
  assert(summary.rows[0]?.total_lume === 0, `${fixtureName}: existing summary must backfill zero Lume`);
}

async function runFixture(name, prepare) {
  const client = await pool.connect();
  const schema = `migration_0015_${name}_${process.pid}`;
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    await client.query(`CREATE TABLE account_match_rollups (id text PRIMARY KEY)`);
    await client.query(`CREATE TABLE account_archive_summary (account_id text PRIMARY KEY)`);
    await prepare(client);
    await client.query(`INSERT INTO account_match_rollups (id) VALUES ('fixture-rollup')`);
    await client.query(`INSERT INTO account_archive_summary (account_id) VALUES ('fixture-account')`);
    await client.query(migrationSql);
    await assertFinalShape(client, name);
    await client.query(migrationSql);
    await assertFinalShape(client, `${name}:repeat`);
    console.log(`PASS ${name}`);
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
  }
}

try {
  await runFixture("fresh", async () => undefined);
  await runFixture("partial", async (client) => {
    await client.query(`ALTER TABLE account_match_rollups ADD COLUMN civilization_record jsonb`);
  });
  await runFixture("complete", async (client) => {
    await client.query(`ALTER TABLE account_match_rollups ADD COLUMN civilization_record jsonb`);
    await client.query(`ALTER TABLE account_match_rollups ADD COLUMN lume_earned integer DEFAULT 0 NOT NULL`);
    await client.query(`ALTER TABLE account_archive_summary ADD COLUMN total_lume integer DEFAULT 0 NOT NULL`);
  });
} finally {
  await pool.end();
}
