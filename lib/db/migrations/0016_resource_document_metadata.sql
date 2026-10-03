ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "user_id" uuid;
--> statement-breakpoint
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "original_name" text;
--> statement-breakpoint
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "content_type" varchar(120);
--> statement-breakpoint
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "size_bytes" integer;
--> statement-breakpoint
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "page_count" integer;
--> statement-breakpoint
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "status" varchar DEFAULT 'ready' NOT NULL;
--> statement-breakpoint
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "error_message" text;
--> statement-breakpoint
ALTER TABLE "ResourceChunk" ADD COLUMN IF NOT EXISTS "user_id" uuid;
--> statement-breakpoint
ALTER TABLE "ResourceChunk" ADD COLUMN IF NOT EXISTS "subject_id" uuid;
--> statement-breakpoint
ALTER TABLE "ResourceChunk" ADD COLUMN IF NOT EXISTS "page_start" integer;
--> statement-breakpoint
ALTER TABLE "ResourceChunk" ADD COLUMN IF NOT EXISTS "page_end" integer;
--> statement-breakpoint
ALTER TABLE "ResourceChunk" ADD COLUMN IF NOT EXISTS "heading_path" text;
--> statement-breakpoint
ALTER TABLE "ResourceChunk" ADD COLUMN IF NOT EXISTS "token_count" integer;
--> statement-breakpoint
ALTER TABLE "ResourceChunk" ADD COLUMN IF NOT EXISTS "ocr_confidence" integer;
