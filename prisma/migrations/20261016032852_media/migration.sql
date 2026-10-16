-- CreateTable
CREATE TABLE "Media" (
    "key" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Media_pageId_idx" ON "Media"("pageId");
