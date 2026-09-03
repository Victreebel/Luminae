ALTER TABLE "account_match_rollups"
  ADD COLUMN IF NOT EXISTS "civilization_identity_snapshot" jsonb;

ALTER TABLE "account_archive_summary"
  ADD COLUMN IF NOT EXISTS "highest_kardashev_type" integer DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS "account_civilization_identity" (
  "account_id" uuid PRIMARY KEY NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "lineage" text,
  "affinity" text,
  "signature_artifact_id" text,
  "signature_luminary_id" text,
  "signature_blueprint_id" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

UPDATE "account_blueprint_clearance"
SET "status" = 'classified', "updated_at" = now()
WHERE
  "status" = 'challenge_ready'
  AND "qualifying_wins" < 5
  AND "decryption_key_bypass_active_at" IS NULL;
