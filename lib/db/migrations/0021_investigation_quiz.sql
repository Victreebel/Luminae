CREATE TABLE IF NOT EXISTS "account_investigation_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "investigation_id" text NOT NULL,
  "definition_version" integer NOT NULL,
  "discoveries" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "completed_at" timestamp with time zone,
  "completion_lume_awarded" integer DEFAULT 0 NOT NULL,
  "quiz_answers" jsonb,
  "quiz_score" integer,
  "quiz_offered_question_count" integer,
  "quiz_lume_awarded" integer DEFAULT 0 NOT NULL,
  "quiz_submitted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "account_investigation_progress_account_investigation_idx"
  ON "account_investigation_progress" ("account_id", "investigation_id");

CREATE INDEX IF NOT EXISTS "telemetry_events_received_at_idx"
  ON "telemetry_events" ("received_at");

CREATE INDEX IF NOT EXISTS "telemetry_events_funnel_idx"
  ON "telemetry_events" ("event_name", "occurred_at");
