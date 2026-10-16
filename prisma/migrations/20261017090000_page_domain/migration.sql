-- AlterTable
ALTER TABLE "Page" ADD COLUMN "domainId" TEXT,
ADD COLUMN "atRoot" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Page_domainId_idx" ON "Page"("domainId");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
