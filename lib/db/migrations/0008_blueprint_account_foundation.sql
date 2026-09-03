ALTER TABLE "rooms" ADD COLUMN "game_mode" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "scenario_id" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "blueprint_policy" text DEFAULT 'none' NOT NULL;--> statement-breakpoint

CREATE TABLE "account_cosmetic_loadout_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "slot" text NOT NULL,
  "scope_key" text DEFAULT 'global' NOT NULL,
  "item_id" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "account_cosmetic_loadout_items_account_slot_scope_idx" ON "account_cosmetic_loadout_items" ("account_id","slot","scope_key");--> statement-breakpoint

INSERT INTO "account_cosmetic_loadout_items" ("account_id", "slot", "scope_key", "item_id")
SELECT "account_id", 'card_back', 'global', "card_back_item_id"
FROM "account_cosmetic_loadouts"
WHERE "card_back_item_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "account_cosmetic_loadout_items" ("account_id", "slot", "scope_key", "item_id")
SELECT "account_id", 'civilization_ambience', 'global', "civilization_ambience_item_id"
FROM "account_cosmetic_loadouts"
WHERE "civilization_ambience_item_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint

CREATE TABLE "account_blueprint_clearance" (
  "account_id" uuid PRIMARY KEY NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "qualifying_wins" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'classified' NOT NULL,
  "challenge_room_id" uuid,
  "warning_seen_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "account_blueprint_unlocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "blueprint_id" text NOT NULL,
  "source" text NOT NULL,
  "unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "account_blueprint_unlocks_account_blueprint_idx" ON "account_blueprint_unlocks" ("account_id","blueprint_id");--> statement-breakpoint

CREATE TABLE "account_blueprint_loadouts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "mode" text NOT NULL,
  "slot_index" integer NOT NULL,
  "blueprint_id" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "account_blueprint_loadouts_account_mode_slot_idx" ON "account_blueprint_loadouts" ("account_id","mode","slot_index");--> statement-breakpoint

CREATE TABLE "account_blueprint_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "blueprint_id" text NOT NULL,
  "manifestations" integer DEFAULT 0 NOT NULL,
  "triggers" integer DEFAULT 0 NOT NULL,
  "armed_match_finishes" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "account_blueprint_stats_account_blueprint_idx" ON "account_blueprint_stats" ("account_id","blueprint_id");--> statement-breakpoint

CREATE TABLE "account_match_rollups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "room_id" uuid NOT NULL,
  "match_instance_id" text NOT NULL,
  "player_id" uuid NOT NULL,
  "result" text NOT NULL,
  "eminence" integer DEFAULT 0 NOT NULL,
  "total_players" integer DEFAULT 0 NOT NULL,
  "qualifying_blueprint_win" boolean DEFAULT false NOT NULL,
  "finished_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "account_match_rollups_account_match_instance_idx" ON "account_match_rollups" ("account_id","match_instance_id");--> statement-breakpoint

CREATE TABLE "account_archive_summary" (
  "account_id" uuid PRIMARY KEY NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "backfill_version" integer DEFAULT 0 NOT NULL,
  "games_played" integer DEFAULT 0 NOT NULL,
  "wins" integer DEFAULT 0 NOT NULL,
  "losses" integer DEFAULT 0 NOT NULL,
  "ties" integer DEFAULT 0 NOT NULL,
  "total_eminence" integer DEFAULT 0 NOT NULL,
  "total_forges" integer DEFAULT 0 NOT NULL,
  "total_alliances" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "account_archive_artifact_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "artifact_id" text NOT NULL,
  "encounter_count" integer DEFAULT 0 NOT NULL,
  "forge_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "account_archive_artifact_stats_account_artifact_idx" ON "account_archive_artifact_stats" ("account_id","artifact_id");--> statement-breakpoint

CREATE TABLE "account_archive_luminary_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE cascade,
  "luminary_id" text NOT NULL,
  "alliance_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "account_archive_luminary_stats_account_luminary_idx" ON "account_archive_luminary_stats" ("account_id","luminary_id");
