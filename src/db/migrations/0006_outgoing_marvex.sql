ALTER TABLE "student" ADD COLUMN "languages_known" jsonb;--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "full_address" text;--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "linkedin_url" varchar(255);--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "github_url" varchar(255);--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "education_hsc_name" varchar(255);--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "education_hsc_subject_specialization" varchar(255);--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "education_hsc_mention_year" varchar(255);--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "education_university_or_college" varchar(255);--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "education_university_or_college_subject_specialization" varchar(255);--> statement-breakpoint
ALTER TABLE "student" ADD COLUMN "education_university_or_college_subject" varchar(255);