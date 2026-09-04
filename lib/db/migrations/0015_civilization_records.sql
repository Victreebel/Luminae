ALTER TABLE "account_match_rollups"
ADD COLUMN IF NOT EXISTS "civilization_record" jsonb,
ADD COLUMN IF NOT EXISTS "lume_earned" integer DEFAULT 0 NOT NULL;

ALTER TABLE "account_archive_summary"
ADD COLUMN IF NOT EXISTS "total_lume" integer DEFAULT 0 NOT NULL;
