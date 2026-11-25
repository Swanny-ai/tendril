-- Sign-up questions: the answers, and when the new account finished them.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboarding" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardedAt" TIMESTAMP(3);
