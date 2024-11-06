ALTER TABLE "github_test_case_token" DROP CONSTRAINT "github_test_case_token_conversation_id_Conversation_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assignment_login_id_index" ON "github_test_case_token" USING btree ("assignment_id","login_id");--> statement-breakpoint
ALTER TABLE "github_test_case_token" DROP COLUMN IF EXISTS "conversation_id";