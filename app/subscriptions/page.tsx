import { requireAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { subscriptionListRecordSelect } from "@/lib/subscription-details-data";

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
    eventId?: string;
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
      text: "Invalid subscription details. Check amount, currency, billing fields, and any URLs.",
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

function getUpdateSuccessToken(searchParams?: SubscriptionsPageProps["searchParams"]): string | null {
  if (searchParams?.result !== "updated") {
    return null;
  }

  const eventId = searchParams.eventId?.trim();
  return eventId && eventId.length > 0 ? eventId : "updated";
}

function getCreateSuccessToken(searchParams?: SubscriptionsPageProps["searchParams"]): string | null {
  if (searchParams?.result !== "created") {
    return null;
  }

  const eventId = searchParams.eventId?.trim();
  return eventId && eventId.length > 0 ? eventId : "created";
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const user = await requireAuthenticatedUser();
  const resultMessage = getResultMessage(searchParams);
  const createSuccessToken = getCreateSuccessToken(searchParams);
  const updateSuccessToken = getUpdateSuccessToken(searchParams);
  const [subscriptions, paymentMethodSuggestions, signedUpBySuggestions] = await Promise.all([
    db.subscription.findMany({
      where: {
        userId: user.id,
      },
      select: subscriptionListRecordSelect,
      orderBy: [{ isActive: "desc" }, { nextBillingDate: "asc" }, { createdAt: "desc" }],
    }),
    db.subscription.findMany({
      where: {
        userId: user.id,
      },
      select: {
        paymentMethod: true,
      },
      distinct: ["paymentMethod"],
      orderBy: {
        paymentMethod: "asc",
      },
    }),
    db.subscription.findMany({
      where: {
        userId: user.id,
        signedUpBy: {
          not: null,
        },
      },
      select: {
        signedUpBy: true,
      },
      distinct: ["signedUpBy"],
      orderBy: {
        signedUpBy: "asc",
      },
    }),
  ]);

  return (
    <SubscriptionsClient
      createSuccessToken={createSuccessToken}
      createAction={createSubscriptionAction}
      deactivateAction={deactivateSubscriptionAction}
      resultMessage={resultMessage}
      updateSuccessToken={updateSuccessToken}
      subscriptions={subscriptions.map((subscription) => ({
        id: subscription.id,
        name: subscription.name,
        paymentMethod: subscription.paymentMethod,
        signedUpBy: subscription.signedUpBy,
        billingConsoleUrl: subscription.billingConsoleUrl,
        cancelSubscriptionUrl: subscription.cancelSubscriptionUrl,
        billingHistoryUrl: subscription.billingHistoryUrl,
        notesMarkdown: subscription.notesMarkdown,
        amountCents: subscription.amountCents,
        currency: subscription.currency,
        billingInterval: subscription.billingInterval,
        nextBillingDate: subscription.nextBillingDate ? subscription.nextBillingDate.toISOString() : null,
        isActive: subscription.isActive,
        createdAt: subscription.createdAt.toISOString(),
      }))}
      paymentMethodSuggestions={paymentMethodSuggestions.map((entry) => entry.paymentMethod)}
      signedUpBySuggestions={signedUpBySuggestions
        .map((entry) => entry.signedUpBy?.trim() ?? "")
        .filter((value) => value.length > 0)}
      updateAction={updateSubscriptionAction}
      userEmail={user.email}
    />
  );
}
