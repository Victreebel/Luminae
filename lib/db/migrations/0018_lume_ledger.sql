DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'account_engagement'
      AND column_name = 'cosmetic_balance'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'account_engagement'
      AND column_name = 'lume_balance'
  ) THEN
    ALTER TABLE "account_engagement" RENAME COLUMN "cosmetic_balance" TO "lume_balance";
  END IF;
END $$;

ALTER TABLE "account_engagement"
ADD COLUMN IF NOT EXISTS "lume_balance" integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "lifetime_earned_lume" integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "lifetime_purchased_lume" integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "lifetime_granted_lume" integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "lifetime_spent_lume" integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "lifetime_refunded_lume" integer DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS "account_lume_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "source" text NOT NULL,
  "category" text NOT NULL,
  "amount" integer NOT NULL,
  "balance_after" integer,
  "idempotency_key" text NOT NULL,
  "external_reference" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "account_lume_transactions_idempotency_idx"
  ON "account_lume_transactions" ("idempotency_key");

CREATE TABLE IF NOT EXISTS "account_native_purchases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "provider" text NOT NULL,
  "pack_id" text NOT NULL,
  "product_id" text NOT NULL,
  "purchase_token" text NOT NULL,
  "provider_order_id" text,
  "lume_amount" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "grant_transaction_id" uuid REFERENCES "account_lume_transactions"("id"),
  "verified_at" timestamp with time zone,
  "granted_at" timestamp with time zone,
  "settled_at" timestamp with time zone,
  "refunded_at" timestamp with time zone,
  "last_error" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "account_native_purchases_provider_token_idx"
  ON "account_native_purchases" ("provider", "purchase_token");

UPDATE "account_engagement"
SET "lifetime_granted_lume" = "lume_balance"
WHERE "lifetime_granted_lume" = 0 AND "lume_balance" <> 0;

INSERT INTO "account_lume_transactions" (
  "account_id",
  "source",
  "category",
  "amount",
  "balance_after",
  "idempotency_key",
  "metadata"
)
SELECT
  "account_id",
  'legacy_balance_migration',
  'granted',
  "lume_balance",
  "lume_balance",
  'legacy-opening:' || "account_id"::text,
  jsonb_build_object('migration', '0018_lume_ledger', 'sourceDetail', 'legacy balance provenance unavailable')
FROM "account_engagement"
WHERE "lume_balance" <> 0
ON CONFLICT ("idempotency_key") DO NOTHING;
