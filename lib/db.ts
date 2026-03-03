import { PrismaClient } from "@prisma/client";

import { normalizeEnvValue, resolveDatabaseUrl } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function withPoolerCompatibility(databaseUrl: string): string {
  const normalizedUrl = normalizeEnvValue(databaseUrl);

  try {
    const parsed = new URL(normalizedUrl);
    const isSupabasePooler = parsed.hostname.includes(".pooler.supabase.com");

    if (!isSupabasePooler) {
      return normalizedUrl;
    }

    if (!parsed.searchParams.has("pgbouncer")) {
      parsed.searchParams.set("pgbouncer", "true");
    }

    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }

    return parsed.toString();
  } catch {
    return normalizedUrl;
  }
}

const resolvedDatabaseUrl = (() => {
  try {
    return withPoolerCompatibility(resolveDatabaseUrl().value);
  } catch {
    return undefined;
  }
})();

const prisma =
  resolvedDatabaseUrl === undefined
    ? new PrismaClient()
    : new PrismaClient({
        datasources: {
          db: {
            url: resolvedDatabaseUrl,
          },
        },
      });

export const db = globalForPrisma.prisma ?? prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
