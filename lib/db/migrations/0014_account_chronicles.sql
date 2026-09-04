CREATE TABLE IF NOT EXISTS "account_chronicle_unlocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "chronicle_id" text NOT NULL,
  "source" text NOT NULL,
  "unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_chronicle_unlocks_account_chronicle_idx"
  ON "account_chronicle_unlocks" ("account_id","chronicle_id");
