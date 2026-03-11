"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";

import SubscriptionDetailsModal from "@/app/components/SubscriptionDetailsModal";
import { useSubscriptionDetailsModal } from "@/app/components/useSubscriptionDetailsModal";
import type {
  DashboardAttentionSeverity,
  DashboardAttentionType,
  DashboardCurrencyTotal,
  DashboardKpis,
  DashboardMetricAmount,
} from "@/lib/dashboard";
import {
  DASHBOARD_ALL_CURRENCIES,
  DASHBOARD_DATE_RANGE_OPTIONS,
  DEFAULT_DASHBOARD_DATE_RANGE,
  filterDashboardRecentActivity,
  mapDashboardSpendBreakdownByCurrency,
  filterDashboardUpcomingRenewals,
  type DashboardDateRangeValue,
} from "@/lib/dashboard-controls";

type DashboardUpcomingChargeListItem = {
  id: string;
  name: string;
  isActive: boolean;
  amountCents: number;
  currency: string;
  paymentMethod: string;
  renewalDate: string;
  createdAt: string;
  tag: "urgent" | "soon" | "upcoming";
};

type DashboardRecentActivityListItem = {
  id: string;
  name: string;
  isActive: boolean;
  amountCents: number;
  currency: string;
  createdAt: string;
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

type DashboardSectionsClientProps = {
  availableCurrencies: string[];
  kpis?: DashboardKpis | null;
  attentionNeeded: DashboardAttentionListItem[];
  upcomingCharges: DashboardUpcomingChargeListItem[];
  recentSubscriptions: DashboardRecentActivityListItem[];
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
};

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

function formatTag(tag: "urgent" | "soon" | "upcoming"): string {
  if (tag === "urgent") {
    return "URGENT";
  }

  if (tag === "soon") {
    return "SOON";
  }

  return "UPCOMING";
}

function tagClassName(tag: "urgent" | "soon" | "upcoming"): string {
  if (tag === "urgent") {
    return "pill pill-fail";
  }

  if (tag === "soon") {
    return "pill pill-ok";
  }

  return "pill";
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

export default function DashboardSectionsClient({
  availableCurrencies,
  kpis,
  attentionNeeded,
  upcomingCharges,
  recentSubscriptions,
  monthlySpendTotalsByCurrency,
  spendBreakdownByCategory,
}: DashboardSectionsClientProps) {
  const detailsModal = useSubscriptionDetailsModal();
  const spendBreakdownTitleId = useId();
  const spendBreakdownDescriptionId = useId();
  const [currency, setCurrency] = useState<string>(DASHBOARD_ALL_CURRENCIES);
  const [dateRange, setDateRange] = useState<DashboardDateRangeValue>(DEFAULT_DASHBOARD_DATE_RANGE);
  const [searchQuery, setSearchQuery] = useState("");
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
  const filteredRecentActivity = useMemo(
    () =>
      filterDashboardRecentActivity(
        recentSubscriptions,
        {
          currency,
          dateRange,
          searchQuery,
        },
        now,
      ),
    [currency, dateRange, now, recentSubscriptions, searchQuery],
  );
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
  const currencyOptions = useMemo(() => {
    const normalized = [
      ...new Set(
        availableCurrencies
          .map((value) => value.trim().toUpperCase())
          .filter((value) => value.length > 0),
      ),
    ].sort((first, second) => first.localeCompare(second));

    if (!normalized.includes("USD")) {
      return normalized;
    }

    return ["USD", ...normalized.filter((value) => value !== "USD")];
  }, [availableCurrencies]);
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
      <div className="dashboard-shell">
        <article className="dashboard-card dashboard-controls-shell">
          <div className="dashboard-control-grid">
            <label className="form-field" htmlFor="dashboard-currency-select">
              Currency
              <select id="dashboard-currency-select" onChange={(event) => setCurrency(event.target.value)} value={currency}>
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
                id="dashboard-search-input"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search name, payment method, or currency..."
                type="search"
                value={searchQuery}
              />
            </label>
          </div>
          <div className="dashboard-control-actions">
            <Link className="button" href="/subscriptions">
              Add Subscription
            </Link>
          </div>
        </article>

        <section className="dashboard-grid">
          <article className="dashboard-card">
            <h2>KPI Summary</h2>
            <div className="metric-grid dashboard-kpi-grid">
              <article className="metric-card" aria-live="polite" aria-busy={!kpis}>
                <span className="metric-label">Monthly equivalent spend</span>
                <strong className="metric-value">{monthlyEquivalentSpend.value}</strong>
                <span className="metric-note">{monthlyEquivalentSpend.note}</span>
              </article>
              <article className="metric-card" aria-live="polite" aria-busy={!kpis}>
                <span className="metric-label">Annual projection</span>
                <strong className="metric-value">{annualProjection.value}</strong>
                <span className="metric-note">{annualProjection.note}</span>
              </article>
              <article className="metric-card" aria-live="polite" aria-busy={!kpis}>
                <span className="metric-label">Renewing in next 7 days</span>
                <strong className="metric-value">{renewalsInNextSevenDays.value}</strong>
                <span className="metric-note">{renewalsInNextSevenDays.note}</span>
              </article>
              <article className="metric-card" aria-live="polite" aria-busy={!kpis}>
                <span className="metric-label">Active vs canceled subscriptions</span>
                <strong className="metric-value">{activeVsCanceled.value}</strong>
                <span className="metric-note">{activeVsCanceled.note}</span>
              </article>
            </div>
          </article>
        </section>

        <section className="dashboard-grid dashboard-grid-two-up">
          <article className="dashboard-card">
            <div className="dashboard-card-header">
              <h2>Spend Breakdown</h2>
              <span className="metric-note">
                {spendBreakdownCurrency ? `${spendBreakdownRows.length} categories` : "Select a currency"}
              </span>
            </div>
            {!spendBreakdownCurrency ? (
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
            {spendBreakdownCurrency && spendBreakdownRows.length === 1 ? (
              <p className="text-muted">Only one category currently contributes spend for these filters.</p>
            ) : null}
            {spendBreakdownCurrency && !spendBreakdownReconciled ? (
              <p className="text-muted" role="status">
                Category totals ({formatMoney(spendBreakdownTotalCents, spendBreakdownCurrency)}) differ from KPI total (
                {formatMoney(spendBreakdownKpiTotalCents ?? 0, spendBreakdownCurrency)}).
              </p>
            ) : null}
          </article>
          <article className="dashboard-card">
            <div className="dashboard-card-header">
              <h2>Attention Needed</h2>
              <span className="metric-note">{filteredAttentionNeeded.length} matching alerts</span>
            </div>
            {filteredAttentionNeeded.length === 0 ? (
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
              <span className="metric-note">{filteredUpcomingCharges.length} matching rows</span>
            </div>
            {filteredUpcomingCharges.length === 0 ? (
              <p className="text-muted">No upcoming renewals match the current control filters.</p>
            ) : (
              <div className="stack">
                {filteredUpcomingCharges.map((subscription) => (
                  <button
                    aria-label={`View details for ${subscription.name}`}
                    className="status-item subscription-entry-button"
                    key={subscription.id}
                    onClick={() =>
                      void detailsModal.openModal({
                        subscriptionId: subscription.id,
                        source: "upcoming_charges",
                      })
                    }
                    type="button"
                  >
                    <div className="subscription-header">
                      <h2>{subscription.name}</h2>
                      <div className="inline-actions">
                        <span className={tagClassName(subscription.tag)}>{formatTag(subscription.tag)}</span>
                        <span className={subscription.isActive ? "pill pill-ok" : "pill pill-fail"}>
                          {subscription.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                    </div>
                    <p className="subscription-meta">
                      {formatMoney(subscription.amountCents, subscription.currency)} - {formatDate(subscription.renewalDate)}
                    </p>
                    <p className="subscription-meta">Payment method: {subscription.paymentMethod}</p>
                  </button>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="dashboard-grid dashboard-grid-two-up">
          <article className="dashboard-card">
            <h2>Potential Savings</h2>
            <p className="text-muted">Savings opportunity insights will render in this container.</p>
          </article>
          <article className="dashboard-card">
            <h2>Top Cost Drivers</h2>
            <p className="text-muted">Top-cost subscription rankings will render in this section.</p>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card">
            <div className="dashboard-card-header">
              <h2>Recent Activity</h2>
              <span className="metric-note">{filteredRecentActivity.length} matching rows</span>
            </div>
            {filteredRecentActivity.length === 0 ? (
              <p className="text-muted">No recent subscriptions match the current control filters.</p>
            ) : (
              <div className="stack">
                {filteredRecentActivity.map((subscription) => (
                  <button
                    aria-label={`View details for ${subscription.name}`}
                    className="status-item subscription-entry-button"
                    key={subscription.id}
                    onClick={() =>
                      void detailsModal.openModal({
                        subscriptionId: subscription.id,
                        source: "recent_activity",
                      })
                    }
                    type="button"
                  >
                    <div className="subscription-header">
                      <h2>{subscription.name}</h2>
                      <span className={subscription.isActive ? "pill pill-ok" : "pill pill-fail"}>
                        {subscription.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <p className="subscription-meta">
                      Added {formatDate(subscription.createdAt)} - {formatMoney(subscription.amountCents, subscription.currency)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>

      <SubscriptionDetailsModal
        details={detailsModal.details}
        errorMessage={detailsModal.errorMessage}
        isOpen={detailsModal.isOpen}
        loadState={detailsModal.fetchState}
        onClose={detailsModal.closeModal}
        onViewFullHistoryClick={detailsModal.trackViewFullHistory}
        source={detailsModal.source}
      />
    </>
  );
}
