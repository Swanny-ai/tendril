-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BlockType" ADD VALUE 'EMBED';
ALTER TYPE "BlockType" ADD VALUE 'COUNTDOWN';

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "heroUrl" TEXT,
ADD COLUMN     "layout" TEXT NOT NULL DEFAULT 'classic',
ADD COLUMN     "tagline" TEXT NOT NULL DEFAULT '';
