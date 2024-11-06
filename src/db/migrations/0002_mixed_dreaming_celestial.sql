-- Add the student_id column
ALTER TABLE "reading_material_note" ADD COLUMN "student_id" uuid NOT NULL;

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "reading_material_note" ADD CONSTRAINT "reading_material_note_student_id_student_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Drop the existing constraint
ALTER TABLE "reading_material_note" DROP CONSTRAINT IF EXISTS "reading_material_note_module_section_id_module_section_module_section_id_fk";

-- Drop the existing primary key (if it exists)
ALTER TABLE "reading_material_note" DROP CONSTRAINT IF EXISTS "reading_material_note_pkey";

-- Create the new composite primary key
ALTER TABLE "reading_material_note" ADD CONSTRAINT "reading_material_note_content_id_student_id_pk" PRIMARY KEY("content_id", "student_id");

-- Drop unnecessary columns
ALTER TABLE "reading_material_note" DROP COLUMN IF EXISTS "reading_material_note_id";
ALTER TABLE "reading_material_note" DROP COLUMN IF EXISTS "module_section_id";