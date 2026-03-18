import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildSubscriptionDetails } from "@/lib/subscription-details";

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

  const subscription = await db.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
      paymentMethod: true,
      signedUpBy: true,
      billingConsoleUrl: true,
      cancelSubscriptionUrl: true,
      billingHistoryUrl: true,
      notesMarkdown: true,
      amountCents: true,
      currency: true,
      billingInterval: true,
      nextBillingDate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          settings: {
            select: {
              remindersEnabled: true,
              reminderDaysBefore: true,
            },
          },
        },
      },
    },
  });

  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  }

  const data = buildSubscriptionDetails({
    ...subscription,
    remindersEnabled: subscription.user.settings?.remindersEnabled ?? true,
    reminderDaysBefore: subscription.user.settings?.reminderDaysBefore ?? 3,
  });

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
