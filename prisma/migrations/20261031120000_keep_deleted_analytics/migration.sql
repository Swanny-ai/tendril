-- Keep analytics when a link, page or button is deleted.
-- Visits and clicks no longer cascade-delete with their link or button.
ALTER TABLE "SmartLinkEvent" DROP CONSTRAINT "SmartLinkEvent_linkId_fkey";
ALTER TABLE "ClickEvent" DROP CONSTRAINT "ClickEvent_blockId_fkey";

-- Name and address of deleted bio pages and smart links, so their stats stay labelled.
CREATE TABLE "DeletedSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeletedSource_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DeletedSource_userId_idx" ON "DeletedSource"("userId");
ALTER TABLE "DeletedSource" ADD CONSTRAINT "DeletedSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
