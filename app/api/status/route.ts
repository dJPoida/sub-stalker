import { NextResponse } from "next/server";

import { getDatabaseStatus, getEmailStatus } from "@/lib/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const database = await getDatabaseStatus();
  const email = getEmailStatus();
  const status = database.connected && !database.metadata.error ? "ok" : "degraded";

  return NextResponse.json(
    {
      app: "Subscription Stalker",
      status,
      database,
      email,
      emailConfigured: email.configured,
      metrics: {
        users: null,
        subscriptions: null,
        monthlySpend: null,
      },
    },
    {
      status: status === "ok" ? 200 : 503,
    },
  );
}
