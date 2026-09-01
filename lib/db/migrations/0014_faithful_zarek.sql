CREATE TABLE IF NOT EXISTS "SubjectShare" (
	"token" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"scope" varchar DEFAULT 'read' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"last_accessed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SubjectShare" ADD CONSTRAINT "SubjectShare_subject_id_Subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."Subject"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
