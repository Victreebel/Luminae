CREATE TABLE IF NOT EXISTS "account_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "blocker_account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "blocked_account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_blocks_pair_idx"
  ON "account_blocks" ("blocker_account_id", "blocked_account_id");

CREATE TABLE IF NOT EXISTS "moderation_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reporter_account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "reported_account_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL,
  "room_id" uuid,
  "reported_player_id" uuid,
  "category" text NOT NULL,
  "evidence_text" text,
  "evidence_timestamp" timestamp with time zone,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "moderation_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL,
  "room_id" uuid,
  "player_id" uuid,
  "event_type" text NOT NULL,
  "detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "account_deletion_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending' NOT NULL,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "execute_after" timestamp with time zone NOT NULL,
  "cancelled_at" timestamp with time zone,
  "completed_at" timestamp with time zone
);
CREATE UNIQUE INDEX IF NOT EXISTS "account_deletion_requests_account_idx"
  ON "account_deletion_requests" ("account_id");

CREATE TABLE IF NOT EXISTS "telemetry_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL,
  "session_id" text NOT NULL,
  "event_name" text NOT NULL,
  "platform" text NOT NULL,
  "client_build" text,
  "detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "telemetry_events_name_received_idx"
  ON "telemetry_events" ("event_name", "received_at");
