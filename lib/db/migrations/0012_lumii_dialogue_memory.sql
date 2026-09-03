ALTER TABLE "account_blueprint_clearance"
  ADD COLUMN IF NOT EXISTS "threshold_dialogue_path" text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE "account_blueprint_clearance"
  ADD COLUMN IF NOT EXISTS "threshold_dialogue_resolution" text;

UPDATE "account_blueprint_clearance"
SET "threshold_dialogue_resolution" = 'continued'
WHERE
  "threshold_dialogue_resolution" IS NULL
  AND (
    "covenant_broken_at" IS NOT NULL
    OR "challenge_room_id" IS NOT NULL
    OR "status" IN ('challenge_active', 'cleared')
  );

UPDATE "account_blueprint_clearance"
SET "threshold_dialogue_resolution" = 'left'
WHERE
  "threshold_dialogue_resolution" IS NULL
  AND "threshold_approach" IS NOT NULL;

ALTER TABLE "account_blueprint_clearance"
  DROP CONSTRAINT IF EXISTS "account_blueprint_clearance_threshold_dialogue_resolution_check";

ALTER TABLE "account_blueprint_clearance"
  ADD CONSTRAINT "account_blueprint_clearance_threshold_dialogue_resolution_check"
  CHECK (
    "threshold_dialogue_resolution" IS NULL
    OR "threshold_dialogue_resolution" IN ('left', 'continued')
  );

ALTER TABLE "account_blueprint_clearance"
  DROP CONSTRAINT IF EXISTS "account_blueprint_clearance_threshold_dialogue_path_check";

ALTER TABLE "account_blueprint_clearance"
  ADD CONSTRAINT "account_blueprint_clearance_threshold_dialogue_path_check"
  CHECK (
    "threshold_dialogue_path" <@ ARRAY[
      'kinship-want',
      'kinship-fear',
      'kinship-familiar',
      'inquiry-answer',
      'inquiry-warning',
      'inquiry-relation',
      'inquiry-warning-against',
      'inquiry-preserve',
      'dominion-decide',
      'dominion-cipher',
      'dominion-stand',
      'dominion-stop'
    ]::text[]
  );
