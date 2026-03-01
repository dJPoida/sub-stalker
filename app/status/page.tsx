import { getDatabaseStatus } from "@/lib/status";

function formatLatency(latencyMs: number | null): string {
  if (latencyMs === null) {
    return "n/a";
  }

  return `${latencyMs} ms`;
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
          </ul>
          {database.error ? <p className="status-error">Error: {database.error}</p> : null}
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
