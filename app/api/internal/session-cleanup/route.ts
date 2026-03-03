import { NextRequest, NextResponse } from "next/server";

import { pruneExpiredSessions, pruneStaleSignInAttempts } from "@/lib/auth";

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
      { error: "Missing CRON_SECRET for session cleanup endpoint." },
      { status: 500 },
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    return unauthorizedResponse();
  }

  const [sessionsDeleted, attemptsDeleted] = await Promise.all([
    pruneExpiredSessions(),
    pruneStaleSignInAttempts(),
  ]);

  return NextResponse.json({
    ok: true,
    sessionsDeleted,
    attemptsDeleted,
    cleanedAt: new Date().toISOString(),
  });
}
