WITH recovered AS (
  SELECT
    "account_id",
    LEAST(5, count(*)::integer) AS "qualifying_wins"
  FROM "account_match_rollups"
  WHERE "qualifying_blueprint_win" = true
  GROUP BY "account_id"
)
UPDATE "account_blueprint_clearance" AS clearance
SET
  "qualifying_wins" = GREATEST(clearance."qualifying_wins", recovered."qualifying_wins"),
  "status" = CASE
    WHEN clearance."status" IN ('cleared', 'challenge_active') THEN clearance."status"
    WHEN clearance."decryption_key_bypass_active_at" IS NOT NULL THEN clearance."status"
    WHEN GREATEST(clearance."qualifying_wins", recovered."qualifying_wins") >= 5 THEN 'challenge_ready'
    ELSE 'classified'
  END,
  "updated_at" = now()
FROM recovered
WHERE clearance."account_id" = recovered."account_id";

UPDATE "account_blueprint_clearance"
SET "status" = 'classified', "updated_at" = now()
WHERE
  "status" = 'challenge_ready'
  AND "qualifying_wins" < 5
  AND "decryption_key_bypass_active_at" IS NULL;

UPDATE "account_blueprint_clearance"
SET "status" = 'challenge_ready', "updated_at" = now()
WHERE "status" = 'classified' AND "qualifying_wins" >= 5;
