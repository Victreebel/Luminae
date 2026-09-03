ALTER TABLE "account_blueprint_clearance"
  ADD COLUMN IF NOT EXISTS "cipher_deactivated_at" timestamp with time zone;

ALTER TABLE "account_blueprint_clearance"
  ADD COLUMN IF NOT EXISTS "threshold_approach" text;

UPDATE "account_blueprint_clearance"
SET
  "cipher_deactivated_at" = COALESCE(
    "cipher_deactivated_at",
    "warning_seen_at",
    "covenant_broken_at",
    "completed_at",
    "updated_at"
  ),
  "threshold_approach" = COALESCE("threshold_approach", 'inquiry')
WHERE
  "covenant_broken_at" IS NOT NULL
  OR "challenge_room_id" IS NOT NULL
  OR "status" IN ('challenge_active', 'cleared');

ALTER TABLE "account_blueprint_clearance"
  DROP CONSTRAINT IF EXISTS "account_blueprint_clearance_threshold_approach_check";

ALTER TABLE "account_blueprint_clearance"
  ADD CONSTRAINT "account_blueprint_clearance_threshold_approach_check"
  CHECK (
    "threshold_approach" IS NULL
    OR "threshold_approach" IN ('kinship', 'inquiry', 'dominion')
  );
