-- CreateTable
CREATE TABLE "CryptoPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "invoiceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "payCurrency" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CryptoPayment_invoiceId_key" ON "CryptoPayment"("invoiceId");

-- CreateIndex
CREATE INDEX "CryptoPayment_userId_createdAt_idx" ON "CryptoPayment"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CryptoPayment" ADD CONSTRAINT "CryptoPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
