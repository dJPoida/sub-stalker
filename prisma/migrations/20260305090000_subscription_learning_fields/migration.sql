ALTER TABLE "Subscription"
ADD COLUMN "paymentMethod" TEXT;

UPDATE "Subscription"
SET "paymentMethod" = COALESCE(NULLIF(TRIM("provider"), ''), 'Unknown');

ALTER TABLE "Subscription"
ALTER COLUMN "paymentMethod" SET NOT NULL,
ADD COLUMN "signedUpBy" TEXT;

CREATE INDEX "Subscription_userId_paymentMethod_idx" ON "Subscription"("userId", "paymentMethod");
CREATE INDEX "Subscription_userId_signedUpBy_idx" ON "Subscription"("userId", "signedUpBy");

ALTER TABLE "Subscription"
DROP COLUMN "provider";
