ALTER TABLE "rooms"
  ADD COLUMN IF NOT EXISTS "event_frequency" text NOT NULL DEFAULT 'standard'
  CHECK ("event_frequency" IN ('off', 'standard', 'frequent'));

-- Scenario rooms follow their authored Event schedule, not the regular pool.
-- Persisted game states and their already-selected Events are left untouched.
UPDATE "rooms"
SET "event_frequency" = 'off'
WHERE "game_mode" = 'campaign' OR "scenario_id" IS NOT NULL;
