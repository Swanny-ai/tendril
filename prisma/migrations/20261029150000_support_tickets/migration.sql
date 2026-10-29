-- Support tickets: a creator can have several conversations, each open or resolved.
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "mode" TEXT NOT NULL DEFAULT 'ai',
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "userSeenAt" TIMESTAMP(3),
    "agentSeenAt" TIMESTAMP(3),
    "userTypingAt" TIMESTAMP(3),
    "agentTypingAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupportTicket_userId_lastMessageAt_idx" ON "SupportTicket"("userId", "lastMessageAt");
CREATE INDEX "SupportTicket_status_lastMessageAt_idx" ON "SupportTicket"("status", "lastMessageAt");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Each creator's existing chat becomes one open ticket, keeping its state.
INSERT INTO "SupportTicket" ("id", "userId", "subject", "mode", "escalatedAt", "userSeenAt", "agentSeenAt", "lastMessageAt", "createdAt", "updatedAt")
SELECT 'tkt_' || m."userId",
       m."userId",
       COALESCE(LEFT((SELECT s."body" FROM "SupportMessage" s WHERE s."userId" = m."userId" AND s."role" = 'user' ORDER BY s."createdAt" LIMIT 1), 80), ''),
       COALESCE(t."mode", 'ai'),
       t."escalatedAt",
       t."userSeenAt",
       t."agentSeenAt",
       m."lastAt",
       m."firstAt",
       NOW()
FROM (SELECT "userId", MIN("createdAt") AS "firstAt", MAX("createdAt") AS "lastAt" FROM "SupportMessage" GROUP BY "userId") m
LEFT JOIN "SupportThread" t ON t."userId" = m."userId";

ALTER TABLE "SupportMessage" ADD COLUMN "ticketId" TEXT;
UPDATE "SupportMessage" SET "ticketId" = 'tkt_' || "userId";
ALTER TABLE "SupportMessage" ALTER COLUMN "ticketId" SET NOT NULL;
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The per-creator thread state now lives on each ticket.
DROP TABLE "SupportThread";
