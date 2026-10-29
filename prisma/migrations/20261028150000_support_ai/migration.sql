-- Add message role and backfill from fromAdmin
ALTER TABLE "SupportMessage" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
UPDATE "SupportMessage" SET "role" = 'agent' WHERE "fromAdmin" = true;

-- Per-creator conversation state (AI vs real agent + read receipts)
CREATE TABLE "SupportThread" (
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'ai',
    "escalatedAt" TIMESTAMP(3),
    "userSeenAt" TIMESTAMP(3),
    "agentSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportThread_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "SupportThread" ADD CONSTRAINT "SupportThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing conversations already have a human replying, so keep them in agent mode.
INSERT INTO "SupportThread" ("userId", "mode", "escalatedAt", "updatedAt")
SELECT DISTINCT "userId", 'agent', NOW(), NOW() FROM "SupportMessage";
