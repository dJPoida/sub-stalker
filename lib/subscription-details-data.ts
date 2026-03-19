import type { Prisma } from "@prisma/client";

import { buildSubscriptionDetails, type SubscriptionDetailsContract } from "@/lib/subscription-details";

export const subscriptionDetailsRecordSelect = {
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
  markedForReview: true,
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

export type SubscriptionDetailsDbRecord = Prisma.SubscriptionGetPayload<{
  select: typeof subscriptionDetailsRecordSelect;
}>;

export function buildSubscriptionDetailsFromRecord(subscription: SubscriptionDetailsDbRecord): SubscriptionDetailsContract {
  return buildSubscriptionDetails({
    ...subscription,
    remindersEnabled: subscription.user.settings?.remindersEnabled ?? true,
    reminderDaysBefore: subscription.user.settings?.reminderDaysBefore ?? 3,
  });
}
