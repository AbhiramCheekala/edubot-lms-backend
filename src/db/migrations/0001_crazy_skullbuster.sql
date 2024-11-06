CREATE TABLE IF NOT EXISTS "user_program_map" (
	"program_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "user_program_map_program_id_user_id_pk" PRIMARY KEY("program_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_program_map" ADD CONSTRAINT "user_program_map_program_id_program_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("program_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_program_map" ADD CONSTRAINT "user_program_map_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
