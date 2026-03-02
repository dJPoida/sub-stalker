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
    <section className="card">
      <h1>System Status</h1>
      <p>Simple operational status page for core services. This can be expanded with product metrics later.</p>

      <div className="status-grid">
        <article className="status-item">
          <h2>Database connectivity</h2>
          <p className={database.connected ? "status-ok" : "status-fail"}>
            {database.connected ? "Connected" : "Not connected"}
          </p>
          <ul>
            <li>Checked at: {database.checkedAt}</li>
            <li>Host: {database.host ?? "n/a"}</li>
            <li>Port: {database.port ?? "n/a"}</li>
            <li>Latency: {formatLatency(database.latencyMs)}</li>
            <li>Env source: {database.envSource}</li>
            <li>DB version: {database.metadata.serverVersion ?? "n/a"}</li>
            <li>Applied migrations: {database.metadata.appliedMigrations ?? "n/a"}</li>
            <li>Pending migrations: {database.metadata.pendingMigrations ?? "n/a"}</li>
            <li>Latest migration: {database.metadata.latestMigration ?? "n/a"}</li>
            <li>Latest applied at: {formatDate(database.metadata.latestMigrationAppliedAt)}</li>
          </ul>
          {database.error ? <p className="status-error">Error: {database.error}</p> : null}
          {database.metadata.error ? <p className="status-error">Metadata error: {database.metadata.error}</p> : null}
          {!database.connected ? (
            <p className="status-help">Tip: set a clean unquoted DB URL in Vercel. Example source should be DATABASE_URL or SUB_STALKER_STORAGE_POSTGRES_URL.</p>
          ) : null}
        </article>

        <article className="status-item">
          <h2>Future metrics</h2>
          <ul>
            <li>Total users: pending</li>
            <li>Total subscriptions: pending</li>
            <li>Monthly spend tracked: pending</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
