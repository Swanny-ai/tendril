-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "warningTemplate" TEXT;

-- CreateTable
CREATE TABLE "SmartLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "adultWarning" BOOLEAN NOT NULL DEFAULT true,
    "warningTemplate" TEXT NOT NULL DEFAULT 'dusk',
    "warningTitle" TEXT,
    "warningMessage" TEXT,
    "warningButton" TEXT,
    "showBadge" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartLinkEvent" (
    "id" BIGSERIAL NOT NULL,
    "linkId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorHash" TEXT NOT NULL,
    "country" TEXT,
    "device" TEXT NOT NULL,
    "os" TEXT,
    "browser" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SmartLinkEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmartLink_slug_key" ON "SmartLink"("slug");

-- CreateIndex
CREATE INDEX "SmartLink_userId_createdAt_idx" ON "SmartLink"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SmartLinkEvent_linkId_ts_idx" ON "SmartLinkEvent"("linkId", "ts");

-- AddForeignKey
ALTER TABLE "SmartLink" ADD CONSTRAINT "SmartLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartLinkEvent" ADD CONSTRAINT "SmartLinkEvent_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "SmartLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
