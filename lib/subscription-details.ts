import { inferSubscriptionCategory } from "@/lib/subscription-classification";

export type BillingIntervalCode = "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";

export type SubscriptionModalOpenSource = "upcoming_charges" | "subscriptions_list";

export type SubscriptionModalCloseReason = "backdrop" | "escape_key" | "close_button" | "unknown";

export type SubscriptionDetailsSectionState = "ready" | "partial" | "empty";

export type SubscriptionDetailsChipTone = "neutral" | "success" | "warning" | "danger";

export type SubscriptionDetailsActionAvailability = "enabled" | "disabled";

export type SubscriptionDetailsActionKind = "client" | "navigate" | "mutate";

export type SubscriptionDetailsActionPlacement = "header" | "quick_actions" | "footer";

export type SubscriptionDetailsActionPermission = "owner_read" | "owner_write";

export type SubscriptionDetailsLifecycleStage = "active" | "cancel_scheduled" | "canceled";

export type SubscriptionDetailsAlertCode =
  | "promo_ending_soon"
  | "price_increase_imminent"
  | "higher_price_renewal";

export type SubscriptionDetailsAlertSeverity = "high" | "medium" | "low";

export type SubscriptionDetailsRuleStatus = "matched" | "not_applicable" | "insufficient_data";

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

export type SubscriptionDetailsChip = {
  key: string;
  label: string;
  tone: SubscriptionDetailsChipTone;
};

export type SubscriptionDetailsAlertItem = {
  code: SubscriptionDetailsAlertCode;
  severity: SubscriptionDetailsAlertSeverity;
  title: string;
  message: string;
  effectiveDate: string | null;
  currentAmountCents: number | null;
  projectedAmountCents: number | null;
  currency: string | null;
};

export type SubscriptionDetailsAlertRuleOutcome = {
  code: SubscriptionDetailsAlertCode;
  status: SubscriptionDetailsRuleStatus;
  reason: string;
  missingFields: string[];
};

export type SubscriptionDetailsActionCapability = {
  key:
    | "edit_subscription"
    | "mark_cancelled"
    | "open_management_page"
    | "change_alert"
    | "mark_for_review"
    | "cancel_soon"
    | "view_billing_history";
  label: string;
  placement: SubscriptionDetailsActionPlacement;
  kind: SubscriptionDetailsActionKind;
  availability: SubscriptionDetailsActionAvailability;
  unavailableReason: string | null;
  href: string | null;
  permission: SubscriptionDetailsActionPermission;
  requiresConfirmation: boolean;
  confirmationLabel: string | null;
  serverValidation: string[];
};

export type SubscriptionDetailsV2Contract = {
  generatedAt: string;
  sectionStates: Record<
    "header" | "summaryStrip" | "attentionNeeded" | "actionBar" | "billingDetails" | "notesCategory" | "paymentHistory" | "management" | "lifecycle",
    SubscriptionDetailsSectionState
  >;
  header: {
    state: SubscriptionDetailsSectionState;
    title: string;
    subtitle: string;
    categoryLabel: string;
    status: {
      stage: SubscriptionDetailsLifecycleStage;
      label: string;
    };
    chips: SubscriptionDetailsChip[];
  };
  summaryStrip: {
    state: SubscriptionDetailsSectionState;
    currentPrice: {
      amountCents: number;
      currency: string;
      intervalLabel: string;
      monthlyEquivalentAmountCents: number | null;
    };
    renewal: {
      date: string | null;
      annualizedSpendCents: number | null;
      projectedAmountCents: number | null;
      currency: string;
    };
    paymentMethod: {
      masked: string;
      signedUpBy: string | null;
    };
    reminders: {
      enabled: boolean;
      daysBefore: number;
      statusLabel: string;
    };
  };
  attentionNeeded: {
    state: SubscriptionDetailsSectionState;
    items: SubscriptionDetailsAlertItem[];
    ruleOutcomes: SubscriptionDetailsAlertRuleOutcome[];
  };
  actionBar: {
    state: SubscriptionDetailsSectionState;
    header: SubscriptionDetailsActionCapability[];
    quickActions: SubscriptionDetailsActionCapability[];
    footer: SubscriptionDetailsActionCapability[];
  };
  billingDetails: {
    state: SubscriptionDetailsSectionState;
    amountCents: number;
    currency: string;
    billingInterval: BillingIntervalCode;
    billingIntervalLabel: string;
    nextBillingDate: string | null;
    paymentMethodMasked: string;
    spendSummary: SubscriptionDetailsSpendMetric;
    trialEndDate: string | null;
  };
  notesCategory: {
    state: SubscriptionDetailsSectionState;
    inferredCategory: string;
    signedUpBy: string | null;
    notesMarkdown: string | null;
    metadataTags: string[];
  };
  paymentHistory: {
    state: SubscriptionDetailsSectionState;
    items: SubscriptionDetailsEvent[];
    upcomingRenewal: {
      renewalDate: string | null;
      projectedAmountCents: number | null;
      currency: string;
    };
    maxVisibleItems: number;
    hasMore: boolean;
  };
  management: {
    state: SubscriptionDetailsSectionState;
    providerDisplayName: string;
    billingConsoleUrl: string | null;
    cancelSubscriptionUrl: string | null;
    billingHistoryUrl: string | null;
    internalIdentifiers: {
      subscriptionId: string;
      providerReference: string | null;
    };
  };
  lifecycle: {
    state: SubscriptionDetailsSectionState;
    stage: SubscriptionDetailsLifecycleStage;
    label: string;
    autoRenew: boolean;
    startDate: string;
    renewalDate: string | null;
    cancellationEffectiveDate: string | null;
    cancellationReason: string | null;
    reviewState: {
      isMarked: boolean;
      canPersist: boolean;
      unavailableReason: string | null;
    };
    chips: SubscriptionDetailsChip[];
  };
};

export type SubscriptionDetailsContract = {
  schemaVersion: "2026-03-v2";
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
  v2: SubscriptionDetailsV2Contract;
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
  remindersEnabled?: boolean | null;
  reminderDaysBefore?: number | null;
  providerReference?: string | null;
  projectedNextChargeAmountCents?: number | null;
  lastChargedAmountCents?: number | null;
  trialEndDate?: Date | string | null;
  planName?: string | null;
  cancellationReason?: string | null;
  markedForReview?: boolean | null;
};

type BuildSubscriptionDetailsOptions = {
  now?: Date;
};

const TIMELINE_LIMIT = 10;
const WEEKLY_TO_MONTHLY_FACTOR = 4.33;
const DEFAULT_REMINDER_DAYS_BEFORE = 3;
const MAX_REMINDER_DAYS_BEFORE = 30;
const DAYS_TO_MILLISECONDS = 24 * 60 * 60 * 1000;
const ATTENTION_PROMO_WINDOW_DAYS = 7;
const ATTENTION_PROMO_MAX_ACCOUNT_AGE_DAYS = 45;
const PROMO_HINT_KEYWORDS = ["trial", "promo", "intro", "discount", "offer", "starter"] as const;

function toDate(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date value while building subscription details.");
  }

  return parsed;
}

function toIsoString(value: Date | string): string {
  return toDate(value).toISOString();
}

function toOptionalIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return toIsoString(value);
}

function normalizeCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  return normalized || "USD";
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
      return Math.round(amountCents * WEEKLY_TO_MONTHLY_FACTOR);
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

function normalizeReminderDaysBefore(value: number | null | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_REMINDER_DAYS_BEFORE;
  }

  const rounded = Math.floor(value as number);

  if (rounded < 0) {
    return 0;
  }

  if (rounded > MAX_REMINDER_DAYS_BEFORE) {
    return MAX_REMINDER_DAYS_BEFORE;
  }

  return rounded;
}

function daysUntil(value: Date, now: Date): number {
  return Math.max(0, Math.ceil((value.getTime() - now.getTime()) / DAYS_TO_MILLISECONDS));
}

function daysSince(value: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - value.getTime()) / DAYS_TO_MILLISECONDS));
}

function formatCurrencyForCopy(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatDateForCopy(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatPositiveDeltaForCopy(currentAmountCents: number, projectedAmountCents: number, currency: string): string {
  return formatCurrencyForCopy(Math.max(0, projectedAmountCents - currentAmountCents), currency);
}

function hasPromoHint(name: string): boolean {
  const lowered = name.trim().toLowerCase();
  return PROMO_HINT_KEYWORDS.some((keyword) => lowered.includes(keyword));
}

function buildTimeline(record: SubscriptionDetailsSourceRecord): SubscriptionDetailsEvent[] {
  const createdAtIso = toIsoString(record.createdAt);
  const updatedAtIso = toIsoString(record.updatedAt);
  const nextBillingDateIso = toOptionalIsoString(record.nextBillingDate);
  const currency = normalizeCurrency(record.currency);
  const events: SubscriptionDetailsEvent[] = [
    {
      id: `${record.id}-created`,
      type: "created",
      label: "Subscription added",
      description: "This subscription was created in Sub Stalker.",
      timestamp: createdAtIso,
      amountCents: record.amountCents,
      currency,
    },
    {
      id: `${record.id}-billing-profile`,
      type: "billing_profile",
      label: "Billing profile recorded",
      description: `${formatBillingIntervalLabel(record.billingInterval)} cadence captured with payment method on file.`,
      timestamp: createdAtIso,
      amountCents: record.amountCents,
      currency,
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
      amountCents: record.projectedNextChargeAmountCents ?? record.amountCents,
      currency,
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

  return events
    .sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime())
    .slice(0, TIMELINE_LIMIT);
}

function deriveLifecycleStage(record: SubscriptionDetailsSourceRecord, now: Date): SubscriptionDetailsLifecycleStage {
  if (record.isActive) {
    return "active";
  }

  const nextBillingDate = record.nextBillingDate ? toDate(record.nextBillingDate) : null;

  if (nextBillingDate && nextBillingDate.getTime() > now.getTime()) {
    return "cancel_scheduled";
  }

  return "canceled";
}

function lifecycleLabel(stage: SubscriptionDetailsLifecycleStage): string {
  switch (stage) {
    case "active":
      return "Active";
    case "cancel_scheduled":
      return "Cancel scheduled";
    default:
      return "Canceled";
  }
}

function lifecycleTone(stage: SubscriptionDetailsLifecycleStage): SubscriptionDetailsChipTone {
  switch (stage) {
    case "active":
      return "success";
    case "cancel_scheduled":
      return "warning";
    default:
      return "danger";
  }
}

function buildMetadataTags(record: SubscriptionDetailsSourceRecord, stage: SubscriptionDetailsLifecycleStage): string[] {
  const tags = [
    formatBillingIntervalLabel(record.billingInterval),
    normalizeCurrency(record.currency),
    lifecycleLabel(stage),
  ];

  if (record.signedUpBy?.trim()) {
    tags.push(`Owner: ${record.signedUpBy.trim()}`);
  }

  return tags;
}

function buildAlertRuleOutcomes(
  record: SubscriptionDetailsSourceRecord,
  now: Date,
  currency: string,
): SubscriptionDetailsAlertRuleOutcome[] {
  const nextBillingDate = record.nextBillingDate ? toDate(record.nextBillingDate) : null;
  const createdAt = toDate(record.createdAt);
  const outcomes: SubscriptionDetailsAlertRuleOutcome[] = [];

  if (!record.isActive) {
    outcomes.push({
      code: "promo_ending_soon",
      status: "not_applicable",
      reason: "Promo-end alerts are only evaluated for active subscriptions.",
      missingFields: [],
    });
  } else if (!hasPromoHint(record.name)) {
    outcomes.push({
      code: "promo_ending_soon",
      status: "not_applicable",
      reason: "No promo or trial keywords were found in the subscription name.",
      missingFields: [],
    });
  } else if (!nextBillingDate) {
    outcomes.push({
      code: "promo_ending_soon",
      status: "insufficient_data",
      reason: "A next billing date is required to estimate when a promo window ends.",
      missingFields: ["nextBillingDate"],
    });
  } else {
    const accountAgeDays = daysSince(createdAt, now);
    const daysUntilRenewal = daysUntil(nextBillingDate, now);

    if (accountAgeDays > ATTENTION_PROMO_MAX_ACCOUNT_AGE_DAYS) {
      outcomes.push({
        code: "promo_ending_soon",
        status: "not_applicable",
        reason: "The subscription age exceeds the promo-watch window.",
        missingFields: [],
      });
    } else if (daysUntilRenewal > ATTENTION_PROMO_WINDOW_DAYS) {
      outcomes.push({
        code: "promo_ending_soon",
        status: "not_applicable",
        reason: "The next renewal is outside the promo-watch window.",
        missingFields: [],
      });
    } else {
      outcomes.push({
        code: "promo_ending_soon",
        status: "matched",
        reason: `Renewal is due within ${ATTENTION_PROMO_WINDOW_DAYS} days and the subscription name suggests promo pricing.`,
        missingFields: [],
      });
    }
  }

  if (!nextBillingDate) {
    outcomes.push({
      code: "price_increase_imminent",
      status: "insufficient_data",
      reason: "A next billing date is required to time price-change messaging.",
      missingFields: ["nextBillingDate"],
    });
  } else if (record.projectedNextChargeAmountCents === null || record.projectedNextChargeAmountCents === undefined) {
    outcomes.push({
      code: "price_increase_imminent",
      status: "insufficient_data",
      reason: "Projected next-charge pricing is not stored yet.",
      missingFields: ["projectedNextChargeAmountCents"],
    });
  } else if (record.projectedNextChargeAmountCents > record.amountCents && daysUntil(nextBillingDate, now) <= ATTENTION_PROMO_WINDOW_DAYS) {
    outcomes.push({
      code: "price_increase_imminent",
      status: "matched",
      reason: `Projected renewal price exceeds the current amount within ${ATTENTION_PROMO_WINDOW_DAYS} days.`,
      missingFields: [],
    });
  } else {
    outcomes.push({
      code: "price_increase_imminent",
      status: "not_applicable",
      reason: "No imminent price increase was derived from the available renewal pricing data.",
      missingFields: [],
    });
  }

  if (!nextBillingDate) {
    outcomes.push({
      code: "higher_price_renewal",
      status: "insufficient_data",
      reason: "A next billing date is required to describe the next renewal event.",
      missingFields: ["nextBillingDate"],
    });
  } else if (record.lastChargedAmountCents === null || record.lastChargedAmountCents === undefined) {
    outcomes.push({
      code: "higher_price_renewal",
      status: "insufficient_data",
      reason: "A prior charged amount is required to compare renewal pricing.",
      missingFields: ["lastChargedAmountCents"],
    });
  } else if (record.projectedNextChargeAmountCents === null || record.projectedNextChargeAmountCents === undefined) {
    outcomes.push({
      code: "higher_price_renewal",
      status: "insufficient_data",
      reason: "Projected next-charge pricing is required to compare renewal pricing.",
      missingFields: ["projectedNextChargeAmountCents"],
    });
  } else if (record.projectedNextChargeAmountCents > record.lastChargedAmountCents) {
    outcomes.push({
      code: "higher_price_renewal",
      status: "matched",
      reason: "Projected renewal amount is higher than the last captured charge amount.",
      missingFields: [],
    });
  } else {
    outcomes.push({
      code: "higher_price_renewal",
      status: "not_applicable",
      reason: "Projected renewal amount does not exceed the last captured charge amount.",
      missingFields: [],
    });
  }

  return outcomes.map((outcome) => ({
    ...outcome,
    reason:
      outcome.code === "promo_ending_soon"
        ? outcome.reason
        : `${outcome.reason}${currency ? ` Currency context: ${currency}.` : ""}`,
  }));
}

function buildAlertItems(
  outcomes: SubscriptionDetailsAlertRuleOutcome[],
  record: SubscriptionDetailsSourceRecord,
  currency: string,
): SubscriptionDetailsAlertItem[] {
  const nextBillingDate = toOptionalIsoString(record.nextBillingDate);
  const nextBillingDateValue = record.nextBillingDate ? toDate(record.nextBillingDate) : null;

  return outcomes
    .filter((outcome) => outcome.status === "matched")
    .map((outcome) => {
      switch (outcome.code) {
        case "promo_ending_soon":
          return {
            code: outcome.code,
            severity: "high",
            title: "Promo ending soon",
            message: nextBillingDateValue
              ? `Renewal on ${formatDateForCopy(nextBillingDateValue)} may roll off promo pricing onto the standard ${formatCurrencyForCopy(record.amountCents, currency)} rate.`
              : "Renewal may roll to a higher standard rate soon.",
            effectiveDate: nextBillingDate,
            currentAmountCents: record.amountCents,
            projectedAmountCents: record.projectedNextChargeAmountCents ?? null,
            currency,
          };
        case "price_increase_imminent":
          return {
            code: outcome.code,
            severity: "high",
            title: "Price increase imminent",
            message:
              record.projectedNextChargeAmountCents === null || record.projectedNextChargeAmountCents === undefined
                ? "Projected renewal pricing is unavailable."
                : nextBillingDateValue
                  ? `Renewal on ${formatDateForCopy(nextBillingDateValue)} is projected at ${formatCurrencyForCopy(record.projectedNextChargeAmountCents, currency)}, up ${formatPositiveDeltaForCopy(record.amountCents, record.projectedNextChargeAmountCents, currency)} from the current ${formatCurrencyForCopy(record.amountCents, currency)} price.`
                  : `Next renewal is projected at ${formatCurrencyForCopy(record.projectedNextChargeAmountCents, currency)}, up ${formatPositiveDeltaForCopy(record.amountCents, record.projectedNextChargeAmountCents, currency)} from the current ${formatCurrencyForCopy(record.amountCents, currency)} price.`,
            effectiveDate: nextBillingDate,
            currentAmountCents: record.amountCents,
            projectedAmountCents: record.projectedNextChargeAmountCents ?? null,
            currency,
          };
        case "higher_price_renewal":
          return {
            code: outcome.code,
            severity: "medium",
            title: "Renewal higher than last charge",
            message:
              record.projectedNextChargeAmountCents === null ||
              record.projectedNextChargeAmountCents === undefined ||
              record.lastChargedAmountCents === null ||
              record.lastChargedAmountCents === undefined
                ? "Renewal comparison data is unavailable."
                : nextBillingDateValue
                  ? `Renewal on ${formatDateForCopy(nextBillingDateValue)} is projected at ${formatCurrencyForCopy(record.projectedNextChargeAmountCents, currency)}, up ${formatPositiveDeltaForCopy(record.lastChargedAmountCents, record.projectedNextChargeAmountCents, currency)} from the last ${formatCurrencyForCopy(record.lastChargedAmountCents, currency)} charge.`
                  : `The next renewal is projected at ${formatCurrencyForCopy(record.projectedNextChargeAmountCents, currency)}, up ${formatPositiveDeltaForCopy(record.lastChargedAmountCents, record.projectedNextChargeAmountCents, currency)} from the last ${formatCurrencyForCopy(record.lastChargedAmountCents, currency)} charge.`,
            effectiveDate: nextBillingDate,
            currentAmountCents: record.lastChargedAmountCents ?? null,
            projectedAmountCents: record.projectedNextChargeAmountCents ?? null,
            currency,
          };
      }
    });
}

function buildActionBar(
  record: SubscriptionDetailsSourceRecord,
  links: SubscriptionDetailsContract["links"],
): SubscriptionDetailsV2Contract["actionBar"] {
  const header: SubscriptionDetailsActionCapability[] = [
    {
      key: "edit_subscription",
      label: "Edit",
      placement: "header",
      kind: "client",
      availability: "enabled",
      unavailableReason: null,
      href: null,
      permission: "owner_write",
      requiresConfirmation: false,
      confirmationLabel: null,
      serverValidation: [
        "Validate authenticated ownership before updating the subscription.",
        "Validate amount, currency, billing interval, and date fields.",
        "Validate management URLs as http/https when provided.",
      ],
    },
    {
      key: "mark_cancelled",
      label: "Mark Cancelled",
      placement: "header",
      kind: "mutate",
      availability: record.isActive ? "enabled" : "disabled",
      unavailableReason: record.isActive ? null : "Subscription is already inactive.",
      href: null,
      permission: "owner_write",
      requiresConfirmation: true,
      confirmationLabel: "Confirm cancellation state change",
      serverValidation: [
        "Validate authenticated ownership before updating lifecycle state.",
        "Reject duplicate cancel requests for already inactive subscriptions.",
        "Persist cancellation effective date when one is supplied.",
      ],
    },
  ];

  const quickActions: SubscriptionDetailsActionCapability[] = [
    {
      key: "open_management_page",
      label: "Open management page",
      placement: "quick_actions",
      kind: "navigate",
      availability: links.billingConsoleUrl ? "enabled" : "disabled",
      unavailableReason: links.billingConsoleUrl ? null : "No management URL is stored for this subscription.",
      href: links.billingConsoleUrl,
      permission: "owner_read",
      requiresConfirmation: false,
      confirmationLabel: null,
      serverValidation: ["Validate stored management URLs as http/https before rendering navigation affordances."],
    },
    {
      key: "change_alert",
      label: "Change alert",
      placement: "quick_actions",
      kind: "navigate",
      availability: "enabled",
      unavailableReason: null,
      href: "/settings#reminders",
      permission: "owner_write",
      requiresConfirmation: false,
      confirmationLabel: null,
      serverValidation: [
        "Require authenticated access to account settings before rendering reminder-management navigation.",
        "Validate reminder lead time as an integer between 0 and 30 on the settings write path.",
      ],
    },
    {
      key: "mark_for_review",
      label: "Mark for review",
      placement: "quick_actions",
      kind: "mutate",
      availability:
        record.markedForReview === undefined || record.markedForReview === null
          ? "disabled"
          : !record.isActive
            ? "disabled"
            : record.markedForReview
              ? "disabled"
              : "enabled",
      unavailableReason:
        record.markedForReview === undefined || record.markedForReview === null
          ? "Review-state persistence is unavailable for this subscription."
          : !record.isActive
            ? "Inactive subscriptions do not need review triage."
            : record.markedForReview
              ? "Subscription is already marked for review."
              : null,
      href: null,
      permission: "owner_write",
      requiresConfirmation: false,
      confirmationLabel: null,
      serverValidation: [
        "Validate authenticated ownership before writing review state.",
        "Reject duplicate review-state writes when a subscription is already marked.",
      ],
    },
    {
      key: "cancel_soon",
      label: "Cancel soon",
      placement: "quick_actions",
      kind: "navigate",
      availability: record.isActive && links.cancelSubscriptionUrl ? "enabled" : "disabled",
      unavailableReason:
        record.isActive && links.cancelSubscriptionUrl
          ? null
          : record.isActive
            ? "No cancellation URL is stored for this subscription."
            : "Inactive subscriptions cannot start a new cancel flow.",
      href: record.isActive ? links.cancelSubscriptionUrl : null,
      permission: "owner_write",
      requiresConfirmation: true,
      confirmationLabel: "Open the provider cancellation flow in a new tab?",
      serverValidation: [
        "Validate stored cancellation URLs as http/https before rendering navigation affordances.",
        "Require an active subscription before surfacing cancel-start flows.",
      ],
    },
  ];

  const footer: SubscriptionDetailsActionCapability[] = [
    {
      key: "view_billing_history",
      label: "View billing history",
      placement: "footer",
      kind: "navigate",
      availability: links.billingHistoryUrl ? "enabled" : "disabled",
      unavailableReason: links.billingHistoryUrl ? null : "No billing-history URL is stored for this subscription.",
      href: links.billingHistoryUrl,
      permission: "owner_read",
      requiresConfirmation: false,
      confirmationLabel: null,
      serverValidation: ["Validate stored billing-history URLs as http/https before rendering navigation affordances."],
    },
  ];

  return {
    state: "ready",
    header,
    quickActions,
    footer,
  };
}

export function buildSubscriptionDetails(
  record: SubscriptionDetailsSourceRecord,
  options: BuildSubscriptionDetailsOptions = {},
): SubscriptionDetailsContract {
  const now = options.now ?? new Date();
  const normalizedMonthlyAmountCents = estimateNormalizedMonthlyAmountCents(record.amountCents, record.billingInterval);
  const normalizedYearlyAmountCents = estimateNormalizedYearlyAmountCents(record.amountCents, record.billingInterval);
  const nextBillingDateIso = toOptionalIsoString(record.nextBillingDate);
  const trialEndDateIso = toOptionalIsoString(record.trialEndDate);
  const inferredCategory = inferSubscriptionCategory(record.name);
  const paymentMethodMasked = maskPaymentMethod(record.paymentMethod);
  const stage = deriveLifecycleStage(record, now);
  const currency = normalizeCurrency(record.currency);
  const reminderDaysBefore = normalizeReminderDaysBefore(record.reminderDaysBefore);
  const remindersEnabled = record.remindersEnabled ?? true;
  const reminderStatusLabel = remindersEnabled
    ? reminderDaysBefore === 0
      ? "On billing day"
      : `${reminderDaysBefore} day${reminderDaysBefore === 1 ? "" : "s"} before renewal`
    : "Disabled";
  const metadataTags = buildMetadataTags(record, stage);
  const timeline = buildTimeline(record);
  const links = {
    billingConsoleUrl: record.billingConsoleUrl,
    cancelSubscriptionUrl: record.cancelSubscriptionUrl,
    billingHistoryUrl: record.billingHistoryUrl,
  };
  const internalIdentifiers = {
    subscriptionId: record.id,
    providerReference: record.providerReference ?? null,
  };
  const alertRuleOutcomes = buildAlertRuleOutcomes(record, now, currency);
  const alertItems = buildAlertItems(alertRuleOutcomes, record, currency);
  const lifecycleChips: SubscriptionDetailsChip[] = [
    {
      key: "lifecycle",
      label: lifecycleLabel(stage),
      tone: lifecycleTone(stage),
    },
  ];

  if (hasPromoHint(record.name)) {
    lifecycleChips.push({
      key: "promo-watch",
      label: "Promo watch",
      tone: "warning",
    });
  }

  lifecycleChips.push({
    key: "category",
    label: inferredCategory,
    tone: "neutral",
  });

  const attentionState =
    alertItems.length === 0
      ? alertRuleOutcomes.some((outcome) => outcome.status === "insufficient_data")
        ? "partial"
        : "empty"
      : alertRuleOutcomes.some((outcome) => outcome.status === "insufficient_data")
        ? "partial"
        : "ready";
  const managementState: SubscriptionDetailsSectionState =
    links.billingConsoleUrl || links.cancelSubscriptionUrl || links.billingHistoryUrl || internalIdentifiers.providerReference
      ? "ready"
      : "partial";
  const lifecycleState: SubscriptionDetailsSectionState =
    record.markedForReview === undefined || record.markedForReview === null ? "partial" : "ready";

  const v2: SubscriptionDetailsV2Contract = {
    generatedAt: now.toISOString(),
    sectionStates: {
      header: "ready",
      summaryStrip: nextBillingDateIso ? "ready" : "partial",
      attentionNeeded: attentionState,
      actionBar: "ready",
      billingDetails: nextBillingDateIso ? "ready" : "partial",
      notesCategory: record.notesMarkdown?.trim() ? "ready" : "partial",
      paymentHistory: timeline.length > 0 ? "ready" : "empty",
      management: managementState,
      lifecycle: lifecycleState,
    },
    header: {
      state: "ready",
      title: record.name,
      subtitle: `${formatCurrencyForCopy(record.amountCents, currency)} every ${formatBillingIntervalLabel(record.billingInterval).toLowerCase()}`,
      categoryLabel: inferredCategory,
      status: {
        stage,
        label: lifecycleLabel(stage),
      },
      chips: lifecycleChips,
    },
    summaryStrip: {
      state: nextBillingDateIso ? "ready" : "partial",
      currentPrice: {
        amountCents: record.amountCents,
        currency,
        intervalLabel: formatBillingIntervalLabel(record.billingInterval),
        monthlyEquivalentAmountCents: normalizedMonthlyAmountCents,
      },
      renewal: {
        date: nextBillingDateIso,
        annualizedSpendCents: normalizedYearlyAmountCents,
        projectedAmountCents: record.projectedNextChargeAmountCents ?? null,
        currency,
      },
      paymentMethod: {
        masked: paymentMethodMasked,
        signedUpBy: record.signedUpBy?.trim() ? record.signedUpBy.trim() : null,
      },
      reminders: {
        enabled: remindersEnabled,
        daysBefore: reminderDaysBefore,
        statusLabel: reminderStatusLabel,
      },
    },
    attentionNeeded: {
      state: attentionState,
      items: alertItems,
      ruleOutcomes: alertRuleOutcomes,
    },
    actionBar: buildActionBar(record, links),
    billingDetails: {
      state: nextBillingDateIso ? "ready" : "partial",
      amountCents: record.amountCents,
      currency,
      billingInterval: record.billingInterval,
      billingIntervalLabel: formatBillingIntervalLabel(record.billingInterval),
      nextBillingDate: nextBillingDateIso,
      paymentMethodMasked,
      spendSummary: {
        label: "Projected annual spend",
        amountCents: normalizedYearlyAmountCents,
        currency,
      },
      trialEndDate: trialEndDateIso,
    },
    notesCategory: {
      state: record.notesMarkdown?.trim() ? "ready" : "partial",
      inferredCategory,
      signedUpBy: record.signedUpBy?.trim() ? record.signedUpBy.trim() : null,
      notesMarkdown: record.notesMarkdown,
      metadataTags,
    },
    paymentHistory: {
      state: timeline.length > 0 ? "ready" : "empty",
      items: timeline,
      upcomingRenewal: {
        renewalDate: nextBillingDateIso,
        projectedAmountCents: record.projectedNextChargeAmountCents ?? record.amountCents,
        currency,
      },
      maxVisibleItems: TIMELINE_LIMIT,
      hasMore: false,
    },
    management: {
      state: managementState,
      providerDisplayName: record.name,
      billingConsoleUrl: links.billingConsoleUrl,
      cancelSubscriptionUrl: links.cancelSubscriptionUrl,
      billingHistoryUrl: links.billingHistoryUrl,
      internalIdentifiers,
    },
    lifecycle: {
      state: lifecycleState,
      stage,
      label: lifecycleLabel(stage),
      autoRenew: record.isActive,
      startDate: toIsoString(record.createdAt),
      renewalDate: nextBillingDateIso,
      cancellationEffectiveDate: record.isActive ? null : nextBillingDateIso,
      cancellationReason: record.cancellationReason ?? null,
      reviewState: {
        isMarked: record.markedForReview ?? false,
        canPersist: record.markedForReview !== undefined && record.markedForReview !== null,
        unavailableReason:
          record.markedForReview === undefined || record.markedForReview === null
            ? "Review-state persistence is not implemented yet."
            : null,
      },
      chips: lifecycleChips,
    },
  };

  return {
    schemaVersion: "2026-03-v2",
    id: record.id,
    name: record.name,
    status: record.isActive ? "ACTIVE" : "CANCELED",
    amountCents: record.amountCents,
    currency,
    billingInterval: record.billingInterval,
    billingIntervalLabel: formatBillingIntervalLabel(record.billingInterval),
    normalizedMonthlyAmountCents,
    normalizedYearlyAmountCents,
    nextBillingDate: nextBillingDateIso,
    startDate: toIsoString(record.createdAt),
    renewalDate: nextBillingDateIso,
    lastChargeDate: null,
    lastChargeAmountCents: record.lastChargedAmountCents ?? null,
    paymentMethodMasked,
    trialEndDate: trialEndDateIso,
    planName: record.planName ?? null,
    autoRenew: record.isActive,
    cancellationEffectiveDate: record.isActive ? null : nextBillingDateIso,
    cancellationReason: record.cancellationReason ?? null,
    signedUpBy: record.signedUpBy?.trim() ? record.signedUpBy.trim() : null,
    inferredCategory,
    spendSummary: {
      label: "Projected annual spend",
      amountCents: normalizedYearlyAmountCents,
      currency,
    },
    metadataTags,
    notesMarkdown: record.notesMarkdown,
    links,
    internalIdentifiers,
    timeline,
    lastUpdatedAt: toIsoString(record.updatedAt),
    v2,
  };
}
