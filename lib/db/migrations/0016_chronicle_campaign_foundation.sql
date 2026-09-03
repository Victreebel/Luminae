ALTER TABLE "account_blueprint_clearance"
ADD COLUMN IF NOT EXISTS "threshold_ruptured_at" timestamp with time zone;

UPDATE "account_blueprint_clearance"
SET "threshold_ruptured_at" = "covenant_broken_at"
WHERE "threshold_ruptured_at" IS NULL
  AND "covenant_broken_at" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "account_chronicle_primary_outcomes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "chronicle_id" text NOT NULL,
  "definition_version" integer NOT NULL,
  "room_id" uuid,
  "match_instance_id" text NOT NULL,
  "outcome_id" text NOT NULL,
  "result" text NOT NULL,
  "lume_earned" integer DEFAULT 0 NOT NULL,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_chronicle_primary_outcomes_account_chronicle_idx"
  ON "account_chronicle_primary_outcomes" ("account_id", "chronicle_id");
CREATE UNIQUE INDEX IF NOT EXISTS "account_chronicle_primary_outcomes_account_match_idx"
  ON "account_chronicle_primary_outcomes" ("account_id", "match_instance_id");

CREATE TABLE IF NOT EXISTS "account_chronicle_rehearsals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "primary_outcome_id" uuid NOT NULL REFERENCES "account_chronicle_primary_outcomes"("id") ON DELETE cascade,
  "chronicle_id" text NOT NULL,
  "definition_version" integer NOT NULL,
  "room_id" uuid,
  "match_instance_id" text NOT NULL,
  "outcome_id" text NOT NULL,
  "result" text NOT NULL,
  "preparedness_objective_met" boolean DEFAULT false NOT NULL,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_chronicle_rehearsals_account_match_idx"
  ON "account_chronicle_rehearsals" ("account_id", "match_instance_id");

CREATE TABLE IF NOT EXISTS "account_calibration_insights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "chronicle_id" text NOT NULL,
  "source_kind" text NOT NULL,
  "source_record_id" uuid NOT NULL,
  "earned_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_calibration_insights_account_chronicle_idx"
  ON "account_calibration_insights" ("account_id", "chronicle_id");

CREATE TABLE IF NOT EXISTS "account_campaign_facts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "source_kind" text NOT NULL,
  "source_record_id" uuid NOT NULL,
  "definition_version" integer NOT NULL,
  "fact_key" text NOT NULL,
  "value" jsonb NOT NULL,
  "visibility" text NOT NULL,
  "supersedes_fact_id" uuid,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_campaign_facts_source_fact_idx"
  ON "account_campaign_facts" ("account_id", "source_kind", "source_record_id", "fact_key");

CREATE TABLE IF NOT EXISTS "account_campaign_dimension_contributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "source_kind" text NOT NULL,
  "source_record_id" uuid NOT NULL,
  "definition_version" integer NOT NULL,
  "dimension" text NOT NULL,
  "direction" text NOT NULL,
  "magnitude" integer NOT NULL,
  "rationale_key" text NOT NULL,
  "visibility" text NOT NULL,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_campaign_dimension_contributions_source_idx"
  ON "account_campaign_dimension_contributions"
  ("account_id", "source_kind", "source_record_id", "dimension", "rationale_key");

CREATE TABLE IF NOT EXISTS "account_lumii_relationship_memories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "source_kind" text NOT NULL,
  "source_record_id" uuid NOT NULL,
  "definition_version" integer NOT NULL,
  "memory_key" text NOT NULL,
  "valence" integer DEFAULT 0 NOT NULL,
  "detail" jsonb,
  "visibility" text NOT NULL,
  "simulation" boolean DEFAULT false NOT NULL,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_lumii_relationship_memories_source_memory_idx"
  ON "account_lumii_relationship_memories"
  ("account_id", "source_kind", "source_record_id", "memory_key");
