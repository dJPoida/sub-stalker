import { NextRequest, NextResponse } from "next/server";

import { runDailyMaintenanceJobs } from "@/lib/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "Missing CRON_SECRET for daily maintenance endpoint." },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    return unauthorizedResponse();
  }

  const result = await runDailyMaintenanceJobs();

  return NextResponse.json({
    ok: true,
    jobs: {
      staleSignInAttemptsDeleted: result.staleSignInAttemptsDeleted,
      expiredPendingInvitesMarked: result.expiredPendingInvitesMarked,
      emailDeliveryLogsDeleted: result.emailDeliveryLogsDeleted,
    },
    ranAt: result.ranAt,
  });
}
