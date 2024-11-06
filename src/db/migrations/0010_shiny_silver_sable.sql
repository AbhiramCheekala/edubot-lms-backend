ALTER TABLE "student_course_map" RENAME COLUMN "studnet_id" TO "student_id";--> statement-breakpoint
ALTER TABLE "student_course_map" RENAME COLUMN "program_id" TO "course_id";--> statement-breakpoint
ALTER TABLE "student_program_map" RENAME COLUMN "studnet_id" TO "student_id";--> statement-breakpoint
ALTER TABLE "student_course_map" DROP CONSTRAINT "student_course_map_studnet_id_student_id_fk";
--> statement-breakpoint
ALTER TABLE "student_course_map" DROP CONSTRAINT "student_course_map_program_id_course_course_id_fk";
--> statement-breakpoint
ALTER TABLE "student_program_map" DROP CONSTRAINT "student_program_map_studnet_id_student_id_fk";
--> statement-breakpoint
ALTER TABLE "student_course_map" DROP CONSTRAINT "student_course_map_studnet_id_program_id_pk";--> statement-breakpoint
ALTER TABLE "student_program_map" DROP CONSTRAINT "student_program_map_studnet_id_program_id_pk";--> statement-breakpoint
ALTER TABLE "student_course_map" ADD CONSTRAINT "student_course_map_student_id_course_id_pk" PRIMARY KEY("student_id","course_id");--> statement-breakpoint
ALTER TABLE "student_program_map" ADD CONSTRAINT "student_program_map_student_id_program_id_pk" PRIMARY KEY("student_id","program_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_course_map" ADD CONSTRAINT "student_course_map_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_course_map" ADD CONSTRAINT "student_course_map_course_id_course_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("course_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_program_map" ADD CONSTRAINT "student_program_map_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
