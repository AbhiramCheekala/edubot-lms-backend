ALTER TABLE "student" ALTER COLUMN "profile_picture" SET DATA TYPE uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student" ADD CONSTRAINT "student_profile_picture_binary_object_binary_object_id_fk" FOREIGN KEY ("profile_picture") REFERENCES "public"."binary_object"("binary_object_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
