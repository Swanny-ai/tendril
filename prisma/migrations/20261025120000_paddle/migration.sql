-- Card payments through Paddle
ALTER TABLE "User" ADD COLUMN "paddleCustomerId" TEXT;
CREATE UNIQUE INDEX "User_paddleCustomerId_key" ON "User"("paddleCustomerId");
ALTER TABLE "Subscription" ADD COLUMN "paddleSubscriptionId" TEXT, ADD COLUMN "paddlePriceId" TEXT;
CREATE UNIQUE INDEX "Subscription_paddleSubscriptionId_key" ON "Subscription"("paddleSubscriptionId");
