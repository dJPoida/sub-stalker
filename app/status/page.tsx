import { getDatabaseStatus } from "@/lib/status";

function formatLatency(latencyMs: number | null): string {
  if (latencyMs === null) {
    return "n/a";
  }

  return `${latencyMs} ms`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "n/a";
  }

  return value;
}

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const database = await getDatabaseStatus();

  return (
    <section className="page-stack">
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Status</p>
          <h1>System health</h1>
          <p className="page-lead">
            Operational diagnostics for core dependencies and data migration visibility.
          </p>
        </div>
        <span className={database.connected ? "pill pill-ok" : "pill pill-fail"}>
          {database.connected ? "OPERATIONAL" : "ISSUES DETECTED"}
        </span>
      </header>

      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Database</span>
          <strong className="metric-value">{database.connected ? "Connected" : "Disconnected"}</strong>
          <span className="metric-note">Checked at {database.checkedAt}</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Latency</span>
          <strong className="metric-value">{formatLatency(database.latencyMs)}</strong>
          <span className="metric-note">Roundtrip timing</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Migrations</span>
          <strong className="metric-value">{database.metadata.appliedMigrations ?? "n/a"}</strong>
          <span className="metric-note">Applied entries</span>
        </article>
      </div>

      <article className="surface">
        <h2>Database connectivity</h2>
        <ul className="stack text-muted">
          <li>Host: {database.host ?? "n/a"}</li>
          <li>Port: {database.port ?? "n/a"}</li>
          <li>Env source: {database.envSource}</li>
          <li>DB version: {database.metadata.serverVersion ?? "n/a"}</li>
          <li>Applied migrations: {database.metadata.appliedMigrations ?? "n/a"}</li>
          <li>Pending migrations: {database.metadata.pendingMigrations ?? "n/a"}</li>
          <li>Latest migration: {database.metadata.latestMigration ?? "n/a"}</li>
          <li>Latest applied at: {formatDate(database.metadata.latestMigrationAppliedAt)}</li>
        </ul>
      </article>

      {database.error ? <p className="status-error">Error: {database.error}</p> : null}
      {database.metadata.error ? <p className="status-error">Metadata error: {database.metadata.error}</p> : null}
      {!database.connected ? (
        <p className="status-help">
          Tip: set a clean unquoted DB URL in Vercel. Example source should be DATABASE_URL or
          SUB_STALKER_STORAGE_POSTGRES_URL.
        </p>
      ) : null}

      <article className="surface surface-soft">
        <h2>Future metrics</h2>
        <ul className="stack text-muted">
          <li>Total users: pending</li>
          <li>Total subscriptions: pending</li>
          <li>Monthly spend tracked: pending</li>
        </ul>
      </article>
    </section>
  );
}
