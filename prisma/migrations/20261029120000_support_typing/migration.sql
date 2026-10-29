-- Live "typing..." indicator in the support chat
ALTER TABLE "SupportThread" ADD COLUMN "userTypingAt" TIMESTAMP(3);
ALTER TABLE "SupportThread" ADD COLUMN "agentTypingAt" TIMESTAMP(3);
