ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "study_mode" varchar DEFAULT 'qa' NOT NULL;
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "display_name" varchar(60);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "show_on_leaderboard" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "documents_version" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "study_sheet_status" varchar DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "quiz_status" varchar DEFAULT 'none' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StudySheet" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "User"("id") ON DELETE cascade,
  "subject_id" uuid NOT NULL REFERENCES "Subject"("id") ON DELETE cascade,
  "sections" json NOT NULL,
  "generated_from_version" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "study_sheet_subject_unique" ON "StudySheet" ("subject_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_sheet_owner_subject_index" ON "StudySheet" ("user_id", "subject_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StudyQuiz" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "User"("id") ON DELETE cascade,
  "subject_id" uuid NOT NULL REFERENCES "Subject"("id") ON DELETE cascade,
  "questions" json NOT NULL,
  "generated_from_version" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "study_quiz_subject_unique" ON "StudyQuiz" ("subject_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_quiz_owner_subject_index" ON "StudyQuiz" ("user_id", "subject_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "QuizAttempt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "User"("id") ON DELETE cascade,
  "subject_id" uuid NOT NULL REFERENCES "Subject"("id") ON DELETE cascade,
  "quiz_id" uuid NOT NULL REFERENCES "StudyQuiz"("id") ON DELETE cascade,
  "answers" json NOT NULL,
  "score" integer,
  "total" integer NOT NULL,
  "percent" integer,
  "duration_seconds" integer DEFAULT 0 NOT NULL,
  "status" varchar DEFAULT 'in_progress' NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_attempt_owner_subject_index" ON "QuizAttempt" ("user_id", "subject_id", "finished_at");
