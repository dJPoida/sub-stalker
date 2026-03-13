import { inferSubscriptionCategory } from "@/lib/subscription-classification";

export type BillingIntervalCode = "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";

export type SubscriptionModalOpenSource = "upcoming_charges" | "subscriptions_list";

export type SubscriptionModalCloseReason = "backdrop" | "escape_key" | "close_button" | "unknown";

export type SubscriptionDetailsEvent = {
  id: string;
  type: "created" | "updated" | "next_charge" | "deactivated" | "billing_profile";
  label: string;
  description: string;
  timestamp: string;
  amountCents: number | null;
  currency: string | null;
};

export type SubscriptionDetailsSpendMetric = {
  label: string;
  amountCents: number | null;
  currency: string;
};

export type SubscriptionDetailsContract = {
  id: string;
  name: string;
  status: "ACTIVE" | "CANCELED";
  amountCents: number;
  currency: string;
  billingInterval: BillingIntervalCode;
  billingIntervalLabel: string;
  normalizedMonthlyAmountCents: number | null;
  normalizedYearlyAmountCents: number | null;
  nextBillingDate: string | null;
  startDate: string;
  renewalDate: string | null;
  lastChargeDate: string | null;
  lastChargeAmountCents: number | null;
  paymentMethodMasked: string;
  trialEndDate: string | null;
  planName: string | null;
  autoRenew: boolean;
  cancellationEffectiveDate: string | null;
  cancellationReason: string | null;
  signedUpBy: string | null;
  inferredCategory: string;
  spendSummary: SubscriptionDetailsSpendMetric;
  metadataTags: string[];
  notesMarkdown: string | null;
  links: {
    billingConsoleUrl: string | null;
    cancelSubscriptionUrl: string | null;
    billingHistoryUrl: string | null;
  };
  internalIdentifiers: {
    subscriptionId: string;
    providerReference: string | null;
  };
  timeline: SubscriptionDetailsEvent[];
  lastUpdatedAt: string;
};

export type SubscriptionDetailsSourceRecord = {
  id: string;
  name: string;
  paymentMethod: string;
  signedUpBy: string | null;
  billingConsoleUrl: string | null;
  cancelSubscriptionUrl: string | null;
  billingHistoryUrl: string | null;
  notesMarkdown: string | null;
  amountCents: number;
  currency: string;
  billingInterval: BillingIntervalCode;
  nextBillingDate: Date | string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function toOptionalIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return toIsoString(value);
}

function formatBillingIntervalLabel(interval: BillingIntervalCode): string {
  switch (interval) {
    case "WEEKLY":
      return "Weekly";
    case "MONTHLY":
      return "Monthly";
    case "YEARLY":
      return "Yearly";
    default:
      return "Custom";
  }
}

function estimateNormalizedMonthlyAmountCents(amountCents: number, interval: BillingIntervalCode): number | null {
  switch (interval) {
    case "WEEKLY":
      return Math.round(amountCents * 4.33);
    case "MONTHLY":
      return amountCents;
    case "YEARLY":
      return Math.round(amountCents / 12);
    default:
      return null;
  }
}

function estimateNormalizedYearlyAmountCents(amountCents: number, interval: BillingIntervalCode): number | null {
  switch (interval) {
    case "WEEKLY":
      return amountCents * 52;
    case "MONTHLY":
      return amountCents * 12;
    case "YEARLY":
      return amountCents;
    default:
      return null;
  }
}

function maskPaymentMethod(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Not set";
  }

  if (trimmed.length <= 4) {
    return "••••";
  }

  return `•••• ${trimmed.slice(-4)}`;
}

function buildTimeline(record: SubscriptionDetailsSourceRecord): SubscriptionDetailsEvent[] {
  const createdAtIso = toIsoString(record.createdAt);
  const updatedAtIso = toIsoString(record.updatedAt);
  const nextBillingDateIso = toOptionalIsoString(record.nextBillingDate);
  const events: SubscriptionDetailsEvent[] = [
    {
      id: `${record.id}-created`,
      type: "created",
      label: "Subscription added",
      description: "This subscription was created in Sub Stalker.",
      timestamp: createdAtIso,
      amountCents: record.amountCents,
      currency: record.currency,
    },
    {
      id: `${record.id}-billing-profile`,
      type: "billing_profile",
      label: "Billing profile recorded",
      description: `${formatBillingIntervalLabel(record.billingInterval)} cadence captured with payment method on file.`,
      timestamp: createdAtIso,
      amountCents: record.amountCents,
      currency: record.currency,
    },
  ];

  if (nextBillingDateIso) {
    events.push({
      id: `${record.id}-next-charge`,
      type: "next_charge",
      label: record.isActive ? "Next charge scheduled" : "Cancellation effective date",
      description: record.isActive
        ? "Upcoming billing date for the active subscription."
        : "Recorded cancellation date for this inactive subscription.",
      timestamp: nextBillingDateIso,
      amountCents: record.amountCents,
      currency: record.currency,
    });
  }

  if (!record.isActive) {
    events.push({
      id: `${record.id}-deactivated`,
      type: "deactivated",
      label: "Subscription marked inactive",
      description: "This subscription is no longer set to active billing.",
      timestamp: updatedAtIso,
      amountCents: null,
      currency: null,
    });
  }

  if (updatedAtIso !== createdAtIso) {
    events.push({
      id: `${record.id}-updated`,
      type: "updated",
      label: "Subscription updated",
      description: "Subscription details were updated.",
      timestamp: updatedAtIso,
      amountCents: null,
      currency: null,
    });
  }

  return events.sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime()).slice(0, 10);
}

function buildMetadataTags(record: SubscriptionDetailsSourceRecord): string[] {
  const tags = [
    formatBillingIntervalLabel(record.billingInterval),
    record.currency.toUpperCase(),
    record.isActive ? "Active" : "Inactive",
  ];

  if (record.signedUpBy?.trim()) {
    tags.push(`Owner: ${record.signedUpBy.trim()}`);
  }

  return tags;
}

export function buildSubscriptionDetails(record: SubscriptionDetailsSourceRecord): SubscriptionDetailsContract {
  const normalizedMonthlyAmountCents = estimateNormalizedMonthlyAmountCents(record.amountCents, record.billingInterval);
  const normalizedYearlyAmountCents = estimateNormalizedYearlyAmountCents(record.amountCents, record.billingInterval);
  const nextBillingDateIso = toOptionalIsoString(record.nextBillingDate);
  const inferredCategory = inferSubscriptionCategory(record.name);

  return {
    id: record.id,
    name: record.name,
    status: record.isActive ? "ACTIVE" : "CANCELED",
    amountCents: record.amountCents,
    currency: record.currency,
    billingInterval: record.billingInterval,
    billingIntervalLabel: formatBillingIntervalLabel(record.billingInterval),
    normalizedMonthlyAmountCents,
    normalizedYearlyAmountCents,
    nextBillingDate: nextBillingDateIso,
    startDate: toIsoString(record.createdAt),
    renewalDate: nextBillingDateIso,
    lastChargeDate: null,
    lastChargeAmountCents: null,
    paymentMethodMasked: maskPaymentMethod(record.paymentMethod),
    trialEndDate: null,
    planName: null,
    autoRenew: record.isActive,
    cancellationEffectiveDate: record.isActive ? null : nextBillingDateIso,
    cancellationReason: null,
    signedUpBy: record.signedUpBy?.trim() ? record.signedUpBy.trim() : null,
    inferredCategory,
    spendSummary: {
      label: "Projected annual spend",
      amountCents: normalizedYearlyAmountCents,
      currency: record.currency,
    },
    metadataTags: buildMetadataTags(record),
    notesMarkdown: record.notesMarkdown,
    links: {
      billingConsoleUrl: record.billingConsoleUrl,
      cancelSubscriptionUrl: record.cancelSubscriptionUrl,
      billingHistoryUrl: record.billingHistoryUrl,
    },
    internalIdentifiers: {
      subscriptionId: record.id,
      providerReference: null,
    },
    timeline: buildTimeline(record),
    lastUpdatedAt: toIsoString(record.updatedAt),
  };
}
