-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "showVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);
