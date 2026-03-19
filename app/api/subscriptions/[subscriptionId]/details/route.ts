import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildSubscriptionDetailsFromRecord, findFirstSubscriptionDetailsRecord } from "@/lib/subscription-details-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SubscriptionDetailsRouteContext = {
  params: {
    subscriptionId: string;
  };
};

export async function GET(_request: Request, context: SubscriptionDetailsRouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const subscriptionId = context.params.subscriptionId?.trim();

  if (!subscriptionId) {
    return NextResponse.json({ error: "Invalid subscription id." }, { status: 400 });
  }

  const subscription = await findFirstSubscriptionDetailsRecord(db, {
    id: subscriptionId,
    userId: user.id,
  });

  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  }

  const data = buildSubscriptionDetailsFromRecord(subscription);

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
