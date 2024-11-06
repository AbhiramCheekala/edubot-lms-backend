DO $$ BEGIN
 CREATE TYPE "public"."account_type" AS ENUM('student', 'user');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_type" AS ENUM('file', 'link');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."module_section_type" AS ENUM('readingMaterial', 'assignment', 'links');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."permission_set_name" AS ENUM('Mentor', 'Admin', 'DataManagementTeam', 'Faculty', 'OrgLeader', 'Student');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."platform_type" AS ENUM('26d149f5-76e0-40c8-bf48-2c41cf5b47cc', 'c7e8fa0f-4496-4902-bdeb-d706678aadf0', '9e9c418b-265a-4be7-a992-bd72bbea528e', 'c5000ff5-e2cc-4fc1-8b3f-51786293259f');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."submission_status" AS ENUM('submitted', 'pending', 'graded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."token_type" AS ENUM('ACCESS', 'REFRESH', 'RESET_PASSWORD', 'VERIFY_EMAIL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assignment" (
	"assignment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"template_repository" text NOT NULL,
	"platform_type" "platform_type" NOT NULL,
	"auto_grading" boolean DEFAULT false NOT NULL,
	"test_case_grading" boolean DEFAULT false NOT NULL,
	"module_section_id" uuid NOT NULL,
	CONSTRAINT "assignment_module_section_id_unique" UNIQUE("module_section_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch" (
	"batch_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"mentor_id" uuid NOT NULL,
	"semester_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"batch_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "binary_object" (
	"binary_object_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"mime_type" varchar(200) NOT NULL,
	"original_file_name" varchar(150) NOT NULL,
	"file_size" varchar(100) NOT NULL,
	"container_name" varchar(100) NOT NULL,
	"blob_name" varchar(200) NOT NULL,
	"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content" (
	"content_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"type" "content_type" NOT NULL,
	"url" text,
	"binary_object_ref" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_and_group_mappings" (
	"content_group_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "content_and_group_mappings_content_group_id_position_pk" PRIMARY KEY("content_group_id","position")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_group" (
	"content_group_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course" (
	"course_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"given_course_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"skills" text NOT NULL,
	"duration" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "course_given_course_id_unique" UNIQUE("given_course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_module_mapper" (
	"position" integer NOT NULL,
	"course_id" uuid NOT NULL,
	"module_id" uuid NOT NULL,
	CONSTRAINT "course_module_mapper_course_id_module_id_pk" PRIMARY KEY("course_id","module_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grade" (
	"grade_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"submission_id" uuid NOT NULL,
	"score" integer,
	"feedback" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login" (
	"login_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"account_type" "account_type" NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"role" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module" (
	"module_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"title" varchar(100) NOT NULL,
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_section" (
	"module_section_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"name" varchar(255) NOT NULL,
	"content_group_id" uuid NOT NULL,
	"section_type" "module_section_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_user_map" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"given_org_id" varchar(50) NOT NULL,
	"state" varchar(50) NOT NULL,
	"address" varchar(250) NOT NULL,
	"pincode" varchar(10) NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"contact_phone_number" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program" (
	"program_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"name" varchar(100) NOT NULL,
	"given_program_id" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"skills" text NOT NULL,
	"duration" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"banner_base64" text NOT NULL,
	CONSTRAINT "program_given_program_id_unique" UNIQUE("given_program_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_course_map" (
	"program_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reading_material_note" (
	"reading_material_note_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"module_section_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"notes" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_name" varchar(50) NOT NULL,
	"permission_set_name" "permission_set_name" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "semester" (
	"semester_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"org_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"given_student_id" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"personal_email" varchar(255),
	"date_of_birth" timestamp (3),
	"apsche" boolean DEFAULT false NOT NULL,
	"gender" varchar(10) NOT NULL,
	"org_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"login_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"joiningDate" timestamp(3) DEFAULT now() NOT NULL,
	"contact_phone_number" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "student_given_student_id_unique" UNIQUE("given_student_id"),
	CONSTRAINT "student_personal_email_unique" UNIQUE("personal_email"),
	CONSTRAINT "student_login_id_unique" UNIQUE("login_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_course_map" (
	"studnet_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "student_course_map_studnet_id_program_id_pk" PRIMARY KEY("studnet_id","program_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_program_map" (
	"studnet_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "student_program_map_studnet_id_program_id_pk" PRIMARY KEY("studnet_id","program_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submission" (
	"submission_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "submission_status" NOT NULL,
	"content_group_id" uuid NOT NULL,
	"test_case_results" jsonb,
	"auto_analysis_results" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "token" (
	"token" text PRIMARY KEY NOT NULL,
	"type" "token_type" NOT NULL,
	"expires" timestamp(3) NOT NULL,
	"blacklisted" boolean NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"custom_data" jsonb NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"given_user_id" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joiningDate" timestamp(3) DEFAULT now() NOT NULL,
	"login_id" uuid NOT NULL,
	"contact_phone_number" jsonb NOT NULL,
	CONSTRAINT "user_given_user_id_unique" UNIQUE("given_user_id"),
	CONSTRAINT "user_login_id_unique" UNIQUE("login_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "module_section_mapper" (
	"position" integer NOT NULL,
	"module_id" uuid NOT NULL,
	"module_section_id" uuid NOT NULL,
	CONSTRAINT "module_section_mapper_module_id_module_section_id_pk" PRIMARY KEY("module_id","module_section_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assignment" ADD CONSTRAINT "assignment_module_section_id_module_section_module_section_id_fk" FOREIGN KEY ("module_section_id") REFERENCES "public"."module_section"("module_section_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch" ADD CONSTRAINT "batch_mentor_id_user_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch" ADD CONSTRAINT "batch_semester_id_semester_semester_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semester"("semester_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content" ADD CONSTRAINT "content_binary_object_ref_binary_object_binary_object_id_fk" FOREIGN KEY ("binary_object_ref") REFERENCES "public"."binary_object"("binary_object_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_and_group_mappings" ADD CONSTRAINT "content_and_group_mappings_content_group_id_content_group_content_group_id_fk" FOREIGN KEY ("content_group_id") REFERENCES "public"."content_group"("content_group_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_and_group_mappings" ADD CONSTRAINT "content_and_group_mappings_content_id_content_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("content_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_module_mapper" ADD CONSTRAINT "course_module_mapper_course_id_course_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("course_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "course_module_mapper" ADD CONSTRAINT "course_module_mapper_module_id_module_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("module_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "grade" ADD CONSTRAINT "grade_submission_id_submission_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("submission_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "login" ADD CONSTRAINT "login_role_role_id_fk" FOREIGN KEY ("role") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "module_section" ADD CONSTRAINT "module_section_content_group_id_content_group_content_group_id_fk" FOREIGN KEY ("content_group_id") REFERENCES "public"."content_group"("content_group_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_user_map" ADD CONSTRAINT "org_user_map_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_user_map" ADD CONSTRAINT "org_user_map_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "program_course_map" ADD CONSTRAINT "program_course_map_program_id_program_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("program_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "program_course_map" ADD CONSTRAINT "program_course_map_course_id_course_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("course_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reading_material_note" ADD CONSTRAINT "reading_material_note_module_section_id_module_section_module_section_id_fk" FOREIGN KEY ("module_section_id") REFERENCES "public"."module_section"("module_section_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reading_material_note" ADD CONSTRAINT "reading_material_note_content_id_content_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("content_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "semester" ADD CONSTRAINT "semester_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student" ADD CONSTRAINT "student_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student" ADD CONSTRAINT "student_batch_id_batch_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("batch_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student" ADD CONSTRAINT "student_login_id_login_login_id_fk" FOREIGN KEY ("login_id") REFERENCES "public"."login"("login_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_course_map" ADD CONSTRAINT "student_course_map_studnet_id_student_id_fk" FOREIGN KEY ("studnet_id") REFERENCES "public"."student"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_course_map" ADD CONSTRAINT "student_course_map_program_id_course_course_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."course"("course_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_program_map" ADD CONSTRAINT "student_program_map_studnet_id_student_id_fk" FOREIGN KEY ("studnet_id") REFERENCES "public"."student"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_program_map" ADD CONSTRAINT "student_program_map_program_id_program_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("program_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission" ADD CONSTRAINT "submission_assignment_id_assignment_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("assignment_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission" ADD CONSTRAINT "submission_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission" ADD CONSTRAINT "submission_content_group_id_content_group_content_group_id_fk" FOREIGN KEY ("content_group_id") REFERENCES "public"."content_group"("content_group_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "token" ADD CONSTRAINT "token_user_id_login_login_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."login"("login_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user" ADD CONSTRAINT "user_login_id_login_login_id_fk" FOREIGN KEY ("login_id") REFERENCES "public"."login"("login_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "module_section_mapper" ADD CONSTRAINT "module_section_mapper_module_id_module_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("module_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "module_section_mapper" ADD CONSTRAINT "module_section_mapper_module_section_id_module_section_module_section_id_fk" FOREIGN KEY ("module_section_id") REFERENCES "public"."module_section"("module_section_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "batch_name_key" ON "batch" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_semester_id_key" ON "batch" USING btree ("semester_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "semester_id_batch_number_key" ON "batch" USING btree ("semester_id","batch_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "course_position_key" ON "course_module_mapper" USING btree ("course_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "login_email_key" ON "login" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_user_map_key" ON "org_user_map" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_user_map_user_id_index" ON "org_user_map" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_email_key" ON "organization" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "org_id_key" ON "organization" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "given_org_id" ON "organization" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "program_course_map_key" ON "program_course_map" USING btree ("program_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "program_position_Index_key" ON "program_course_map" USING btree ("program_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "role_name_key" ON "role" USING btree ("role_name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "semester_ymo_key" ON "semester" USING btree ("org_id","year","month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "semester_id_key" ON "semester" USING btree ("semester_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "module_position_key" ON "module_section_mapper" USING btree ("module_id","position");