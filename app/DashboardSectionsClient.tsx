"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";

import SubscriptionDetailsModal from "@/app/components/SubscriptionDetailsModal";
import { useSubscriptionDetailsModal } from "@/app/components/useSubscriptionDetailsModal";
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

type DashboardSectionsClientProps = {
  availableCurrencies: string[];
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

export default function DashboardSectionsClient({
  availableCurrencies,
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
            <p className="text-muted">
              Summary metric cards are reserved in this section and will expand in the next dashboard iteration.
            </p>
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
            <h2>Attention Needed</h2>
            <p className="text-muted">Alert items and severity indicators will render in this section.</p>
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
