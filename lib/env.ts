export type ServerEnv = {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  MAIL_PROVIDER_API_KEY: string;
};

export function getServerEnv(): ServerEnv {
  const env = {
    DATABASE_URL: process.env.DATABASE_URL,
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
