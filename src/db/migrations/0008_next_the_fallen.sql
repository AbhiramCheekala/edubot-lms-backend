ALTER TABLE "course" ADD COLUMN "banner_base64" text NOT NULL DEFAULT 'abc';

-- Set initial values for existing records
UPDATE "course" SET "banner_base64" = 'abc' WHERE "banner_base64" IS NULL;

-- Remove the default constraint after setting initial values
ALTER TABLE "course" ALTER COLUMN "banner_base64" DROP DEFAULT;