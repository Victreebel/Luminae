ALTER TABLE "account_blueprint_clearance"
  ADD COLUMN IF NOT EXISTS "covenant_broken_at" timestamp with time zone;

ALTER TABLE "account_blueprint_clearance"
  ADD COLUMN IF NOT EXISTS "vault_reveal_seen_at" timestamp with time zone;
