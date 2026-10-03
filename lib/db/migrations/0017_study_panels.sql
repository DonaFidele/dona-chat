CREATE TABLE IF NOT EXISTS "StudyNote" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "content" text NOT NULL,
  "starred" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SavedQuestion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "question" text NOT NULL,
  "resolved" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ScheduleSlot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "weekday" integer NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "location" varchar(160),
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StudyNote" ADD CONSTRAINT "StudyNote_subject_id_Subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."Subject"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SavedQuestion" ADD CONSTRAINT "SavedQuestion_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SavedQuestion" ADD CONSTRAINT "SavedQuestion_subject_id_Subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."Subject"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_subject_id_Subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."Subject"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
