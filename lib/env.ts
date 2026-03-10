const DATABASE_URL_CANDIDATES = [
  "DATABASE_URL",
  "SUB_STALKER_STORAGE_POSTGRES_URL",
  "SUB_STALKER_STORAGE_POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
] as const;

const WRAPPING_QUOTES: ReadonlyArray<{ open: string; close: string }> = [
  { open: "\"", close: "\"" },
  { open: "'", close: "'" },
  { open: "`", close: "`" },
  { open: "\u201C", close: "\u201D" },
  { open: "\u2018", close: "\u2019" },
];

type DatabaseUrlResolution = {
  value: string;
  source: (typeof DATABASE_URL_CANDIDATES)[number];
};

export type ServerEnv = {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  MAIL_PROVIDER_API_KEY: string;
};

const TRUTHY_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

function stripWrappingQuotes(value: string): string {
  let result = value.trim();
  let changed = true;

  while (changed && result.length > 1) {
    changed = false;

    for (const { open, close } of WRAPPING_QUOTES) {
      if (result.startsWith(open) && result.endsWith(close)) {
        result = result.slice(open.length, result.length - close.length).trim();
        changed = true;
      }
    }
  }

  return result;
}

export function normalizeEnvValue(raw: string): string {
  return stripWrappingQuotes(raw)
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .trim();
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

export function isInvitesRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  const normalized = normalizeEnvValue(env.INVITES_REQUIRED ?? "").toLowerCase();
  return TRUTHY_ENV_VALUES.has(normalized);
}
