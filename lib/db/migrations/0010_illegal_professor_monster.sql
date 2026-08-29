ALTER TABLE "Document" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_subject_id_Subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."Subject"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
