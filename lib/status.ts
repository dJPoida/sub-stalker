import { Socket } from "node:net";

import { getDatabaseUrlSource, getServerEnv } from "./env";

export type DatabaseStatus = {
  connected: boolean;
  latencyMs: number | null;
  host: string | null;
  port: number | null;
  checkedAt: string;
  envSource: string;
  error?: string;
};

function parseConnectionTarget(databaseUrl: string): { host: string; port: number } {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(
      "Database URL is not a valid URL. Ensure no extra quotes/spaces and use a postgres:// or postgresql:// URL.",
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

    return {
      connected: true,
      latencyMs,
      host,
      port,
      checkedAt,
      envSource,
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
      error: message,
    };
  }
}
