import { BillingInterval } from "@prisma/client";

import { normalizeCurrencyCode, resolvePreferredCurrency } from "@/lib/currencies";
import { db } from "@/lib/db";
import { inferSubscriptionCategory } from "@/lib/subscription-classification";

export const DASHBOARD_RENEWALS_WINDOW_DAYS = 7;
export const DASHBOARD_UPCOMING_RENEWALS_WINDOW_DAYS = 30;

const DAYS_TO_MILLISECONDS = 24 * 60 * 60 * 1000;
const WEEKLY_TO_MONTHLY_FACTOR = 4.33;
const TOP_COST_DRIVERS_LIMIT = 5;
const ATTENTION_PROMO_WINDOW_DAYS = 7;
const ATTENTION_PROMO_MAX_ACCOUNT_AGE_DAYS = 45;
const ATTENTION_UNUSED_MIN_ACCOUNT_AGE_DAYS = 120;
const ATTENTION_UNUSED_STALE_UPDATED_DAYS = 90;
const UPCOMING_RENEW_URGENCY_WINDOW_DAYS = 3;
const UPCOMING_RENEW_TAG_WINDOW_DAYS = 10;
export const DASHBOARD_UNSPECIFIED_SIGNED_UP_BY_LABEL = "Not specified";

const PROMO_HINT_KEYWORDS = ["trial", "promo", "intro", "discount", "offer", "starter"] as const;
const WORK_TAG_HINT_KEYWORDS = [
  "github",
  "figma",
  "slack",
  "notion",
  "workspace",
  "office",
  "jira",
  "confluence",
  "cloud",
  "aws",
  "azure",
  "gcp",
  "vercel",
  "netlify",
] as const;
const GAMING_TAG_HINT_KEYWORDS = ["xbox", "playstation", "steam", "nintendo", "epic", "game pass", "ea play"] as const;

const ATTENTION_SEVERITY_RANK: Record<DashboardAttentionSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export type DashboardSubscriptionSourceRecord = {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  billingInterval: BillingInterval;
  nextBillingDate: Date | string | null;
  isActive: boolean;
  paymentMethod: string;
  signedUpBy: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type DashboardCurrencyTotal = {
  currency: string;
  monthlyEquivalentSpendCents: number;
  annualProjectionCents: number;
};

export type DashboardCurrencyConversion = {
  targetCurrency: string;
  generatedAt: string | null;
  source: "not_required" | "frankfurter" | "provided_rates";
  missingRates: string[];
};

export type DashboardMetricAmount = {
  amountCents: number | null;
  currency: string | null;
  totalsByCurrency: DashboardCurrencyTotal[];
  excludedCustomCadenceCount: number;
};

export type DashboardKpis = {
  monthlyEquivalentSpend: DashboardMetricAmount;
  annualProjection: DashboardMetricAmount;
  renewalsInNext7Days: number;
  subscriptions: {
    active: number;
    canceled: number;
    total: number;
  };
};

export type DashboardSpendBreakdownGroup = {
  label: string;
  amountCents: number | null;
  annualProjectionCents: number | null;
  currency: string | null;
  totalsByCurrency: DashboardCurrencyTotal[];
  subscriptionCount: number;
};

export type DashboardAttentionSeverity = "high" | "medium" | "low";

export type DashboardAttentionType =
  | "promo_ending_soon"
  | "potentially_unused_subscription"
  | "potential_duplicate_services"
  | "annual_renewal_approaching";

export type DashboardAttentionItem = {
  id: string;
  type: DashboardAttentionType;
  severity: DashboardAttentionSeverity;
  title: string;
  message: string;
  dueDate: string | null;
  subscriptionIds: string[];
  estimatedMonthlyImpactCents: number | null;
  currency: string | null;
};

export type DashboardUpcomingRenewalTag = "urgent" | "renew" | "work" | "gaming";

export type DashboardUpcomingRenewal = {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  billingInterval: BillingInterval;
  paymentMethod: string;
  renewalDate: string;
  daysUntilRenewal: number;
  monthlyEquivalentAmountCents: number | null;
  tag: DashboardUpcomingRenewalTag;
  isActive: boolean;
  createdAt: string;
};

export type DashboardTopCostDriver = {
  id: string;
  name: string;
  currency: string;
  billingInterval: BillingInterval;
  monthlyEquivalentAmountCents: number;
  annualProjectionCents: number;
  nextBillingDate: string | null;
};

export type DashboardSavingsOpportunity = {
  id: string;
  type: "duplicate_overlap" | "potentially_unused_subscription";
  title: string;
  description: string;
  currency: string;
  estimatedMonthlySavingsCents: number;
  subscriptionIds: string[];
};

export type DashboardPotentialSavings = {
  estimatedMonthlySavingsCents: number | null;
  currency: string | null;
  totalsByCurrency: Array<{ currency: string; estimatedMonthlySavingsCents: number }>;
  opportunities: DashboardSavingsOpportunity[];
  assumptions: string[];
};

export type DashboardNextCharge = {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  nextBillingDate: string;
} | null;

export type DashboardPayload = {
  generatedAt: string;
  dateWindows: {
    renewalsNextDays: typeof DASHBOARD_RENEWALS_WINDOW_DAYS;
    upcomingRenewalsDays: typeof DASHBOARD_UPCOMING_RENEWALS_WINDOW_DAYS;
  };
  normalizationPolicy: "preferred_currency_with_fx_conversion";
  currencyConversion: DashboardCurrencyConversion;
  kpis: DashboardKpis;
  spendBreakdown: DashboardSpendBreakdownGroup[];
  attentionNeeded: DashboardAttentionItem[];
  upcomingRenewals: DashboardUpcomingRenewal[];
  topCostDrivers: DashboardTopCostDriver[];
  potentialSavings: DashboardPotentialSavings;
  nextCharge: DashboardNextCharge;
};

type NormalizedSubscription = DashboardSubscriptionSourceRecord & {
  currency: string;
  createdAtDate: Date;
  updatedAtDate: Date;
  nextBillingDateDate: Date | null;
  monthlyEquivalentAmountCents: number | null;
  annualProjectionCents: number | null;
  preferredMonthlyEquivalentAmountCents: number | null;
  preferredAnnualProjectionCents: number | null;
  canonicalServiceKey: string;
  inferredCategory: string;
};

type DuplicateGroup = {
  key: string;
  currency: string;
  displayName: string;
  subscriptions: NormalizedSubscription[];
};

export type DashboardExchangeRateMap = Record<string, number>;

export type DashboardPayloadOptions = {
  preferredCurrency?: string | null;
  exchangeRates?: DashboardExchangeRateMap;
  exchangeRateSource?: DashboardCurrencyConversion["source"];
  exchangeRateGeneratedAt?: string | null;
};

type FrankfurterLatestResponse = {
  date?: string;
  rates?: Record<string, number>;
};

function toDate(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date value while building dashboard payload.");
  }

  return parsed;
}

function toOptionalDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  return toDate(value);
}

function normalizeCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  return normalized || "USD";
}

export function normalizeToMonthlyAmountCents(amountCents: number, billingInterval: BillingInterval): number | null {
  switch (billingInterval) {
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

export function normalizeToAnnualAmountCents(amountCents: number, billingInterval: BillingInterval): number | null {
  switch (billingInterval) {
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

function normalizeExchangeRates(exchangeRates: DashboardExchangeRateMap | undefined): Map<string, number> {
  const normalizedRates = new Map<string, number>();

  for (const [currency, rate] of Object.entries(exchangeRates ?? {})) {
    const normalizedCurrency = normalizeCurrencyCode(currency);

    if (!normalizedCurrency || !Number.isFinite(rate) || rate <= 0) {
      continue;
    }

    normalizedRates.set(normalizedCurrency, rate);
  }

  return normalizedRates;
}

function convertCurrencyAmountCents(
  amountCents: number | null,
  sourceCurrency: string,
  targetCurrency: string,
  exchangeRates: Map<string, number>,
  missingRates: Set<string>,
): number | null {
  if (amountCents === null) {
    return null;
  }

  if (sourceCurrency === targetCurrency) {
    return amountCents;
  }

  const rate = exchangeRates.get(sourceCurrency);

  if (rate === undefined) {
    missingRates.add(sourceCurrency);
    return null;
  }

  return Math.round(amountCents * rate);
}

async function fetchExchangeRatesToCurrency(
  sourceCurrencies: string[],
  targetCurrency: string,
): Promise<{ rates: DashboardExchangeRateMap; generatedAt: string | null }> {
  const currenciesNeedingRates = [...new Set(sourceCurrencies)]
    .map((currency) => normalizeCurrencyCode(currency))
    .filter((currency): currency is string => currency !== null && currency !== targetCurrency);

  if (currenciesNeedingRates.length === 0) {
    return {
      rates: {},
      generatedAt: null,
    };
  }

  const results = await Promise.all(
    currenciesNeedingRates.map(async (sourceCurrency) => {
      const url = new URL("https://api.frankfurter.app/latest");
      url.searchParams.set("from", sourceCurrency);
      url.searchParams.set("to", targetCurrency);

      try {
        const response = await fetch(url, {
          next: {
            revalidate: 60 * 60 * 6,
          },
        });

        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as FrankfurterLatestResponse;
        const rate = payload.rates?.[targetCurrency];

        if (!Number.isFinite(rate) || !rate || rate <= 0) {
          return null;
        }

        return {
          sourceCurrency,
          rate,
          date: payload.date ?? null,
        };
      } catch {
        return null;
      }
    }),
  );

  const rates: DashboardExchangeRateMap = {};
  const generatedDates = new Set<string>();

  for (const result of results) {
    if (!result) {
      continue;
    }

    rates[result.sourceCurrency] = result.rate;

    if (result.date) {
      generatedDates.add(result.date);
    }
  }

  return {
    rates,
    generatedAt: generatedDates.size === 1 ? [...generatedDates][0] : null,
  };
}

function isWithinNextDays(value: Date, now: Date, days: number): boolean {
  const delta = value.getTime() - now.getTime();
  return delta >= 0 && delta <= days * DAYS_TO_MILLISECONDS;
}

function daysUntil(value: Date, now: Date): number {
  return Math.max(0, Math.ceil((value.getTime() - now.getTime()) / DAYS_TO_MILLISECONDS));
}

function daysSince(value: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - value.getTime()) / DAYS_TO_MILLISECONDS));
}

function formatCurrencyCents(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatAttentionDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function hasPromoHint(name: string): boolean {
  const lowered = name.trim().toLowerCase();
  return PROMO_HINT_KEYWORDS.some((keyword) => lowered.includes(keyword));
}

function includesAnyKeyword(value: string, keywords: readonly string[]): boolean {
  const lowered = value.trim().toLowerCase();
  return keywords.some((keyword) => lowered.includes(keyword));
}

function canonicalizeServiceName(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

  return normalized || "unknown";
}

function makeCurrencyTotals(records: Iterable<NormalizedSubscription>, preferredCurrency: string): DashboardCurrencyTotal[] {
  const totals = new Map<string, DashboardCurrencyTotal>();

  for (const record of records) {
    if (record.preferredMonthlyEquivalentAmountCents === null || record.preferredAnnualProjectionCents === null) {
      continue;
    }

    const existing = totals.get(preferredCurrency);

    if (existing) {
      existing.monthlyEquivalentSpendCents += record.preferredMonthlyEquivalentAmountCents;
      existing.annualProjectionCents += record.preferredAnnualProjectionCents;
      continue;
    }

    totals.set(preferredCurrency, {
      currency: preferredCurrency,
      monthlyEquivalentSpendCents: record.preferredMonthlyEquivalentAmountCents,
      annualProjectionCents: record.preferredAnnualProjectionCents,
    });
  }

  return [...totals.values()].sort((first, second) => {
    return (
      second.monthlyEquivalentSpendCents - first.monthlyEquivalentSpendCents || first.currency.localeCompare(second.currency)
    );
  });
}

function metricAmountFromCurrencyTotals(
  totalsByCurrency: DashboardCurrencyTotal[],
  excludedCustomCadenceCount: number,
  type: "monthly" | "annual",
): DashboardMetricAmount {
  if (totalsByCurrency.length !== 1) {
    return {
      amountCents: null,
      currency: null,
      totalsByCurrency,
      excludedCustomCadenceCount,
    };
  }

  const [total] = totalsByCurrency;

  return {
    amountCents: type === "monthly" ? total.monthlyEquivalentSpendCents : total.annualProjectionCents,
    currency: total.currency,
    totalsByCurrency,
    excludedCustomCadenceCount,
  };
}

function chooseUpcomingRenewalTag(subscription: NormalizedSubscription, daysUntilRenewal: number): DashboardUpcomingRenewalTag {
  if (daysUntilRenewal <= UPCOMING_RENEW_URGENCY_WINDOW_DAYS) {
    return "urgent";
  }

  if (daysUntilRenewal <= UPCOMING_RENEW_TAG_WINDOW_DAYS) {
    return "renew";
  }

  const searchableText = [subscription.name, subscription.paymentMethod, subscription.signedUpBy ?? ""].join(" ");
  const isWorkTagged =
    subscription.inferredCategory === "Productivity" ||
    subscription.inferredCategory === "Cloud & Hosting" ||
    includesAnyKeyword(searchableText, WORK_TAG_HINT_KEYWORDS);

  if (isWorkTagged) {
    return "work";
  }

  const isGamingTagged = subscription.inferredCategory === "Gaming" || includesAnyKeyword(searchableText, GAMING_TAG_HINT_KEYWORDS);

  if (isGamingTagged) {
    return "gaming";
  }

  return "renew";
}

function isPotentiallyUnusedCandidate(subscription: NormalizedSubscription, now: Date): boolean {
  return (
    subscription.nextBillingDateDate !== null &&
    isWithinNextDays(subscription.nextBillingDateDate, now, DASHBOARD_UPCOMING_RENEWALS_WINDOW_DAYS) &&
    daysSince(subscription.createdAtDate, now) >= ATTENTION_UNUSED_MIN_ACCOUNT_AGE_DAYS &&
    daysSince(subscription.updatedAtDate, now) >= ATTENTION_UNUSED_STALE_UPDATED_DAYS
  );
}

function compareAttentionItems(first: DashboardAttentionItem, second: DashboardAttentionItem): number {
  const severityDelta = ATTENTION_SEVERITY_RANK[second.severity] - ATTENTION_SEVERITY_RANK[first.severity];

  if (severityDelta !== 0) {
    return severityDelta;
  }

  const firstDue = first.dueDate ? new Date(first.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const secondDue = second.dueDate ? new Date(second.dueDate).getTime() : Number.POSITIVE_INFINITY;

  if (firstDue !== secondDue) {
    return firstDue - secondDue;
  }

  return first.title.localeCompare(second.title) || first.id.localeCompare(second.id);
}

function findDuplicateGroups(records: NormalizedSubscription[]): DuplicateGroup[] {
  const grouped = new Map<string, DuplicateGroup>();

  for (const record of records) {
    if (!record.isActive || record.monthlyEquivalentAmountCents === null) {
      continue;
    }

    const key = `${record.canonicalServiceKey}:${record.currency}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.subscriptions.push(record);
      continue;
    }

    grouped.set(key, {
      key,
      currency: record.currency,
      displayName: record.name,
      subscriptions: [record],
    });
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      subscriptions: [...group.subscriptions].sort((first, second) => {
        const firstMonthly = first.monthlyEquivalentAmountCents ?? Number.MAX_SAFE_INTEGER;
        const secondMonthly = second.monthlyEquivalentAmountCents ?? Number.MAX_SAFE_INTEGER;

        return firstMonthly - secondMonthly || first.name.localeCompare(second.name) || first.id.localeCompare(second.id);
      }),
    }))
    .filter((group) => group.subscriptions.length > 1)
    .sort((first, second) => {
      return first.displayName.localeCompare(second.displayName) || first.currency.localeCompare(second.currency);
    });
}

export function buildDashboardPayload(
  subscriptions: DashboardSubscriptionSourceRecord[],
  now: Date = new Date(),
  options: DashboardPayloadOptions = {},
): DashboardPayload {
  const preferredCurrency = resolvePreferredCurrency(options.preferredCurrency);
  const exchangeRates = normalizeExchangeRates(options.exchangeRates);
  const missingRates = new Set<string>();
  const normalizedSubscriptions: NormalizedSubscription[] = subscriptions.map((subscription) => {
    const createdAtDate = toDate(subscription.createdAt);
    const updatedAtDate = toDate(subscription.updatedAt);
    const nextBillingDateDate = toOptionalDate(subscription.nextBillingDate);
    const currency = normalizeCurrency(subscription.currency);
    const monthlyEquivalentAmountCents = normalizeToMonthlyAmountCents(subscription.amountCents, subscription.billingInterval);
    const annualProjectionCents = normalizeToAnnualAmountCents(subscription.amountCents, subscription.billingInterval);

    return {
      ...subscription,
      currency,
      createdAtDate,
      updatedAtDate,
      nextBillingDateDate,
      monthlyEquivalentAmountCents,
      annualProjectionCents,
      preferredMonthlyEquivalentAmountCents: convertCurrencyAmountCents(
        monthlyEquivalentAmountCents,
        currency,
        preferredCurrency,
        exchangeRates,
        missingRates,
      ),
      preferredAnnualProjectionCents: convertCurrencyAmountCents(
        annualProjectionCents,
        currency,
        preferredCurrency,
        exchangeRates,
        missingRates,
      ),
      canonicalServiceKey: canonicalizeServiceName(subscription.name),
      inferredCategory: inferSubscriptionCategory(subscription.name),
    };
  });

  const activeSubscriptions = normalizedSubscriptions.filter((subscription) => subscription.isActive);
  const canceledCount = normalizedSubscriptions.length - activeSubscriptions.length;
  const excludedCustomCadenceCount = activeSubscriptions.filter(
    (subscription) => subscription.monthlyEquivalentAmountCents === null || subscription.annualProjectionCents === null,
  ).length;

  const totalsByCurrency = makeCurrencyTotals(activeSubscriptions, preferredCurrency);

  const kpis: DashboardKpis = {
    monthlyEquivalentSpend: metricAmountFromCurrencyTotals(totalsByCurrency, excludedCustomCadenceCount, "monthly"),
    annualProjection: metricAmountFromCurrencyTotals(totalsByCurrency, excludedCustomCadenceCount, "annual"),
    renewalsInNext7Days: activeSubscriptions.filter(
      (subscription) =>
        subscription.nextBillingDateDate !== null &&
        isWithinNextDays(subscription.nextBillingDateDate, now, DASHBOARD_RENEWALS_WINDOW_DAYS),
    ).length,
    subscriptions: {
      active: activeSubscriptions.length,
      canceled: canceledCount,
      total: normalizedSubscriptions.length,
    },
  };

  const spendBreakdownGroups = new Map<
    string,
    {
      label: string;
      subscriptionCount: number;
      records: NormalizedSubscription[];
    }
  >();

  for (const subscription of activeSubscriptions) {
    if (subscription.monthlyEquivalentAmountCents === null || subscription.annualProjectionCents === null) {
      continue;
    }

    const ownerLabel = subscription.signedUpBy?.trim() || DASHBOARD_UNSPECIFIED_SIGNED_UP_BY_LABEL;
    const ownerKey = ownerLabel.toLowerCase();
    const existing = spendBreakdownGroups.get(ownerKey);

    if (existing) {
      existing.subscriptionCount += 1;
      existing.records.push(subscription);
      continue;
    }

    spendBreakdownGroups.set(ownerKey, {
      label: ownerLabel,
      subscriptionCount: 1,
      records: [subscription],
    });
  }

  const spendBreakdown: DashboardSpendBreakdownGroup[] = [...spendBreakdownGroups.values()]
    .map((group) => {
      const groupTotals = makeCurrencyTotals(group.records, preferredCurrency);

      return {
        label: group.label,
        amountCents: groupTotals.length === 1 ? groupTotals[0].monthlyEquivalentSpendCents : null,
        annualProjectionCents: groupTotals.length === 1 ? groupTotals[0].annualProjectionCents : null,
        currency: groupTotals.length === 1 ? groupTotals[0].currency : null,
        totalsByCurrency: groupTotals,
        subscriptionCount: group.subscriptionCount,
      };
    })
    .sort((first, second) => {
      const firstSortAmount = Math.max(0, ...first.totalsByCurrency.map((entry) => entry.monthlyEquivalentSpendCents));
      const secondSortAmount = Math.max(0, ...second.totalsByCurrency.map((entry) => entry.monthlyEquivalentSpendCents));

      return secondSortAmount - firstSortAmount || second.subscriptionCount - first.subscriptionCount || first.label.localeCompare(second.label);
    });

  const upcomingRenewals: DashboardUpcomingRenewal[] = activeSubscriptions
    .filter(
      (subscription) =>
        subscription.nextBillingDateDate !== null &&
        isWithinNextDays(subscription.nextBillingDateDate, now, DASHBOARD_UPCOMING_RENEWALS_WINDOW_DAYS),
    )
    .map((subscription) => {
      const renewalDate = subscription.nextBillingDateDate as Date;
      const daysUntilRenewal = daysUntil(renewalDate, now);

      return {
        id: subscription.id,
        name: subscription.name,
        amountCents: subscription.amountCents,
        currency: subscription.currency,
        billingInterval: subscription.billingInterval,
        paymentMethod: subscription.paymentMethod,
        renewalDate: renewalDate.toISOString(),
        daysUntilRenewal,
        monthlyEquivalentAmountCents: subscription.monthlyEquivalentAmountCents,
        tag: chooseUpcomingRenewalTag(subscription, daysUntilRenewal),
        isActive: subscription.isActive,
        createdAt: subscription.createdAtDate.toISOString(),
      };
    })
    .sort((first, second) => {
      return (
        new Date(first.renewalDate).getTime() - new Date(second.renewalDate).getTime() || first.name.localeCompare(second.name)
      );
    });

  const duplicateGroups = findDuplicateGroups(activeSubscriptions);

  const attentionNeeded: DashboardAttentionItem[] = [
    ...activeSubscriptions
      .filter(
        (subscription) =>
          subscription.billingInterval !== "YEARLY" &&
          subscription.nextBillingDateDate !== null &&
          isWithinNextDays(subscription.nextBillingDateDate, now, ATTENTION_PROMO_WINDOW_DAYS) &&
          (daysSince(subscription.createdAtDate, now) <= ATTENTION_PROMO_MAX_ACCOUNT_AGE_DAYS ||
            hasPromoHint(subscription.name)),
      )
      .map((subscription) => {
        const dueDate = subscription.nextBillingDateDate as Date;
        const daysUntilDue = daysUntil(dueDate, now);

        return {
          id: `promo-ending-${subscription.id}`,
          type: "promo_ending_soon" as const,
          severity: "high" as const,
          title: `Promo ending soon: ${subscription.name}`,
          message: `Potential charge of ${formatCurrencyCents(subscription.amountCents, subscription.currency)} on ${formatAttentionDate(dueDate)} (${daysUntilDue} day(s)).`,
          dueDate: dueDate.toISOString(),
          subscriptionIds: [subscription.id],
          estimatedMonthlyImpactCents: subscription.preferredMonthlyEquivalentAmountCents,
          currency: subscription.preferredMonthlyEquivalentAmountCents === null ? null : preferredCurrency,
        };
      }),
    ...activeSubscriptions
      .filter((subscription) => isPotentiallyUnusedCandidate(subscription, now))
      .map((subscription) => {
        const dueDate = subscription.nextBillingDateDate as Date;
        const staleDays = daysSince(subscription.updatedAtDate, now);

        return {
          id: `potentially-unused-${subscription.id}`,
          type: "potentially_unused_subscription" as const,
          severity: "low" as const,
          title: `Potentially unused: ${subscription.name}`,
          message: `No subscription updates in ${staleDays} day(s). Next charge ${formatCurrencyCents(subscription.amountCents, subscription.currency)} on ${formatAttentionDate(dueDate)}.`,
          dueDate: dueDate.toISOString(),
          subscriptionIds: [subscription.id],
          estimatedMonthlyImpactCents: subscription.preferredMonthlyEquivalentAmountCents,
          currency: subscription.preferredMonthlyEquivalentAmountCents === null ? null : preferredCurrency,
        };
      }),
    ...activeSubscriptions
      .filter(
        (subscription) =>
          subscription.billingInterval === "YEARLY" &&
          subscription.nextBillingDateDate !== null &&
          isWithinNextDays(subscription.nextBillingDateDate, now, DASHBOARD_UPCOMING_RENEWALS_WINDOW_DAYS) &&
          !isWithinNextDays(subscription.nextBillingDateDate, now, DASHBOARD_RENEWALS_WINDOW_DAYS),
      )
      .map((subscription) => {
        const dueDate = subscription.nextBillingDateDate as Date;
        const daysUntilDue = daysUntil(dueDate, now);

        return {
          id: `annual-renewal-${subscription.id}`,
          type: "annual_renewal_approaching" as const,
          severity: daysUntilDue <= 14 ? ("high" as const) : ("medium" as const),
          title: `Annual renewal approaching: ${subscription.name}`,
          message: `Annual charge of ${formatCurrencyCents(subscription.amountCents, subscription.currency)} is due on ${formatAttentionDate(dueDate)} (${daysUntilDue} day(s)).`,
          dueDate: dueDate.toISOString(),
          subscriptionIds: [subscription.id],
          estimatedMonthlyImpactCents: subscription.preferredMonthlyEquivalentAmountCents,
          currency: subscription.preferredMonthlyEquivalentAmountCents === null ? null : preferredCurrency,
        };
      }),
    ...duplicateGroups.map((group) => {
      const duplicates = group.subscriptions.slice(1);
      const estimatedMonthlyImpactCents = duplicates.reduce(
        (total, subscription) => total + (subscription.preferredMonthlyEquivalentAmountCents ?? 0),
        0,
      );
      const soonestRenewal = group.subscriptions
        .map((subscription) => subscription.nextBillingDateDate)
        .filter((value): value is Date => value !== null)
        .sort((first, second) => first.getTime() - second.getTime())[0];
      const soonestRenewalText = soonestRenewal
        ? ` Earliest renewal is ${formatAttentionDate(soonestRenewal)}.`
        : "";

      return {
        id: `potential-duplicate-${group.key}`,
        type: "potential_duplicate_services" as const,
        severity: "high" as const,
        title: `Potential duplicate services: ${group.displayName}`,
        message: `${group.subscriptions.length} active subscriptions may overlap. Estimated extra spend is ${formatCurrencyCents(estimatedMonthlyImpactCents, preferredCurrency)} per month.${soonestRenewalText}`,
        dueDate: soonestRenewal ? soonestRenewal.toISOString() : null,
        subscriptionIds: group.subscriptions.map((subscription) => subscription.id),
        estimatedMonthlyImpactCents,
        currency: preferredCurrency,
      };
    }),
  ].sort(compareAttentionItems);

  const topCostDrivers: DashboardTopCostDriver[] = activeSubscriptions
    .filter(
      (
        subscription,
      ): subscription is NormalizedSubscription & {
        preferredMonthlyEquivalentAmountCents: number;
        preferredAnnualProjectionCents: number;
      } =>
        subscription.preferredMonthlyEquivalentAmountCents !== null &&
        subscription.preferredAnnualProjectionCents !== null,
    )
    .sort((first, second) => {
      return (
        second.preferredMonthlyEquivalentAmountCents - first.preferredMonthlyEquivalentAmountCents ||
        first.currency.localeCompare(second.currency) ||
        first.name.localeCompare(second.name) ||
        first.id.localeCompare(second.id)
      );
    })
    .slice(0, TOP_COST_DRIVERS_LIMIT)
    .map((subscription) => ({
      id: subscription.id,
      name: subscription.name,
      currency: preferredCurrency,
      billingInterval: subscription.billingInterval,
      monthlyEquivalentAmountCents: subscription.preferredMonthlyEquivalentAmountCents,
      annualProjectionCents: subscription.preferredAnnualProjectionCents,
      nextBillingDate: subscription.nextBillingDateDate ? subscription.nextBillingDateDate.toISOString() : null,
    }));

  const duplicateOpportunities: DashboardSavingsOpportunity[] = duplicateGroups
    .map((group) => {
      const duplicateSubscriptions = group.subscriptions.slice(1);
      const estimatedMonthlySavingsCents = duplicateSubscriptions.reduce(
        (total, subscription) => total + (subscription.preferredMonthlyEquivalentAmountCents ?? 0),
        0,
      );

      return {
        id: `savings-duplicate-${group.key}`,
        type: "duplicate_overlap" as const,
        title: `Consolidate duplicate ${group.displayName} subscriptions`,
        description: `Cancelling ${duplicateSubscriptions.length} overlapping subscription(s) could reduce recurring spend.`,
        currency: preferredCurrency,
        estimatedMonthlySavingsCents,
        subscriptionIds: duplicateSubscriptions.map((subscription) => subscription.id),
      };
    })
    .filter((opportunity) => opportunity.estimatedMonthlySavingsCents > 0);

  const subscriptionsInDuplicateGroups = new Set(
    duplicateGroups.flatMap((group) => group.subscriptions.map((subscription) => subscription.id)),
  );

  const potentiallyUnusedOpportunities: DashboardSavingsOpportunity[] = activeSubscriptions
    .filter(
      (subscription): subscription is NormalizedSubscription & { preferredMonthlyEquivalentAmountCents: number } =>
        subscription.preferredMonthlyEquivalentAmountCents !== null &&
        isPotentiallyUnusedCandidate(subscription, now) &&
        !subscriptionsInDuplicateGroups.has(subscription.id),
    )
    .map((subscription) => ({
      id: `savings-unused-${subscription.id}`,
      type: "potentially_unused_subscription" as const,
      title: `Review usage for ${subscription.name}`,
      description: "No recent updates detected. Confirm this subscription is still needed before the next renewal.",
      currency: preferredCurrency,
      estimatedMonthlySavingsCents: subscription.preferredMonthlyEquivalentAmountCents,
      subscriptionIds: [subscription.id],
    }))
    .filter((opportunity) => opportunity.estimatedMonthlySavingsCents > 0);

  const opportunities: DashboardSavingsOpportunity[] = [...duplicateOpportunities, ...potentiallyUnusedOpportunities].sort(
    (first, second) => {
      return (
        second.estimatedMonthlySavingsCents - first.estimatedMonthlySavingsCents ||
        first.title.localeCompare(second.title) ||
        first.id.localeCompare(second.id)
      );
    },
  );

  const savingsTotalsMap = new Map<string, number>();

  for (const opportunity of opportunities) {
    savingsTotalsMap.set(
      opportunity.currency,
      (savingsTotalsMap.get(opportunity.currency) ?? 0) + opportunity.estimatedMonthlySavingsCents,
    );
  }

  const savingsTotalsByCurrency = [...savingsTotalsMap.entries()]
    .map(([currency, estimatedMonthlySavingsCents]) => ({
      currency,
      estimatedMonthlySavingsCents,
    }))
    .sort((first, second) => {
      return (
        second.estimatedMonthlySavingsCents - first.estimatedMonthlySavingsCents ||
        first.currency.localeCompare(second.currency)
      );
    });

  const potentialSavings: DashboardPotentialSavings = {
    estimatedMonthlySavingsCents:
      savingsTotalsByCurrency.length === 1 ? savingsTotalsByCurrency[0].estimatedMonthlySavingsCents : null,
    currency: savingsTotalsByCurrency.length === 1 ? savingsTotalsByCurrency[0].currency : null,
    totalsByCurrency: savingsTotalsByCurrency,
    opportunities,
    assumptions: [
      "Savings estimate includes duplicate-overlap candidates (same canonical service name + currency) and potentially-unused subscriptions.",
      "Potentially-unused candidates require an upcoming renewal within 30 days, account age of at least 120 days, and no updates for 90+ days.",
      "Subscriptions in duplicate groups are excluded from the potentially-unused rule to avoid double counting.",
      `Combined estimates are converted into ${preferredCurrency} when exchange rates are available.`,
      "Custom billing intervals are excluded from normalized monthly/annual estimates.",
    ],
  };

  const nextChargeSource = [...activeSubscriptions]
    .filter((subscription) => subscription.nextBillingDateDate !== null)
    .sort((first, second) => {
      return (
        (first.nextBillingDateDate as Date).getTime() - (second.nextBillingDateDate as Date).getTime() ||
        first.name.localeCompare(second.name)
      );
    })
    .find((subscription) => (subscription.nextBillingDateDate as Date).getTime() >= now.getTime());

  const fallbackNextChargeSource =
    nextChargeSource ??
    [...activeSubscriptions]
      .filter((subscription) => subscription.nextBillingDateDate !== null)
      .sort((first, second) => {
        return (
          (first.nextBillingDateDate as Date).getTime() - (second.nextBillingDateDate as Date).getTime() ||
          first.name.localeCompare(second.name)
        );
      })[0];

  const nextCharge: DashboardNextCharge = fallbackNextChargeSource
    ? {
        id: fallbackNextChargeSource.id,
        name: fallbackNextChargeSource.name,
        amountCents: fallbackNextChargeSource.amountCents,
        currency: fallbackNextChargeSource.currency,
        nextBillingDate: (fallbackNextChargeSource.nextBillingDateDate as Date).toISOString(),
      }
    : null;
  const hasCrossCurrencyData = activeSubscriptions.some((subscription) => subscription.currency !== preferredCurrency);

  return {
    generatedAt: now.toISOString(),
    dateWindows: {
      renewalsNextDays: DASHBOARD_RENEWALS_WINDOW_DAYS,
      upcomingRenewalsDays: DASHBOARD_UPCOMING_RENEWALS_WINDOW_DAYS,
    },
    normalizationPolicy: "preferred_currency_with_fx_conversion",
    currencyConversion: {
      targetCurrency: preferredCurrency,
      generatedAt: options.exchangeRateGeneratedAt ?? null,
      source: hasCrossCurrencyData ? (options.exchangeRateSource ?? "provided_rates") : "not_required",
      missingRates: [...missingRates].sort((first, second) => first.localeCompare(second)),
    },
    kpis,
    spendBreakdown,
    attentionNeeded,
    upcomingRenewals,
    topCostDrivers,
    potentialSavings,
    nextCharge,
  };
}

export async function getDashboardPayloadForUser(userId: string, now: Date = new Date()): Promise<DashboardPayload> {
  const [subscriptions, settings] = await Promise.all([
    db.subscription.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        amountCents: true,
        currency: true,
        billingInterval: true,
        nextBillingDate: true,
        isActive: true,
        paymentMethod: true,
        signedUpBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ isActive: "desc" }, { nextBillingDate: "asc" }, { createdAt: "desc" }],
    }),
    db.userSettings.findUnique({
      where: {
        userId,
      },
      select: {
        defaultCurrency: true,
      },
    }),
  ]);
  const preferredCurrency = resolvePreferredCurrency(settings?.defaultCurrency);
  const activeSourceCurrencies = subscriptions
    .filter((subscription) => subscription.isActive)
    .map((subscription) => normalizeCurrency(subscription.currency));
  const exchangeRates = await fetchExchangeRatesToCurrency(activeSourceCurrencies, preferredCurrency);

  return buildDashboardPayload(subscriptions, now, {
    preferredCurrency,
    exchangeRates: exchangeRates.rates,
    exchangeRateGeneratedAt: exchangeRates.generatedAt,
    exchangeRateSource: "frankfurter",
  });
}
