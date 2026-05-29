ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "language" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "pr_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "pr_number" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "pr_status" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "pr_checked_at" timestamp;