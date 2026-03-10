-- Enable RLS on all Prisma-managed tables in the public schema.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."UserSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SignInAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EmailDeliveryLog" ENABLE ROW LEVEL SECURITY;

-- Supabase API roles may not exist in local/dev databases.
-- Revoke table access only when those roles are present.
DO $$
DECLARE
    role_name TEXT;
BEGIN
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."_prisma_migrations" FROM %I', role_name);
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."User" FROM %I', role_name);
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."UserSettings" FROM %I', role_name);
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."Session" FROM %I', role_name);
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."SignInAttempt" FROM %I', role_name);
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."Subscription" FROM %I', role_name);
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."Invite" FROM %I', role_name);
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public."EmailDeliveryLog" FROM %I', role_name);
        END IF;
    END LOOP;
END
$$;
