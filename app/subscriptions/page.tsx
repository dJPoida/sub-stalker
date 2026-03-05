import { requireAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

import {
  createSubscriptionAction,
  deactivateSubscriptionAction,
  updateSubscriptionAction,
} from "./actions";
import SubscriptionsClient from "./SubscriptionsClient";

type SubscriptionsPageProps = {
  searchParams?: {
    error?: string;
    result?: string;
  };
};

function getResultMessage(searchParams?: SubscriptionsPageProps["searchParams"]): {
  type: "error" | "success";
  text: string;
} | null {
  if (!searchParams) {
    return null;
  }

  if (searchParams.error === "invalid_request") {
    return {
      type: "error",
      text: "Invalid subscriptions request. Please retry from this page.",
    };
  }

  if (searchParams.error === "invalid_fields") {
    return {
      type: "error",
      text: "Invalid subscription details. Check amount, currency, and billing fields.",
    };
  }

  if (searchParams.error === "not_found") {
    return {
      type: "error",
      text: "Subscription not found or not accessible for this account.",
    };
  }

  if (searchParams.result === "created") {
    return {
      type: "success",
      text: "Subscription created.",
    };
  }

  if (searchParams.result === "updated") {
    return {
      type: "success",
      text: "Subscription updated.",
    };
  }

  if (searchParams.result === "deactivated") {
    return {
      type: "success",
      text: "Subscription deactivated.",
    };
  }

  return null;
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const user = await requireAuthenticatedUser();
  const resultMessage = getResultMessage(searchParams);
  const subscriptions = await db.subscription.findMany({
    where: {
      userId: user.id,
    },
    orderBy: [{ isActive: "desc" }, { nextBillingDate: "asc" }, { createdAt: "desc" }],
  });

  return (
    <SubscriptionsClient
      createAction={createSubscriptionAction}
      deactivateAction={deactivateSubscriptionAction}
      resultMessage={resultMessage}
      subscriptions={subscriptions.map((subscription) => ({
        id: subscription.id,
        name: subscription.name,
        provider: subscription.provider,
        amountCents: subscription.amountCents,
        currency: subscription.currency,
        billingInterval: subscription.billingInterval,
        nextBillingDate: subscription.nextBillingDate ? subscription.nextBillingDate.toISOString() : null,
        isActive: subscription.isActive,
        createdAt: subscription.createdAt.toISOString(),
      }))}
      updateAction={updateSubscriptionAction}
      userEmail={user.email}
    />
  );
}
