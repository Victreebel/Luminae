CREATE TABLE IF NOT EXISTS "account_campaign_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "campaign_id" text NOT NULL,
  "current_node_id" text DEFAULT 'first_contact' NOT NULL,
  "tutorial_completed_at" timestamp with time zone,
  "first_contact_stance" text,
  "last_onboarding_claim_id" uuid,
  "backfill_version" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "account_campaign_progress_stance_check" CHECK ("first_contact_stance" IS NULL OR "first_contact_stance" IN ('curious', 'guarded', 'resolute'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_campaign_progress_account_campaign_idx" ON "account_campaign_progress" USING btree ("account_id", "campaign_id");

CREATE TABLE IF NOT EXISTS "account_campaign_nodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "campaign_id" text NOT NULL,
  "node_id" text NOT NULL,
  "status" text DEFAULT 'locked' NOT NULL,
  "activated_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "account_campaign_nodes_status_check" CHECK ("status" IN ('locked', 'available', 'active', 'completed', 'future'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_campaign_nodes_account_node_idx" ON "account_campaign_nodes" USING btree ("account_id", "campaign_id", "node_id");

CREATE TABLE IF NOT EXISTS "account_campaign_choices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "campaign_id" text NOT NULL,
  "claim_id" uuid NOT NULL,
  "choice_id" text NOT NULL,
  "value" text NOT NULL,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_campaign_choices_claim_idx" ON "account_campaign_choices" USING btree ("account_id", "campaign_id", "claim_id", "choice_id");

CREATE TABLE IF NOT EXISTS "account_campaign_presentations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "campaign_id" text NOT NULL,
  "presentation_id" text NOT NULL,
  "kind" text NOT NULL,
  "ordinal" integer NOT NULL,
  "acknowledged_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "account_campaign_presentations_kind_check" CHECK ("kind" IN ('clearance_signal', 'clearance_recap'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_campaign_presentations_account_presentation_idx" ON "account_campaign_presentations" USING btree ("account_id", "campaign_id", "presentation_id");

CREATE TABLE IF NOT EXISTS "first_party_events" (
  "id" uuid PRIMARY KEY NOT NULL,
  "account_id" uuid REFERENCES "accounts"("id") ON DELETE set null,
  "anonymous_session_id" uuid,
  "event_name" text NOT NULL,
  "chapter_id" text,
  "beat_id" text,
  "action_id" text,
  "outcome" text,
  "ordinal" integer,
  "duration_ms" integer,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "first_party_events_occurred_at_idx" ON "first_party_events" USING btree ("occurred_at");

CREATE OR REPLACE VIEW "onboarding_daily_funnel" AS
SELECT
  date_trunc('day', "occurred_at") AS "day",
  "event_name",
  count(*)::integer AS "event_count",
  count(DISTINCT COALESCE("account_id"::text, "anonymous_session_id"::text))::integer AS "participants"
FROM "first_party_events"
WHERE "occurred_at" >= now() - interval '90 days'
GROUP BY 1, 2;
