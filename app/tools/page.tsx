import { requireAuthenticatedUser } from "@/lib/auth";
import { PendingSubmitButton } from "@/app/components/PendingFormControls";
import InviteIssuanceCard from "@/app/tools/InviteIssuanceCard";
import { isInvitesRequired } from "@/lib/env";
import { getEmailServiceStatus } from "@/lib/mail/config";
import TestEmailCard from "@/app/tools/TestEmailCard";

import { issueInviteAction, runDailyMaintenanceAction, runSessionCleanupAction } from "./actions";

type ToolsPageProps = {
  searchParams?: {
    error?: string;
    job?: string;
    sessions_deleted?: string;
    attempts_deleted?: string;
    invites_expired?: string;
    email_logs_deleted?: string;
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
    const invitesExpired = parseCount(searchParams.invites_expired) ?? 0;
    const emailLogsDeleted = parseCount(searchParams.email_logs_deleted) ?? 0;
    return `Daily maintenance completed. Stale sign-in attempts deleted: ${attemptsDeleted}. Expired invites marked: ${invitesExpired}. Email delivery logs pruned: ${emailLogsDeleted}.`;
  }

  return null;
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  await requireAuthenticatedUser();
  const invitesRequired = isInvitesRequired();
  const emailService = getEmailServiceStatus();
  const message = getResultMessage(searchParams);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Tools</p>
          <h1>Operational maintenance</h1>
          <p className="page-lead">Run operational jobs manually for verification and support workflows.</p>
        </div>
      </header>

      {message ? <p className="status-help">{message}</p> : null}

      <div className="split-grid">
        <TestEmailCard emailConfigured={emailService.configured} />

        <article className="surface">
          <h2>Session Cleanup</h2>
          <p className="text-muted">Prunes expired sessions and stale sign-in attempts immediately.</p>
          <form className="mt-md" action={runSessionCleanupAction}>
            <PendingSubmitButton idleLabel="Run Session Cleanup" pendingLabel="Running Cleanup..." />
          </form>
        </article>

        <article className="surface surface-soft">
          <h2>Daily Maintenance Batch</h2>
          <p className="text-muted">Runs the same batch used by the scheduled once-per-day maintenance job.</p>
          <form className="mt-md" action={runDailyMaintenanceAction}>
            <PendingSubmitButton idleLabel="Run Daily Batch" pendingLabel="Running Daily Batch..." />
          </form>
        </article>

        {invitesRequired ? (
          <InviteIssuanceCard issueInviteAction={issueInviteAction} />
        ) : (
          <article className="surface surface-soft">
            <h2>Issue Invitation Link</h2>
            <p className="text-muted">
              Invitation issuance is disabled because <code>INVITES_REQUIRED=false</code>.
            </p>
          </article>
        )}
      </div>

      <article className="surface">
        <h2>When to use this page</h2>
        <ul className="stack text-muted">
          <li>After infrastructure changes to verify cleanup flows still execute.</li>
          <li>During support incidents where stale auth artifacts need immediate pruning.</li>
          <li>Before shipping operational updates that depend on maintenance jobs.</li>
        </ul>
      </article>
    </section>
  );
}
