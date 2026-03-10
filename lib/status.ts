import { Socket } from "node:net";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { db } from "./db";
import { getDatabaseUrlSource, getServerEnv, normalizeEnvValue } from "./env";
import { getEmailServiceStatus } from "./mail/config";

type DatabaseMetadata = {
  serverVersion: string | null;
  appliedMigrations: number | null;
  latestMigration: string | null;
  latestMigrationAppliedAt: string | null;
  pendingMigrations: number | null;
  error?: string;
};

export type DatabaseStatus = {
  connected: boolean;
  latencyMs: number | null;
  host: string | null;
  port: number | null;
  checkedAt: string;
  envSource: string;
  metadata: DatabaseMetadata;
  error?: string;
};

export type EmailStatus = {
  configured: boolean;
  provider: string;
  fromAddress: string;
};

function parseConnectionTarget(databaseUrl: string): { host: string; port: number } {
  let parsed: URL;
  const normalizedUrl = normalizeEnvValue(databaseUrl);

  try {
    parsed = new URL(normalizedUrl);
  } catch {
    throw new Error(
      "Database URL is not a valid URL. Ensure no extra quotes/spaces, use postgres:// or postgresql://, and URL-encode special characters in credentials.",
    );
  }

  const host = parsed.hostname;
  const port = parsed.port ? Number(parsed.port) : 5432;

  if (!host || Number.isNaN(port)) {
    throw new Error("Invalid DATABASE_URL host/port.");
  }

  return { host, port };
}

function connectTcp(host: string, port: number, timeoutMs = 5000): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const startedAt = Date.now();

    const onError = (error: Error) => {
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      const latencyMs = Date.now() - startedAt;
      socket.end();
      resolve(latencyMs);
    });

    socket.once("error", onError);
    socket.once("timeout", () => {
      onError(new Error(`TCP connection timed out after ${timeoutMs}ms.`));
    });

    socket.connect(port, host);
  });
}

function emptyDatabaseMetadata(error?: string): DatabaseMetadata {
  return {
    serverVersion: null,
    appliedMigrations: null,
    latestMigration: null,
    latestMigrationAppliedAt: null,
    pendingMigrations: null,
    ...(error ? { error } : {}),
  };
}

async function getLocalMigrationCount(): Promise<number | null> {
  try {
    const migrationsDir = join(process.cwd(), "prisma", "migrations");
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).length;
  } catch {
    return null;
  }
}

async function getDatabaseMetadata(): Promise<DatabaseMetadata> {
  try {
    const localMigrationCountPromise = getLocalMigrationCount();

    const [versionRows, countRows, latestRows, localMigrationCount] = await Promise.all([
      db.$queryRaw<Array<{ server_version: string }>>`
        SELECT current_setting('server_version') AS server_version
      `,
      db.$queryRaw<Array<{ applied_count: number | string }>>`
        SELECT COUNT(*)::int AS applied_count
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
      `,
      db.$queryRaw<Array<{ migration_name: string; finished_at: Date }>>`
        SELECT migration_name, finished_at
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC
        LIMIT 1
      `,
      localMigrationCountPromise,
    ]);

    const serverVersion = versionRows[0]?.server_version ?? null;
    const appliedMigrations = Number(countRows[0]?.applied_count ?? 0);
    const latestMigration = latestRows[0]?.migration_name ?? null;
    const latestMigrationAppliedAt = latestRows[0]?.finished_at?.toISOString() ?? null;
    const pendingMigrations =
      localMigrationCount === null ? null : Math.max(localMigrationCount - appliedMigrations, 0);

    return {
      serverVersion,
      appliedMigrations,
      latestMigration,
      latestMigrationAppliedAt,
      pendingMigrations,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to read database metadata (version/migrations).";

    return emptyDatabaseMetadata(message);
  }
}

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const checkedAt = new Date().toISOString();
  const envSource = (() => {
    try {
      return getDatabaseUrlSource();
    } catch {
      return "not_set";
    }
  })();

  try {
    const { DATABASE_URL } = getServerEnv();
    const { host, port } = parseConnectionTarget(DATABASE_URL);
    const latencyMs = await connectTcp(host, port);
    const metadata = await getDatabaseMetadata();

    return {
      connected: true,
      latencyMs,
      host,
      port,
      checkedAt,
      envSource,
      metadata,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database check error.";

    return {
      connected: false,
      latencyMs: null,
      host: null,
      port: null,
      checkedAt,
      envSource,
      metadata: emptyDatabaseMetadata(),
      error: message,
    };
  }
}

export function getEmailStatus(): EmailStatus {
  const email = getEmailServiceStatus();

  return {
    configured: email.configured,
    provider: email.provider,
    fromAddress: email.fromAddress,
  };
}
