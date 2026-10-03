ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "teacher" varchar(120);
--> statement-breakpoint
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "exam_date" date;
--> statement-breakpoint
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "explanation_level" varchar DEFAULT 'normal' NOT NULL;
--> statement-breakpoint
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "language" varchar DEFAULT 'fr' NOT NULL;
