-- CreateEnum
CREATE TYPE "public"."EmailDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "public"."EmailDeliveryLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "status" "public"."EmailDeliveryStatus" NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_userId_createdAt_idx" ON "public"."EmailDeliveryLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_templateName_createdAt_idx" ON "public"."EmailDeliveryLog"("templateName", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_createdAt_idx" ON "public"."EmailDeliveryLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
