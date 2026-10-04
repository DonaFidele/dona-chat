ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "display_name" varchar(60);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "show_on_leaderboard" boolean DEFAULT false NOT NULL;
