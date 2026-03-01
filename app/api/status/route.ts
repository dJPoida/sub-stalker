import { NextResponse } from "next/server";

import { getDatabaseStatus } from "@/lib/status";

export const runtime = "nodejs";

export async function GET() {
  const database = await getDatabaseStatus();

  return NextResponse.json(
    {
      app: "Subscription Stalker",
      status: database.connected ? "ok" : "degraded",
      database,
      metrics: {
        users: null,
        subscriptions: null,
        monthlySpend: null,
      },
    },
    {
      status: database.connected ? 200 : 503,
    },
  );
}
