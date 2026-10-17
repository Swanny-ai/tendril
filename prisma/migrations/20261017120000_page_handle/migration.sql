-- AlterTable
ALTER TABLE "Page" ADD COLUMN "handle" TEXT,
ADD COLUMN "showHandle" BOOLEAN NOT NULL DEFAULT true;
