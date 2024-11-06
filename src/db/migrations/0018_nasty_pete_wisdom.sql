ALTER TABLE "course" ADD COLUMN "banner_ref" uuid;--> statement-breakpoint
ALTER TABLE "program" ADD COLUMN "banner_ref" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course" ADD CONSTRAINT "course_banner_ref_binary_object_binary_object_id_fk" FOREIGN KEY ("banner_ref") REFERENCES "public"."binary_object"("binary_object_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "program" ADD CONSTRAINT "program_banner_ref_binary_object_binary_object_id_fk" FOREIGN KEY ("banner_ref") REFERENCES "public"."binary_object"("binary_object_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "course" DROP COLUMN IF EXISTS "banner_base64";--> statement-breakpoint
ALTER TABLE "program" DROP COLUMN IF EXISTS "banner_base64";