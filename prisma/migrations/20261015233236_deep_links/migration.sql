-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "openInBrowser" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SmartLink" ADD COLUMN     "openInBrowser" BOOLEAN NOT NULL DEFAULT true;
