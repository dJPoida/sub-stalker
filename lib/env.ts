const DATABASE_URL_CANDIDATES = [
  "DATABASE_URL",
  "SUB_STALKER_STORAGE_POSTGRES_URL",
  "SUB_STALKER_STORAGE_POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
] as const;

type DatabaseUrlResolution = {
  value: string;
  source: (typeof DATABASE_URL_CANDIDATES)[number];
};

export type ServerEnv = {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  MAIL_PROVIDER_API_KEY: string;
};

export function normalizeEnvValue(raw: string): string {
  return raw.trim().replace(/^['\"]|['\"]$/g, "");
}

export function resolveDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseUrlResolution {
  for (const key of DATABASE_URL_CANDIDATES) {
    const raw = env[key];

    if (!raw) {
      continue;
    }

    const value = normalizeEnvValue(raw);

    if (!value) {
      continue;
    }

    return {
      value,
      source: key,
    };
  }

  throw new Error(
    `Missing database connection URL. Set one of: ${DATABASE_URL_CANDIDATES.join(", ")}.`,
  );
}

export function getDatabaseUrlSource(): string {
  return resolveDatabaseUrl().source;
}

export function getServerEnv(): ServerEnv {
  const { value: DATABASE_URL } = resolveDatabaseUrl();

  const env = {
    DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    MAIL_PROVIDER_API_KEY: process.env.MAIL_PROVIDER_API_KEY,
  };

  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Add them to your Vercel project or local .env.local.`,
    );
  }

  return env as ServerEnv;
}
