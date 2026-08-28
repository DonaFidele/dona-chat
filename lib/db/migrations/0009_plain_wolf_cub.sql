CREATE TABLE IF NOT EXISTS "Subject" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"user_id" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "Resource" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Subject" ADD CONSTRAINT "Subject_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Chat" ADD CONSTRAINT "Chat_subject_id_Subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."Subject"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subject_id_Subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."Subject"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
