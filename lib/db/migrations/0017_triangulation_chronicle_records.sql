CREATE TABLE IF NOT EXISTS "account_chronicle_historical_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "primary_outcome_id" uuid NOT NULL REFERENCES "account_chronicle_primary_outcomes"("id") ON DELETE cascade,
  "chronicle_id" text NOT NULL,
  "definition_version" integer NOT NULL,
  "record_kind" text NOT NULL,
  "record_key" text NOT NULL,
  "payload" jsonb NOT NULL,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "account_chronicle_historical_records_primary_record_idx"
  ON "account_chronicle_historical_records" ("primary_outcome_id", "record_key");
