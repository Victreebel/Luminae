CREATE TABLE "account_cosmetic_loadouts" (
  "account_id" uuid PRIMARY KEY NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "card_back_item_id" text,
  "civilization_ambience_item_id" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
