import { Prisma, type PrismaClient } from "@prisma/client";

import { buildSubscriptionDetails, type SubscriptionDetailsContract } from "@/lib/subscription-details";

export const subscriptionDetailsBaseRecordSelect = {
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
} satisfies Prisma.SubscriptionSelect;

export const subscriptionDetailsRecordSelect = {
  ...subscriptionDetailsBaseRecordSelect,
  markedForReview: true,
} satisfies Prisma.SubscriptionSelect;

export type SubscriptionDetailsDbRecord = Prisma.SubscriptionGetPayload<{
  select: typeof subscriptionDetailsBaseRecordSelect;
}> & {
  markedForReview?: boolean | null;
};

type SubscriptionDetailsRecordWhere = {
  id?: string;
  userId?: string;
};

function isMissingMarkedForReviewColumnError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2022") {
    return false;
  }

  return String(error.meta?.column ?? "") === "Subscription.markedForReview";
}

export function isReviewStateUnavailableError(error: unknown): boolean {
  return error instanceof Error && error.name === "ReviewStateUnavailableError";
}

function createReviewStateUnavailableError(): Error {
  const error = new Error("Review-state persistence is unavailable until the database migration is applied.");
  error.name = "ReviewStateUnavailableError";
  return error;
}

export async function findFirstSubscriptionDetailsRecord(
  prisma: PrismaClient,
  where: SubscriptionDetailsRecordWhere,
): Promise<SubscriptionDetailsDbRecord | null> {
  try {
    return await prisma.subscription.findFirst({
      where,
      select: subscriptionDetailsRecordSelect,
    });
  } catch (error) {
    if (!isMissingMarkedForReviewColumnError(error)) {
      throw error;
    }

    return prisma.subscription.findFirst({
      where,
      select: subscriptionDetailsBaseRecordSelect,
    });
  }
}

export async function updateSubscriptionDetailsRecord(
  prisma: PrismaClient,
  subscriptionId: string,
  data: Prisma.SubscriptionUpdateInput,
): Promise<SubscriptionDetailsDbRecord> {
  try {
    return await prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data,
      select: subscriptionDetailsRecordSelect,
    });
  } catch (error) {
    if (!isMissingMarkedForReviewColumnError(error)) {
      throw error;
    }

    if ("markedForReview" in data) {
      throw createReviewStateUnavailableError();
    }

    return prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data,
      select: subscriptionDetailsBaseRecordSelect,
    });
  }
}

export type SubscriptionListRecord = Prisma.SubscriptionGetPayload<{
  select: {
    id: true;
    name: true;
    paymentMethod: true;
    signedUpBy: true;
    billingConsoleUrl: true;
    cancelSubscriptionUrl: true;
    billingHistoryUrl: true;
    notesMarkdown: true;
    amountCents: true;
    currency: true;
    billingInterval: true;
    nextBillingDate: true;
    isActive: true;
    createdAt: true;
  };
}>;

export const subscriptionListRecordSelect = {
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
} satisfies Prisma.SubscriptionSelect;

export function buildSubscriptionDetailsFromRecord(subscription: SubscriptionDetailsDbRecord): SubscriptionDetailsContract {
  return buildSubscriptionDetails({
    ...subscription,
    remindersEnabled: subscription.user.settings?.remindersEnabled ?? true,
    reminderDaysBefore: subscription.user.settings?.reminderDaysBefore ?? 3,
  });
}
