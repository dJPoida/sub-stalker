import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getDashboardPayloadForUser } from "@/lib/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const data = await getDashboardPayloadForUser(user.id);

  return NextResponse.json(
    {
      data,
      fetchedAt: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
