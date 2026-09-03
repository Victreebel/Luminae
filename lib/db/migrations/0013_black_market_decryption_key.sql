ALTER TABLE "account_blueprint_clearance"
  ADD COLUMN IF NOT EXISTS "decryption_key_bypass_active_at" timestamp with time zone;
