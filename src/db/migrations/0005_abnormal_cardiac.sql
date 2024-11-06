CREATE TABLE IF NOT EXISTS "github_token" (
	"id" text PRIMARY KEY NOT NULL,
	"login_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	CONSTRAINT "github_token_login_id_unique" UNIQUE("login_id")
);
--> statement-breakpoint
ALTER TABLE "Conversation" ALTER COLUMN "assignmentId" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "github_org_uri" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_token" ADD CONSTRAINT "github_token_login_id_login_login_id_fk" FOREIGN KEY ("login_id") REFERENCES "public"."login"("login_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
