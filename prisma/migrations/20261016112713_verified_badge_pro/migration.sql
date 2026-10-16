-- AlterTable
ALTER TABLE "Page" ALTER COLUMN "showVerified" SET DEFAULT false;

-- Existing pages start with the badge off, except pages the site owner verified.
UPDATE "Page" SET "showVerified" = false WHERE "verifiedAt" IS NULL;
