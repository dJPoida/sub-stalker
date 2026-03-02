import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

const vercelEnv = process.env.VERCEL_ENV;
const shouldRunMigrations = vercelEnv === "production";

if (shouldRunMigrations) {
  console.log("Production Vercel build detected. Running Prisma migrations...");
  run("npm run db:migrate:deploy:ci");
} else {
  console.log(`Skipping Prisma migrate deploy for VERCEL_ENV=${vercelEnv ?? "unset"}.`);
}

console.log("Building Next.js app...");
run("next build");
