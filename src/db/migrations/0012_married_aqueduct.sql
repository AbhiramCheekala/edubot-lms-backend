CREATE TABLE IF NOT EXISTS "github_test_case_token" (
	"token" text PRIMARY KEY NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"github_repo_full_name" text NOT NULL,
	"assignment_id" uuid NOT NULL,
	"conversation_id" text NOT NULL,
	"login_id" uuid NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_test_case_token" ADD CONSTRAINT "github_test_case_token_assignment_id_assignment_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("assignment_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_test_case_token" ADD CONSTRAINT "github_test_case_token_conversation_id_Conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."Conversation"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_test_case_token" ADD CONSTRAINT "github_test_case_token_login_id_login_login_id_fk" FOREIGN KEY ("login_id") REFERENCES "public"."login"("login_id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
