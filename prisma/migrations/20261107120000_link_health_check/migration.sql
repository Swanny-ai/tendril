-- Link Health: each check run of a deep link or bio page.
CREATE TABLE "LinkHealthCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LinkHealthCheck_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LinkHealthCheck_userId_createdAt_idx" ON "LinkHealthCheck"("userId", "createdAt");
CREATE INDEX "LinkHealthCheck_sourceId_createdAt_idx" ON "LinkHealthCheck"("sourceId", "createdAt");
ALTER TABLE "LinkHealthCheck" ADD CONSTRAINT "LinkHealthCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
