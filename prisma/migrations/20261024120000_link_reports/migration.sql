-- CreateTable
CREATE TABLE "LinkReport" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkReport_linkId_createdAt_idx" ON "LinkReport"("linkId", "createdAt");

-- AddForeignKey
ALTER TABLE "LinkReport" ADD CONSTRAINT "LinkReport_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "SmartLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

