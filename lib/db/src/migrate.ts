import { fileURLToPath } from "node:url";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
const LEGACY_BASELINE_INDEX = 14;

const REQUIRED_BASELINE_TABLES = [
  "accounts",
  "account_sessions",
  "rooms",
  "players",
  "friendships",
  "account_entitlements",
  "account_engagement",
  "account_cosmetic_loadout_items",
  "account_blueprint_clearance",
  "account_blueprint_unlocks",
  "account_blueprint_loadouts",
  "account_blueprint_stats",
  "account_match_rollups",
  "account_archive_summary",
  "account_archive_artifact_stats",
  "account_archive_luminary_stats",
] as const;

const REQUIRED_BASELINE_COLUMNS = [
  ["accounts", "skip_cinematics"],
  ["accounts", "abridged_anims"],
  ["accounts", "hints_enabled"],
  ["accounts", "muted"],
  ["accounts", "hints_seen"],
  ["accounts", "tutorial_seen"],
  ["accounts", "tutorial_completed"],
  ["rooms", "victory_requirement"],
  ["rooms", "cinematic_mode"],
  ["rooms", "game_mode"],
  ["rooms", "scenario_id"],
  ["rooms", "blueprint_policy"],
  ["account_blueprint_clearance", "covenant_broken_at"],
  ["account_blueprint_clearance", "vault_reveal_seen_at"],
  ["account_blueprint_clearance", "cipher_deactivated_at"],
  ["account_blueprint_clearance", "threshold_approach"],
  ["account_blueprint_clearance", "threshold_dialogue_path"],
  ["account_blueprint_clearance", "threshold_dialogue_resolution"],
  ["account_blueprint_clearance", "decryption_key_bypass_active_at"],
] as const;

async function baselineLegacyPushDatabase(): Promise<void> {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const journalResult = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations`,
  );
  if (Number(journalResult.rows[0]?.count ?? 0) > 0) return;

  const legacyResult = await pool.query<{ accountSessions: string | null }>(
    `SELECT to_regclass('public.account_sessions')::text AS "accountSessions"`,
  );
  if (!legacyResult.rows[0]?.accountSessions) return;

  const [tableResult, columnResult, retiredTableResult] = await Promise.all([
    pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    ),
    pool.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
    ),
    pool.query<{ retired: string | null }>(
      `SELECT to_regclass('public.account_cosmetic_loadouts')::text AS retired`,
    ),
  ]);
  const tables = new Set(tableResult.rows.map((row) => row.table_name));
  const columns = new Set(
    columnResult.rows.map((row) => `${row.table_name}.${row.column_name}`),
  );
  const missingTables = REQUIRED_BASELINE_TABLES.filter((table) => !tables.has(table));
  const missingColumns = REQUIRED_BASELINE_COLUMNS
    .map(([table, column]) => `${table}.${column}`)
    .filter((column) => !columns.has(column));
  const retiredTableStillPresent = retiredTableResult.rows[0]?.retired != null;

  if (missingTables.length || missingColumns.length || retiredTableStillPresent) {
    const reasons = [
      missingTables.length ? `missing tables: ${missingTables.join(", ")}` : null,
      missingColumns.length ? `missing columns: ${missingColumns.join(", ")}` : null,
      retiredTableStillPresent ? "retired table still present: account_cosmetic_loadouts" : null,
    ].filter(Boolean);
    throw new Error(
      `Existing database has no migration history and cannot be baselined (${reasons.join("; ")})`,
    );
  }

  const baseline = readMigrationFiles({ migrationsFolder }).slice(0, LEGACY_BASELINE_INDEX + 1);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const migration of baseline) {
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [migration.hash, migration.folderMillis],
      );
    }
    await client.query("COMMIT");
    console.log(`Baselined ${baseline.length} verified legacy migrations.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

try {
  await baselineLegacyPushDatabase();
  await migrate(db, { migrationsFolder });
  console.log("Database migrations complete.");
} finally {
  await pool.end();
}
