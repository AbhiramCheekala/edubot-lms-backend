CREATE TABLE IF NOT EXISTS "ChatUserMetadata" (
	"login_id" uuid PRIMARY KEY NOT NULL,
	"last_tool" text,
	"last_conversation_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"model" jsonb,
	"loginId" uuid NOT NULL,
	"starred" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT '' NOT NULL,
	"finalName" text DEFAULT '' NOT NULL,
	"assignmentId" uuid NOT NULL,
	"codespaceInfo" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Message" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"role" text NOT NULL,
	"outputs" jsonb,
	"file" text DEFAULT '' NOT NULL,
	"filename" jsonb,
	"createdAt" text DEFAULT '' NOT NULL,
	"conversationId" text NOT NULL,
	"contentLabel" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SharedLink" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"createdAt" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LoggedInLog" (
	"id" text PRIMARY KEY NOT NULL,
	"loginId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ChatUserMetadata" ADD CONSTRAINT "ChatUserMetadata_login_id_login_login_id_fk" FOREIGN KEY ("login_id") REFERENCES "public"."login"("login_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ChatUserMetadata" ADD CONSTRAINT "ChatUserMetadata_last_conversation_id_Conversation_id_fk" FOREIGN KEY ("last_conversation_id") REFERENCES "public"."Conversation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_loginId_login_login_id_fk" FOREIGN KEY ("loginId") REFERENCES "public"."login"("login_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignmentId_assignment_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignment"("assignment_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_Conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SharedLink" ADD CONSTRAINT "SharedLink_conversationId_Conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LoggedInLog" ADD CONSTRAINT "LoggedInLog_loginId_login_login_id_fk" FOREIGN KEY ("loginId") REFERENCES "public"."login"("login_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
