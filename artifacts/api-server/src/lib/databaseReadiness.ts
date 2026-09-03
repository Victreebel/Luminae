import { pool } from "@workspace/db";

const REQUIRED_TABLES = [
  "account_campaign_progress",
  "account_civilization_identity",
  "account_match_rollups",
  "first_party_events",
] as const;

export async function assertDatabaseReady(): Promise<void> {
  const result = await pool.query<{ table_name: string; relation: string | null }>(
    `SELECT table_name, to_regclass('public.' || table_name)::text AS relation
       FROM unnest($1::text[]) AS required(table_name)`,
    [[...REQUIRED_TABLES]],
  );
  const missing = result.rows
    .filter((row) => row.relation === null)
    .map((row) => row.table_name);

  if (missing.length > 0) {
    throw new Error(`Database migrations are incomplete. Missing: ${missing.join(", ")}`);
  }
}
