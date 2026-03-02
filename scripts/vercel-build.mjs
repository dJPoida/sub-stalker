import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

function looksLikeSupabasePooler(url) {
  if (!url) {
    return false;
  }

  return url.includes(".pooler.supabase.com") || url.includes(":6543");
}

const vercelEnv = process.env.VERCEL_ENV;
const shouldRunMigrations = vercelEnv === "production";

if (shouldRunMigrations) {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const directUrl = process.env.DIRECT_URL ?? "";

  if (looksLikeSupabasePooler(databaseUrl) && !directUrl) {
    console.error(
      "Production migration blocked: DATABASE_URL points at a pooled connection (for example Supabase pooler) but DIRECT_URL is not set. Set DIRECT_URL to the direct Postgres connection (typically port 5432) for Prisma migrations.",
    );
    process.exit(1);
  }

  console.log("Production Vercel build detected. Running Prisma migrations...");
  run("npm run db:migrate:deploy:ci");
} else {
  console.log(`Skipping Prisma migrate deploy for VERCEL_ENV=${vercelEnv ?? "unset"}.`);
}

console.log("Building Next.js app...");
run("next build");
