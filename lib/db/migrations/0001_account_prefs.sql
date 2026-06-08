ALTER TABLE "accounts" ADD COLUMN "skip_cinematics" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "abridged_anims" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "hints_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "muted" boolean DEFAULT false NOT NULL;
