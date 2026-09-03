CREATE TABLE "account_entitlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "item_id" text NOT NULL,
  "source" text DEFAULT 'test_purchase' NOT NULL,
  "receipt_id" text NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "account_entitlements_account_item_idx" ON "account_entitlements" ("account_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_entitlements_receipt_idx" ON "account_entitlements" ("receipt_id");--> statement-breakpoint
CREATE TABLE "account_engagement" (
  "account_id" uuid PRIMARY KEY NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "cosmetic_balance" integer DEFAULT 0 NOT NULL,
  "daily_claim_streak" integer DEFAULT 0 NOT NULL,
  "last_daily_claim_date" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
