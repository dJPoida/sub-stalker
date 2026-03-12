-- CreateEnum
CREATE TYPE "public"."ReminderDispatchStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "public"."SubscriptionReminderDispatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "billingDateKey" TEXT NOT NULL,
    "reminderDaysBefore" INTEGER NOT NULL,
    "status" "public"."ReminderDispatchStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionReminderDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionReminderDispatch_userId_billingDateKey_key" ON "public"."SubscriptionReminderDispatch"("userId", "billingDateKey");

-- CreateIndex
CREATE INDEX "SubscriptionReminderDispatch_billingDateKey_idx" ON "public"."SubscriptionReminderDispatch"("billingDateKey");

-- CreateIndex
CREATE INDEX "SubscriptionReminderDispatch_status_createdAt_idx" ON "public"."SubscriptionReminderDispatch"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."SubscriptionReminderDispatch" ADD CONSTRAINT "SubscriptionReminderDispatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "public"."SubscriptionReminderDispatch" ENABLE ROW LEVEL SECURITY;

-- Supabase API roles may not exist in local/dev databases.
DO $$
DECLARE
    role_name TEXT;
BEGIN
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."SubscriptionReminderDispatch" FROM %I', role_name);
        END IF;
    END LOOP;
END
$$;
