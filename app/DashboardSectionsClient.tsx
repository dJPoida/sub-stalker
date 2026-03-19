"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";

import SubscriptionDetailsModal from "@/app/components/SubscriptionDetailsModal";
import { useSubscriptionDetailsModal } from "@/app/components/useSubscriptionDetailsModal";
import type {
  DashboardAttentionSeverity,
  DashboardAttentionType,
  DashboardCurrencyTotal,
  DashboardKpis,
  DashboardMetricAmount,
  DashboardSavingsOpportunity,
  DashboardUpcomingRenewalTag,
} from "@/lib/dashboard";
import {
  buildDashboardCurrencyOptions,
  DASHBOARD_ALL_CURRENCIES,
  DASHBOARD_DATE_RANGE_OPTIONS,
  DEFAULT_DASHBOARD_DATE_RANGE,
  mapDashboardSpendBreakdownByCurrency,
  filterDashboardUpcomingRenewals,
  resolveInitialDashboardCurrency,
  type DashboardDateRangeValue,
} from "@/lib/dashboard-controls";
import type { DashboardRenderState } from "@/lib/dashboard-view-state";

type DashboardUpcomingChargeListItem = {
  id: string;
  name: string;
  isActive: boolean;
  amountCents: number;
  currency: string;
  billingInterval: "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  paymentMethod: string;
  renewalDate: string;
  createdAt: string;
  tag: DashboardUpcomingRenewalTag;
};

type DashboardAttentionListItem = {
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

type DashboardTopCostDriverListItem = {
  id: string;
  name: string;
  currency: string;
  billingInterval: "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  monthlyEquivalentAmountCents: number;
  annualProjectionCents: number;
  nextBillingDate: string | null;
};

type DashboardSavingsOpportunityListItem = {
  id: string;
  type: DashboardSavingsOpportunity["type"];
  title: string;
  description: string;
  currency: string;
  estimatedMonthlySavingsCents: number;
  subscriptionIds: string[];
};

type DashboardPotentialSavingsData = {
  estimatedMonthlySavingsCents: number | null;
  currency: string | null;
  totalsByCurrency: Array<{
    currency: string;
    estimatedMonthlySavingsCents: number;
  }>;
  opportunities: DashboardSavingsOpportunityListItem[];
  assumptions: string[];
};

type DashboardSectionsClientProps = {
  availableCurrencies: string[];
  kpis?: DashboardKpis | null;
  attentionNeeded: DashboardAttentionListItem[];
  topCostDrivers: DashboardTopCostDriverListItem[];
  potentialSavings: DashboardPotentialSavingsData;
  upcomingCharges: DashboardUpcomingChargeListItem[];
  monthlySpendTotalsByCurrency: Array<{
    currency: string;
    monthlyEquivalentSpendCents: number;
  }>;
  spendBreakdownByCategory: Array<{
    category: string;
    subscriptionCount: number;
    totalsByCurrency: Array<{
      currency: string;
      monthlyEquivalentSpendCents: number;
    }>;
  }>;
  initialCurrency?: string | null;
  renderState?: DashboardRenderState;
  loadErrorMessage?: string | null;
  onRetryLoad?: () => void;
};

const UPCOMING_RENEWALS_VISIBLE_ROWS = 6;

function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCadenceSuffix(type: "monthly" | "annual"): string {
  return type === "monthly" ? "/mo" : "/yr";
}

function formatRenewalCadenceSuffix(billingInterval: DashboardUpcomingChargeListItem["billingInterval"]): string {
  if (billingInterval === "WEEKLY") {
    return "/wk";
  }

  if (billingInterval === "MONTHLY") {
    return "/mo";
  }

  if (billingInterval === "YEARLY") {
    return "/yr";
  }

  return "/custom";
}

function formatCountLabel(value: number, singular: string, plural: string = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function formatCurrencyTotalsSummary(totalsByCurrency: DashboardCurrencyTotal[], type: "monthly" | "annual"): string {
  if (totalsByCurrency.length === 0) {
    return "No active subscriptions.";
  }

  const visibleTotals = totalsByCurrency.slice(0, 2);
  const cadenceSuffix = formatCadenceSuffix(type);
  const summary = visibleTotals
    .map((entry) => {
      const amount = type === "monthly" ? entry.monthlyEquivalentSpendCents : entry.annualProjectionCents;
      return `${formatMoney(amount, entry.currency)} ${entry.currency}${cadenceSuffix}`;
    })
    .join(" · ");
  const remainingCount = totalsByCurrency.length - visibleTotals.length;

  if (remainingCount <= 0) {
    return summary;
  }

  return `${summary} · +${remainingCount} more`;
}

function formatSavingsCurrencyTotalsSummary(
  totalsByCurrency: Array<{ currency: string; estimatedMonthlySavingsCents: number }>,
): string {
  if (totalsByCurrency.length === 0) {
    return "No opportunities currently qualify for savings.";
  }

  const visibleTotals = totalsByCurrency.slice(0, 2);
  const summary = visibleTotals
    .map((entry) => `${formatMoney(entry.estimatedMonthlySavingsCents, entry.currency)} ${entry.currency}/mo`)
    .join(" · ");
  const remainingCount = totalsByCurrency.length - visibleTotals.length;

  if (remainingCount <= 0) {
    return summary;
  }

  return `${summary} · +${remainingCount} more`;
}

type KpiCardContent = {
  value: string;
  note: string;
};

function buildSpendMetricContent(
  metric: DashboardMetricAmount | null | undefined,
  type: "monthly" | "annual",
): KpiCardContent {
  if (!metric) {
    return {
      value: "Loading...",
      note: "Calculating from subscription data.",
    };
  }

  if (metric.totalsByCurrency.length === 0) {
    return {
      value: "No data",
      note: "No active subscriptions to summarize.",
    };
  }

  const cadenceSuffix = formatCadenceSuffix(type);
  const excludedCustomCadenceNote =
    metric.excludedCustomCadenceCount > 0
      ? ` Excludes ${formatCountLabel(metric.excludedCustomCadenceCount, "custom cadence subscription")}.`
      : "";

  if (metric.amountCents !== null && metric.currency) {
    return {
      value: `${formatMoney(metric.amountCents, metric.currency)}${cadenceSuffix}`,
      note: `Active subscriptions in ${metric.currency}.${excludedCustomCadenceNote}`,
    };
  }

  return {
    value: `${metric.totalsByCurrency.length} currencies`,
    note: `${formatCurrencyTotalsSummary(metric.totalsByCurrency, type)}${excludedCustomCadenceNote}`.trim(),
  };
}

function formatTag(tag: DashboardUpcomingRenewalTag): string {
  if (tag === "urgent") {
    return "URGENT";
  }

  if (tag === "work") {
    return "WORK";
  }

  if (tag === "gaming") {
    return "GAMING";
  }

  return "RENEW";
}

function formatSavingsOpportunityType(type: DashboardSavingsOpportunity["type"]): string {
  if (type === "duplicate_overlap") {
    return "Duplicate overlap";
  }

  return "Potentially unused";
}

function tagClassName(tag: DashboardUpcomingRenewalTag): string {
  if (tag === "urgent") {
    return "pill renewal-tag renewal-tag-urgent";
  }

  if (tag === "work") {
    return "pill renewal-tag renewal-tag-work";
  }

  if (tag === "gaming") {
    return "pill renewal-tag renewal-tag-gaming";
  }

  if (tag === "renew") {
    return "pill renewal-tag renewal-tag-renew";
  }

  return "pill renewal-tag";
}

function getPaymentMethodIndicator(paymentMethod: string): string {
  const normalized = paymentMethod.trim().toLowerCase();

  if (!normalized) {
    return "NA";
  }

  if (normalized.includes("visa")) {
    return "VISA";
  }

  if (normalized.includes("mastercard")) {
    return "MC";
  }

  if (normalized.includes("amex") || normalized.includes("american express")) {
    return "AMEX";
  }

  if (normalized.includes("paypal")) {
    return "PP";
  }

  if (normalized.includes("apple pay")) {
    return "AP";
  }

  if (normalized.includes("google pay")) {
    return "GP";
  }

  if (normalized.includes("bank") || normalized.includes("ach")) {
    return "BANK";
  }

  return "CARD";
}

function getServiceInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((value) => value.length > 0);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0]?.charAt(0) ?? ""}${words[1]?.charAt(0) ?? ""}`.toUpperCase();
}

function getServiceLogoSrc(name: string): string | null {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    return null;
  }

  return `/brands/${slug}.svg`;
}

function formatAttentionSeverityLabel(severity: DashboardAttentionSeverity): string {
  if (severity === "high") {
    return "High";
  }

  if (severity === "medium") {
    return "Medium";
  }

  return "Low";
}

function attentionSeverityClassName(severity: DashboardAttentionSeverity): string {
  return `attention-severity attention-severity-${severity}`;
}

function attentionSeverityGlyph(severity: DashboardAttentionSeverity): string {
  if (severity === "high") {
    return "!";
  }

  if (severity === "medium") {
    return "~";
  }

  return "i";
}

function isInDateRange(value: string | null, now: Date, rangeDays: number): boolean {
  if (!value) {
    return true;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const deltaMs = parsedDate.getTime() - now.getTime();
  const maxMs = rangeDays * 24 * 60 * 60 * 1000;

  return deltaMs >= 0 && deltaMs <= maxMs;
}

function DashboardSkeletonLine({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`dashboard-skeleton-line ${className}`.trim()} />;
}

export default function DashboardSectionsClient({
  availableCurrencies,
  kpis,
  attentionNeeded,
  topCostDrivers,
  potentialSavings,
  upcomingCharges,
  monthlySpendTotalsByCurrency,
  spendBreakdownByCategory,
  initialCurrency,
  renderState,
  loadErrorMessage,
  onRetryLoad,
}: DashboardSectionsClientProps) {
  const detailsModal = useSubscriptionDetailsModal();
  const spendBreakdownTitleId = useId();
  const spendBreakdownDescriptionId = useId();
  const resolvedRenderState = renderState ?? (kpis ? "populated" : "loading");
  const isLoading = resolvedRenderState === "loading";
  const isError = resolvedRenderState === "error";
  const controlsDisabled = isLoading;
  const [currency, setCurrency] = useState<string>(() => resolveInitialDashboardCurrency(initialCurrency));
  const [dateRange, setDateRange] = useState<DashboardDateRangeValue>(DEFAULT_DASHBOARD_DATE_RANGE);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllUpcomingRenewals, setShowAllUpcomingRenewals] = useState(false);
  const now = useMemo(() => new Date(), []);
  const dateRangeDays = useMemo(() => {
    return DASHBOARD_DATE_RANGE_OPTIONS.find((option) => option.value === dateRange)?.days ?? 30;
  }, [dateRange]);

  const filteredUpcomingCharges = useMemo(
    () =>
      filterDashboardUpcomingRenewals(
        upcomingCharges,
        {
          currency,
          dateRange,
          searchQuery,
        },
        now,
      ),
    [currency, dateRange, now, searchQuery, upcomingCharges],
  );
  useEffect(() => {
    setShowAllUpcomingRenewals(false);
  }, [currency, dateRange, searchQuery]);
  const visibleUpcomingCharges = useMemo(() => {
    if (showAllUpcomingRenewals) {
      return filteredUpcomingCharges;
    }

    return filteredUpcomingCharges.slice(0, UPCOMING_RENEWALS_VISIBLE_ROWS);
  }, [filteredUpcomingCharges, showAllUpcomingRenewals]);
  const hasClippedUpcomingRenewals = filteredUpcomingCharges.length > UPCOMING_RENEWALS_VISIBLE_ROWS;
  const hiddenUpcomingRenewalsCount = Math.max(filteredUpcomingCharges.length - visibleUpcomingCharges.length, 0);
  const filteredAttentionNeeded = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const selectedCurrency = currency.toUpperCase();

    return attentionNeeded.filter((alert) => {
      if (
        currency !== DASHBOARD_ALL_CURRENCIES &&
        alert.currency !== null &&
        alert.currency.toUpperCase() !== selectedCurrency
      ) {
        return false;
      }

      if (!isInDateRange(alert.dueDate, now, dateRangeDays)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [alert.title, alert.message, alert.currency ?? "", alert.type].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [attentionNeeded, currency, dateRangeDays, now, searchQuery]);
  const filteredTopCostDrivers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const selectedCurrency = currency.toUpperCase();

    return topCostDrivers.filter((driver) => {
      if (currency !== DASHBOARD_ALL_CURRENCIES && driver.currency.toUpperCase() !== selectedCurrency) {
        return false;
      }

      if (!isInDateRange(driver.nextBillingDate, now, dateRangeDays)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [driver.name, driver.currency, driver.billingInterval].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [currency, dateRangeDays, now, searchQuery, topCostDrivers]);
  const filteredSavingsOpportunities = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const selectedCurrency = currency.toUpperCase();

    return potentialSavings.opportunities.filter((opportunity) => {
      if (currency !== DASHBOARD_ALL_CURRENCIES && opportunity.currency.toUpperCase() !== selectedCurrency) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [opportunity.title, opportunity.description, opportunity.currency, opportunity.type].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [currency, potentialSavings.opportunities, searchQuery]);
  const filteredSavingsTotalsByCurrency = useMemo(() => {
    const totalsMap = new Map<string, number>();

    for (const opportunity of filteredSavingsOpportunities) {
      totalsMap.set(
        opportunity.currency,
        (totalsMap.get(opportunity.currency) ?? 0) + opportunity.estimatedMonthlySavingsCents,
      );
    }

    return [...totalsMap.entries()]
      .map(([currencyCode, estimatedMonthlySavingsCents]) => ({
        currency: currencyCode,
        estimatedMonthlySavingsCents,
      }))
      .sort((first, second) => {
        return (
          second.estimatedMonthlySavingsCents - first.estimatedMonthlySavingsCents ||
          first.currency.localeCompare(second.currency)
        );
      });
  }, [filteredSavingsOpportunities]);
  const potentialSavingsSummary = useMemo<KpiCardContent>(() => {
    if (filteredSavingsTotalsByCurrency.length === 0) {
      return {
        value: "No opportunities",
        note: "No savings candidates match the current control filters.",
      };
    }

    if (filteredSavingsTotalsByCurrency.length === 1) {
      const [singleTotal] = filteredSavingsTotalsByCurrency;

      return {
        value: `${formatMoney(singleTotal.estimatedMonthlySavingsCents, singleTotal.currency)}${formatCadenceSuffix("monthly")}`,
        note: `Estimated from ${formatCountLabel(filteredSavingsOpportunities.length, "opportunity")} in ${singleTotal.currency}.`,
      };
    }

    return {
      value: `${filteredSavingsTotalsByCurrency.length} currencies`,
      note: formatSavingsCurrencyTotalsSummary(filteredSavingsTotalsByCurrency),
    };
  }, [filteredSavingsOpportunities.length, filteredSavingsTotalsByCurrency]);
  const topCostDriverCurrencyCount = useMemo(() => {
    return new Set(filteredTopCostDrivers.map((driver) => driver.currency.toUpperCase())).size;
  }, [filteredTopCostDrivers]);
  const currencyOptions = useMemo(() => buildDashboardCurrencyOptions(availableCurrencies, currency), [availableCurrencies, currency]);
  const monthlyEquivalentSpend = buildSpendMetricContent(kpis?.monthlyEquivalentSpend, "monthly");
  const annualProjection = buildSpendMetricContent(kpis?.annualProjection, "annual");
  const renewalsInNextSevenDays: KpiCardContent = !kpis
    ? {
        value: "Loading...",
        note: "Calculating upcoming renewals.",
      }
    : kpis.subscriptions.active === 0
      ? {
          value: "0 renewals",
          note: "Add active subscriptions to track near-term renewals.",
        }
      : {
          value: formatCountLabel(kpis.renewalsInNext7Days, "renewal"),
          note: `${formatCountLabel(kpis.renewalsInNext7Days, "subscription")} due in the next 7 days.`,
        };
  const activeVsCanceled: KpiCardContent = !kpis
    ? {
        value: "Loading...",
        note: "Counting current subscription statuses.",
      }
    : kpis.subscriptions.total === 0
      ? {
          value: "0 active",
          note: "Add your first subscription to populate this KPI.",
        }
      : {
          value: `${formatCountLabel(kpis.subscriptions.active, "active", "active")}`,
          note: `${formatCountLabel(kpis.subscriptions.canceled, "canceled", "canceled")} · ${kpis.subscriptions.total} total`,
        };
  const spendBreakdownCurrency = useMemo(() => {
    if (currency !== DASHBOARD_ALL_CURRENCIES) {
      return currency.toUpperCase();
    }

    return monthlySpendTotalsByCurrency.length === 1 ? monthlySpendTotalsByCurrency[0].currency : null;
  }, [currency, monthlySpendTotalsByCurrency]);
  const spendBreakdownRows = useMemo(() => {
    if (!spendBreakdownCurrency) {
      return [];
    }

    return mapDashboardSpendBreakdownByCurrency(spendBreakdownByCategory, spendBreakdownCurrency, searchQuery);
  }, [searchQuery, spendBreakdownByCategory, spendBreakdownCurrency]);
  const spendBreakdownTotalCents = useMemo(() => {
    return spendBreakdownRows.reduce((total, row) => total + row.monthlyEquivalentSpendCents, 0);
  }, [spendBreakdownRows]);
  const spendBreakdownKpiTotalCents = useMemo(() => {
    if (!spendBreakdownCurrency) {
      return null;
    }

    return (
      monthlySpendTotalsByCurrency.find((entry) => entry.currency === spendBreakdownCurrency)?.monthlyEquivalentSpendCents ??
      null
    );
  }, [monthlySpendTotalsByCurrency, spendBreakdownCurrency]);
  const spendBreakdownReconciled =
    spendBreakdownKpiTotalCents === null || spendBreakdownKpiTotalCents === spendBreakdownTotalCents;
  const spendBreakdownSegments = useMemo(() => {
    if (!spendBreakdownCurrency || spendBreakdownTotalCents <= 0) {
      return [];
    }

    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    let dashOffset = 0;

    return spendBreakdownRows.map((row) => {
      const segmentLength = (row.monthlyEquivalentSpendCents / spendBreakdownTotalCents) * circumference;
      const segment = {
        category: row.category,
        color: row.color,
        segmentLength,
        dashOffset,
      };
      dashOffset -= segmentLength;
      return segment;
    });
  }, [spendBreakdownCurrency, spendBreakdownRows, spendBreakdownTotalCents]);
  const spendBreakdownDescription = useMemo(() => {
    if (!spendBreakdownCurrency || spendBreakdownRows.length === 0 || spendBreakdownTotalCents <= 0) {
      return "No categorized spend data is available for the current controls.";
    }

    return spendBreakdownRows
      .map((row) => {
        const percent = Math.round((row.monthlyEquivalentSpendCents / spendBreakdownTotalCents) * 100);
        return `${row.category}: ${formatMoney(row.monthlyEquivalentSpendCents, spendBreakdownCurrency)} (${percent}%).`;
      })
      .join(" ");
  }, [spendBreakdownCurrency, spendBreakdownRows, spendBreakdownTotalCents]);
  const spendBreakdownChartCircumference = 2 * Math.PI * 44;

  return (
    <>
      <div className="dashboard-shell" aria-busy={isLoading}>
        <span className="visually-hidden" aria-live="polite" role="status">
          {isLoading
            ? "Dashboard content is loading."
            : isError
              ? "Dashboard failed to load."
              : "Dashboard content loaded."}
        </span>

        <article aria-label="Dashboard filters and actions" className="dashboard-card dashboard-controls-shell">
          <div className="dashboard-control-grid">
            <label className="form-field" htmlFor="dashboard-currency-select">
              Currency
              <select
                disabled={controlsDisabled}
                id="dashboard-currency-select"
                onChange={(event) => setCurrency(event.target.value)}
                value={currency}
              >
                <option value={DASHBOARD_ALL_CURRENCIES}>All currencies</option>
                {currencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field" htmlFor="dashboard-date-range-select">
              Date range
              <select
                disabled={controlsDisabled}
                id="dashboard-date-range-select"
                onChange={(event) => setDateRange(event.target.value as DashboardDateRangeValue)}
                value={dateRange}
              >
                {DASHBOARD_DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field dashboard-search-control" htmlFor="dashboard-search-input">
              Search
              <input
                disabled={controlsDisabled}
                id="dashboard-search-input"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, payment method, or currency..."
                type="search"
                value={searchQuery}
              />
            </label>
          </div>
          <div className="dashboard-control-actions">
            <Link aria-disabled={controlsDisabled} className="button" href="/subscriptions" tabIndex={controlsDisabled ? -1 : undefined}>
              Add Subscription
            </Link>
          </div>
        </article>

        {isError ? (
          <div className="notice-error dashboard-error-banner" role="alert">
            <span>{loadErrorMessage ?? "Unable to load dashboard data. Please try again."}</span>
            {onRetryLoad ? (
              <button className="button button-secondary button-small" onClick={onRetryLoad} type="button">
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        <section className="dashboard-grid">
          <article className="dashboard-card">
            <h2>KPI Summary</h2>
            {isLoading ? (
              <div className="metric-grid dashboard-kpi-grid" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, index) => (
                  <article className="metric-card metric-card-skeleton" key={index}>
                    <DashboardSkeletonLine className="dashboard-skeleton-line-xs" />
                    <DashboardSkeletonLine className="dashboard-skeleton-line-lg" />
                    <DashboardSkeletonLine className="dashboard-skeleton-line-sm" />
                  </article>
                ))}
              </div>
            ) : (
              <div className="metric-grid dashboard-kpi-grid">
                <article className="metric-card" aria-live="polite">
                  <span className="metric-label">Monthly equivalent spend</span>
                  <strong className="metric-value">{monthlyEquivalentSpend.value}</strong>
                  <span className="metric-note">{monthlyEquivalentSpend.note}</span>
                </article>
                <article className="metric-card" aria-live="polite">
                  <span className="metric-label">Annual projection</span>
                  <strong className="metric-value">{annualProjection.value}</strong>
                  <span className="metric-note">{annualProjection.note}</span>
                </article>
                <article className="metric-card" aria-live="polite">
                  <span className="metric-label">Renewing in next 7 days</span>
                  <strong className="metric-value">{renewalsInNextSevenDays.value}</strong>
                  <span className="metric-note">{renewalsInNextSevenDays.note}</span>
                </article>
                <article className="metric-card" aria-live="polite">
                  <span className="metric-label">Active vs canceled subscriptions</span>
                  <strong className="metric-value">{activeVsCanceled.value}</strong>
                  <span className="metric-note">{activeVsCanceled.note}</span>
                </article>
              </div>
            )}
          </article>
        </section>

        <section className="dashboard-grid dashboard-grid-two-up">
          <article className="dashboard-card">
            <div className="dashboard-card-header">
              <h2>Spend Breakdown</h2>
              <span className="metric-note">
                {isLoading
                  ? "Loading categories..."
                  : spendBreakdownCurrency
                    ? `${spendBreakdownRows.length} categories`
                    : "Select a currency"}
              </span>
            </div>
            {isLoading ? (
              <div className="spend-breakdown-layout" aria-hidden="true">
                <figure className="spend-donut-figure spend-donut-figure-skeleton">
                  <span className="spend-donut-skeleton" />
                  <figcaption className="spend-donut-total">
                    <DashboardSkeletonLine className="dashboard-skeleton-line-sm" />
                    <DashboardSkeletonLine className="dashboard-skeleton-line-md" />
                  </figcaption>
                </figure>
                <ul className="spend-legend spend-legend-skeleton">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <li className="spend-legend-item" key={index}>
                      <span className="spend-legend-swatch dashboard-skeleton-swatch" />
                      <div className="spend-legend-copy">
                        <DashboardSkeletonLine className="dashboard-skeleton-line-sm" />
                        <DashboardSkeletonLine className="dashboard-skeleton-line-lg" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : !spendBreakdownCurrency ? (
              <p className="text-muted">
                Choose a specific currency to compare category spend when your dashboard contains multiple currencies.
              </p>
            ) : spendBreakdownRows.length === 0 || spendBreakdownTotalCents <= 0 ? (
              <p className="text-muted">No categorized spend exists for the current filters.</p>
            ) : (
              <div className="spend-breakdown-layout">
                <figure className="spend-donut-figure">
                  <svg
                    aria-describedby={spendBreakdownDescriptionId}
                    aria-labelledby={spendBreakdownTitleId}
                    className="spend-donut"
                    role="img"
                    viewBox="0 0 112 112"
                  >
                    <title id={spendBreakdownTitleId}>
                      Spend by category in {spendBreakdownCurrency}
                    </title>
                    <desc id={spendBreakdownDescriptionId}>{spendBreakdownDescription}</desc>
                    <circle className="spend-donut-track" cx="56" cy="56" r="44" />
                    {spendBreakdownSegments.map((segment) => (
                      <circle
                        className="spend-donut-segment"
                        cx="56"
                        cy="56"
                        key={segment.category}
                        r="44"
                        stroke={segment.color}
                        strokeDasharray={`${segment.segmentLength} ${spendBreakdownChartCircumference}`}
                        strokeDashoffset={segment.dashOffset}
                      />
                    ))}
                  </svg>
                  <figcaption className="spend-donut-total">
                    <span className="metric-note">Monthly total</span>
                    <strong>{formatMoney(spendBreakdownTotalCents, spendBreakdownCurrency)}</strong>
                  </figcaption>
                </figure>
                <ul aria-label={`Spend category legend in ${spendBreakdownCurrency}`} className="spend-legend">
                  {spendBreakdownRows.map((row) => {
                    const percent = Math.round((row.monthlyEquivalentSpendCents / spendBreakdownTotalCents) * 100);
                    const subscriptionLabel = row.subscriptionCount === 1 ? "1 subscription" : `${row.subscriptionCount} subscriptions`;

                    return (
                      <li className="spend-legend-item" key={row.category}>
                        <span
                          aria-hidden="true"
                          className="spend-legend-swatch"
                          style={{ backgroundColor: row.color }}
                        />
                        <div className="spend-legend-copy">
                          <span className="spend-legend-label">{row.category}</span>
                          <span className="spend-legend-value">
                            {formatMoney(row.monthlyEquivalentSpendCents, spendBreakdownCurrency)} - {percent}% -{" "}
                            {subscriptionLabel}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {!isLoading && spendBreakdownCurrency && spendBreakdownRows.length === 1 ? (
              <p className="text-muted">Only one category currently contributes spend for these filters.</p>
            ) : null}
            {!isLoading && spendBreakdownCurrency && !spendBreakdownReconciled ? (
              <p className="text-muted" role="status">
                Category totals ({formatMoney(spendBreakdownTotalCents, spendBreakdownCurrency)}) differ from KPI total (
                {formatMoney(spendBreakdownKpiTotalCents ?? 0, spendBreakdownCurrency)}).
              </p>
            ) : null}
          </article>
          <article className="dashboard-card">
            <div className="dashboard-card-header">
              <h2>Attention Needed</h2>
              <span className="metric-note">
                {isLoading ? "Loading alerts..." : `${filteredAttentionNeeded.length} matching alerts`}
              </span>
            </div>
            {isLoading ? (
              <div className="attention-list" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, index) => (
                  <article className="attention-item attention-item-skeleton" key={index}>
                    <div className="attention-item-header">
                      <DashboardSkeletonLine className="dashboard-skeleton-line-xs" />
                      <DashboardSkeletonLine className="dashboard-skeleton-line-sm" />
                    </div>
                    <DashboardSkeletonLine className="dashboard-skeleton-line-md" />
                    <DashboardSkeletonLine className="dashboard-skeleton-line-lg" />
                    <DashboardSkeletonLine className="dashboard-skeleton-line-sm" />
                  </article>
                ))}
              </div>
            ) : filteredAttentionNeeded.length === 0 ? (
              <p className="text-muted">No attention alerts match the current control filters.</p>
            ) : (
              <div className="attention-list">
                {filteredAttentionNeeded.map((alert) => {
                  const singleSubscriptionId = alert.subscriptionIds.length === 1 ? alert.subscriptionIds[0] : null;

                  return (
                    <article className="attention-item" key={alert.id}>
                      <div className="attention-item-header">
                        <span className={attentionSeverityClassName(alert.severity)}>
                          <span aria-hidden="true" className="attention-severity-glyph">
                            {attentionSeverityGlyph(alert.severity)}
                          </span>
                          {formatAttentionSeverityLabel(alert.severity)}
                        </span>
                        {alert.dueDate ? <span className="metric-note">Due {formatDate(alert.dueDate)}</span> : null}
                      </div>
                      <h3>{alert.title}</h3>
                      <p className="text-muted">{alert.message}</p>
                      {alert.estimatedMonthlyImpactCents !== null && alert.currency ? (
                        <p className="attention-impact">
                          Estimated monthly impact: {formatMoney(alert.estimatedMonthlyImpactCents, alert.currency)}
                        </p>
                      ) : null}
                      {singleSubscriptionId ? (
                        <button
                          className="button button-secondary button-small"
                          onClick={() =>
                            void detailsModal.openModal({
                              subscriptionId: singleSubscriptionId,
                              source: "subscriptions_list",
                            })
                          }
                          type="button"
                        >
                          View subscription
                        </button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card">
            <div className="dashboard-card-header">
              <h2>Upcoming Renewals</h2>
              <span className="metric-note">
                {isLoading
                  ? "Loading renewals..."
                  : `${filteredUpcomingCharges.length} matching rows, sorted by soonest date`}
              </span>
            </div>
            {isLoading ? (
              <div className="upcoming-renewals-table-shell" aria-hidden="true">
                <DashboardSkeletonLine className="dashboard-skeleton-line-md" />
                <div className="upcoming-renewals-table-wrap">
                  <table className="upcoming-renewals-table">
                    <tbody>
                      {Array.from({ length: 4 }).map((_, index) => (
                        <tr key={index}>
                          <td>
                            <DashboardSkeletonLine className="dashboard-skeleton-line-md" />
                          </td>
                          <td>
                            <DashboardSkeletonLine className="dashboard-skeleton-line-sm" />
                          </td>
                          <td>
                            <DashboardSkeletonLine className="dashboard-skeleton-line-sm" />
                          </td>
                          <td>
                            <DashboardSkeletonLine className="dashboard-skeleton-line-md" />
                          </td>
                          <td>
                            <DashboardSkeletonLine className="dashboard-skeleton-line-xs" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : filteredUpcomingCharges.length === 0 ? (
              <p className="text-muted">No upcoming renewals match the current control filters.</p>
            ) : (
              <div className="upcoming-renewals-table-shell">
                <p className="text-muted" role="status">
                  {showAllUpcomingRenewals
                    ? `Showing all ${filteredUpcomingCharges.length} rows.`
                    : `Showing ${visibleUpcomingCharges.length} of ${filteredUpcomingCharges.length} rows.`}
                </p>
                <div className="upcoming-renewals-table-wrap">
                  <table className="upcoming-renewals-table">
                    <caption className="visually-hidden">
                      Upcoming renewals including service, renewal date, amount cadence, payment method, and tag.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Service</th>
                        <th scope="col">Renewal Date</th>
                        <th scope="col">Amount/Cadence</th>
                        <th scope="col">Payment</th>
                        <th scope="col">Tag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUpcomingCharges.map((subscription) => {
                        const serviceInitials = getServiceInitials(subscription.name);
                        const logoSrc = getServiceLogoSrc(subscription.name);

                        return (
                          <tr key={subscription.id}>
                            <th data-label="Service" scope="row">
                              <div className="renewal-service-cell">
                                <span aria-hidden="true" className="renewal-service-icon">
                                  {logoSrc ? (
                                    <Image
                                      alt=""
                                      className="renewal-service-logo"
                                      height={28}
                                      loading="lazy"
                                      onError={(event) => {
                                        event.currentTarget.style.display = "none";
                                      }}
                                      src={logoSrc}
                                      width={28}
                                    />
                                  ) : null}
                                  <span className="renewal-service-fallback">{serviceInitials}</span>
                                </span>
                                <button
                                  aria-label={`View details for ${subscription.name}`}
                                  className="renewal-service-button"
                                  onClick={() =>
                                    void detailsModal.openModal({
                                      subscriptionId: subscription.id,
                                      source: "upcoming_charges",
                                    })
                                  }
                                  type="button"
                                >
                                  {subscription.name}
                                </button>
                              </div>
                            </th>
                            <td data-label="Renewal Date">{formatDate(subscription.renewalDate)}</td>
                            <td data-label="Amount/Cadence">
                              {formatMoney(subscription.amountCents, subscription.currency)}{" "}
                              {formatRenewalCadenceSuffix(subscription.billingInterval)}
                            </td>
                            <td data-label="Payment">
                              <div className="renewal-payment-cell">
                                <span className="payment-indicator">{getPaymentMethodIndicator(subscription.paymentMethod)}</span>
                                <span className="text-muted">
                                  {subscription.paymentMethod.trim() || "No payment method on file"}
                                </span>
                              </div>
                            </td>
                            <td data-label="Tag">
                              <span className={tagClassName(subscription.tag)}>{formatTag(subscription.tag)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {hasClippedUpcomingRenewals ? (
                  <div className="upcoming-renewals-actions">
                    <button
                      className="button button-secondary button-small"
                      onClick={() => setShowAllUpcomingRenewals((currentValue) => !currentValue)}
                      type="button"
                    >
                      {showAllUpcomingRenewals ? "Show less" : `Show ${hiddenUpcomingRenewalsCount} more`}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </article>
        </section>

        <section className="dashboard-grid dashboard-grid-two-up">
          <article className="dashboard-card">
            <div className="dashboard-card-header">
              <h2>Potential Savings</h2>
              <span className="metric-note">
                {isLoading ? "Loading opportunities..." : `${filteredSavingsOpportunities.length} matching opportunities`}
              </span>
            </div>
            {isLoading ? (
              <div aria-hidden="true" className="stack">
                <article className="metric-card metric-card-skeleton savings-summary-card">
                  <DashboardSkeletonLine className="dashboard-skeleton-line-xs" />
                  <DashboardSkeletonLine className="dashboard-skeleton-line-lg" />
                  <DashboardSkeletonLine className="dashboard-skeleton-line-md" />
                </article>
                <ul className="savings-opportunity-list">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <li className="savings-opportunity-item savings-opportunity-item-skeleton" key={index}>
                      <DashboardSkeletonLine className="dashboard-skeleton-line-sm" />
                      <DashboardSkeletonLine className="dashboard-skeleton-line-md" />
                      <DashboardSkeletonLine className="dashboard-skeleton-line-lg" />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <article className="metric-card savings-summary-card">
                  <span className="metric-label">Estimated monthly savings</span>
                  <strong className="metric-value">{potentialSavingsSummary.value}</strong>
                  <span className="metric-note">{potentialSavingsSummary.note}</span>
                </article>
                {filteredSavingsOpportunities.length === 0 ? (
                  <p className="text-muted mt-sm">No savings opportunities match the current control filters.</p>
                ) : (
                  <ul className="savings-opportunity-list">
                    {filteredSavingsOpportunities.map((opportunity) => {
                      const singleSubscriptionId =
                        opportunity.subscriptionIds.length === 1 ? opportunity.subscriptionIds[0] : null;

                      return (
                        <li className="savings-opportunity-item" key={opportunity.id}>
                          <div className="savings-opportunity-header">
                            <span className="pill savings-rule-pill">{formatSavingsOpportunityType(opportunity.type)}</span>
                            <strong>{formatMoney(opportunity.estimatedMonthlySavingsCents, opportunity.currency)}/mo</strong>
                          </div>
                          <h3>{opportunity.title}</h3>
                          <p className="text-muted">{opportunity.description}</p>
                          {singleSubscriptionId ? (
                            <button
                              className="button button-secondary button-small"
                              onClick={() =>
                                void detailsModal.openModal({
                                  subscriptionId: singleSubscriptionId,
                                  source: "subscriptions_list",
                                })
                              }
                              type="button"
                            >
                              View subscription
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
            {!isLoading && potentialSavings.assumptions.length > 0 ? (
              <div className="savings-assumptions">
                <span className="metric-note">Assumptions</span>
                <ul>
                  {potentialSavings.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
          <article className="dashboard-card">
            <div className="dashboard-card-header">
              <h2>Top Cost Drivers</h2>
              <span className="metric-note">
                {isLoading ? "Loading drivers..." : `${filteredTopCostDrivers.length} matching rows`}
              </span>
            </div>
            {isLoading ? (
              <ol aria-hidden="true" className="cost-driver-list">
                {Array.from({ length: 3 }).map((_, index) => (
                  <li className="cost-driver-item cost-driver-item-skeleton" key={index}>
                    <span className="cost-driver-rank" />
                    <div className="cost-driver-copy">
                      <DashboardSkeletonLine className="dashboard-skeleton-line-md" />
                      <DashboardSkeletonLine className="dashboard-skeleton-line-lg" />
                    </div>
                  </li>
                ))}
              </ol>
            ) : filteredTopCostDrivers.length === 0 ? (
              <p className="text-muted">No cost drivers match the current control filters.</p>
            ) : (
              <ol className="cost-driver-list">
                {filteredTopCostDrivers.map((driver, index) => (
                  <li className="cost-driver-item" key={driver.id}>
                    <span aria-hidden="true" className="cost-driver-rank">
                      {index + 1}
                    </span>
                    <div className="cost-driver-copy">
                      <div className="cost-driver-header">
                        <button
                          aria-label={`View details for ${driver.name}`}
                          className="renewal-service-button"
                          onClick={() =>
                            void detailsModal.openModal({
                              subscriptionId: driver.id,
                              source: "subscriptions_list",
                            })
                          }
                          type="button"
                        >
                          {driver.name}
                        </button>
                        <strong>{formatMoney(driver.monthlyEquivalentAmountCents, driver.currency)}/mo</strong>
                      </div>
                      <p className="cost-driver-meta">
                        Annual projection {formatMoney(driver.annualProjectionCents, driver.currency)} · Billing cadence{" "}
                        {driver.billingInterval.toLowerCase()}
                        {driver.nextBillingDate ? ` · Next renewal ${formatDate(driver.nextBillingDate)}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {!isLoading && topCostDriverCurrencyCount > 1 ? (
              <p className="text-muted mt-sm">Ranking is normalized to monthly amounts without FX conversion.</p>
            ) : null}
          </article>
        </section>

      </div>

      <SubscriptionDetailsModal
        actionMessage={detailsModal.actionMessage}
        details={detailsModal.details}
        errorMessage={detailsModal.errorMessage}
        isOpen={detailsModal.isOpen}
        loadState={detailsModal.fetchState}
        onClose={detailsModal.closeModal}
        onRunMutationAction={detailsModal.runMutationAction}
        onViewFullHistoryClick={detailsModal.trackViewFullHistory}
        pendingActionKey={detailsModal.pendingActionKey}
        source={detailsModal.source}
      />
    </>
  );
}
