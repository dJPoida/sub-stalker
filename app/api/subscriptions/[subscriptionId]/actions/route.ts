import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildSubscriptionDetailsFromRecord,
  findFirstSubscriptionDetailsRecord,
  isReviewStateUnavailableError,
  updateSubscriptionDetailsRecord,
} from "@/lib/subscription-details-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SubscriptionActionsRouteContext = {
  params: {
    subscriptionId: string;
  };
};

type SubscriptionMutationAction = "mark_cancelled" | "mark_for_review";

type SubscriptionActionRequestBody = {
  action?: SubscriptionMutationAction;
};

function parseAction(value: unknown): SubscriptionMutationAction | null {
  return value === "mark_cancelled" || value === "mark_for_review" ? value : null;
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }

  if (!host) {
    return false;
  }

  const proto = request.headers.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "development" ? "http" : "https");

  try {
    const originUrl = new URL(origin);
    return originUrl.host.toLowerCase() === host.toLowerCase() && originUrl.protocol === `${proto}:`;
  } catch {
    return false;
  }
}

async function getOwnedSubscriptionRecord(subscriptionId: string, userId: string) {
  return findFirstSubscriptionDetailsRecord(db, {
    id: subscriptionId,
    userId,
  });
}

export async function POST(request: Request, context: SubscriptionActionsRouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const subscriptionId = context.params.subscriptionId?.trim();

  if (!subscriptionId) {
    return NextResponse.json({ error: "Invalid subscription id." }, { status: 400 });
  }

  let body: SubscriptionActionRequestBody;

  try {
    body = (await request.json()) as SubscriptionActionRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid action payload." }, { status: 400 });
  }

  const action = parseAction(body.action);

  if (!action) {
    return NextResponse.json({ error: "Unsupported subscription action." }, { status: 400 });
  }

  const existingSubscription = await getOwnedSubscriptionRecord(subscriptionId, user.id);

  if (!existingSubscription) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  }

  if (action === "mark_cancelled" && !existingSubscription.isActive) {
    return NextResponse.json(
      {
        error: "Subscription is already inactive.",
        data: buildSubscriptionDetailsFromRecord(existingSubscription),
      },
      { status: 409 },
    );
  }

  if (action === "mark_for_review" && existingSubscription.markedForReview) {
    return NextResponse.json(
      {
        error: "Subscription is already marked for review.",
        data: buildSubscriptionDetailsFromRecord(existingSubscription),
      },
      { status: 409 },
    );
  }

  let updatedSubscription;

  try {
    updatedSubscription = await updateSubscriptionDetailsRecord(
      db,
      subscriptionId,
      action === "mark_cancelled"
        ? {
            isActive: false,
          }
        : {
            markedForReview: true,
          },
    );
  } catch (error) {
    if (action === "mark_for_review" && isReviewStateUnavailableError(error)) {
      return NextResponse.json(
        {
          error: "Review-state persistence is unavailable until the latest database migration is applied.",
          data: buildSubscriptionDetailsFromRecord(existingSubscription),
        },
        { status: 409 },
      );
    }

    throw error;
  }

  return NextResponse.json(
    {
      action,
      data: buildSubscriptionDetailsFromRecord(updatedSubscription),
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
