-- Announcements from the site owner to every user (dashboard popup + support messenger).
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkLabel" TEXT,
    "linkUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Announcement_active_createdAt_idx" ON "Announcement"("active", "createdAt");

-- When each user last saw (closed) an announcement popup.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "announcementSeenAt" TIMESTAMP(3);
