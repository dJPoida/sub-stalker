"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { pruneExpiredSessions, pruneStaleSignInAttempts, requireAuthenticatedUser } from "@/lib/auth";
import { runDailyMaintenanceJobs } from "@/lib/maintenance";

async function isSameOriginRequest(): Promise<boolean> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }

  if (!host) {
    return false;
  }

  const proto =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

  try {
    const originUrl = new URL(origin);
    return originUrl.host.toLowerCase() === host.toLowerCase() && originUrl.protocol === `${proto}:`;
  } catch {
    return false;
  }
}

export async function runSessionCleanupAction(): Promise<void> {
  await requireAuthenticatedUser();

  if (!(await isSameOriginRequest())) {
    redirect("/tools?error=invalid_request");
  }

  const [sessionsDeleted, attemptsDeleted] = await Promise.all([
    pruneExpiredSessions(),
    pruneStaleSignInAttempts(),
  ]);

  redirect(
    `/tools?job=session_cleanup&sessions_deleted=${sessionsDeleted}&attempts_deleted=${attemptsDeleted}`,
  );
}

export async function runDailyMaintenanceAction(): Promise<void> {
  await requireAuthenticatedUser();

  if (!(await isSameOriginRequest())) {
    redirect("/tools?error=invalid_request");
  }

  const result = await runDailyMaintenanceJobs();
  redirect(`/tools?job=daily_maintenance&attempts_deleted=${result.staleSignInAttemptsDeleted}`);
}
