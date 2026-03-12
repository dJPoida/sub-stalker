ALTER TABLE "public"."User"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "public"."EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "public"."EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_createdAt_idx" ON "public"."EmailVerificationToken"("userId", "createdAt");
CREATE INDEX "EmailVerificationToken_userId_consumedAt_revokedAt_exp_idx" ON "public"."EmailVerificationToken"("userId", "consumedAt", "revokedAt", "expiresAt");
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "public"."EmailVerificationToken"("expiresAt");

ALTER TABLE "public"."EmailVerificationToken"
ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."EmailVerificationToken" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    role_name TEXT;
BEGIN
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."EmailVerificationToken" FROM %I', role_name);
        END IF;
    END LOOP;
END
$$;
