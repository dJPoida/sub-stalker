import { requireAuthenticatedUser } from "@/lib/auth";

import { runDailyMaintenanceAction, runSessionCleanupAction } from "./actions";

type ToolsPageProps = {
  searchParams?: {
    error?: string;
    job?: string;
    sessions_deleted?: string;
    attempts_deleted?: string;
  };
};

function parseCount(value?: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function getResultMessage(searchParams?: ToolsPageProps["searchParams"]): string | null {
  if (!searchParams) {
    return null;
  }

  if (searchParams.error === "invalid_request") {
    return "Invalid maintenance request. Please retry from this page.";
  }

  if (searchParams.job === "session_cleanup") {
    const sessionsDeleted = parseCount(searchParams.sessions_deleted) ?? 0;
    const attemptsDeleted = parseCount(searchParams.attempts_deleted) ?? 0;
    return `Session cleanup completed. Sessions deleted: ${sessionsDeleted}. Attempts deleted: ${attemptsDeleted}.`;
  }

  if (searchParams.job === "daily_maintenance") {
    const attemptsDeleted = parseCount(searchParams.attempts_deleted) ?? 0;
    return `Daily maintenance completed. Stale sign-in attempts deleted: ${attemptsDeleted}.`;
  }

  return null;
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  await requireAuthenticatedUser();
  const message = getResultMessage(searchParams);

  return (
    <section className="card">
      <h1>Tools</h1>
      <p>Run maintenance tasks manually for testing and operations checks.</p>
      {message ? <p className="status-help">{message}</p> : null}

      <div className="status-grid">
        <article className="status-item">
          <h2>Session Cleanup</h2>
          <p>Prunes expired sessions and stale sign-in attempt records immediately.</p>
          <form action={runSessionCleanupAction}>
            <button type="submit">Run Session Cleanup</button>
          </form>
        </article>

        <article className="status-item">
          <h2>Daily Maintenance Batch</h2>
          <p>Runs the same batch as the once-per-day Vercel cron schedule.</p>
          <form action={runDailyMaintenanceAction}>
            <button type="submit">Run Daily Batch</button>
          </form>
        </article>
      </div>
    </section>
  );
}
