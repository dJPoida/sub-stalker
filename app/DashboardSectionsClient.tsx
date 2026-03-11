"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import SubscriptionDetailsModal from "@/app/components/SubscriptionDetailsModal";
import { useSubscriptionDetailsModal } from "@/app/components/useSubscriptionDetailsModal";
import {
  DASHBOARD_ALL_CURRENCIES,
  DASHBOARD_DATE_RANGE_OPTIONS,
  DEFAULT_DASHBOARD_DATE_RANGE,
  filterDashboardRecentActivity,
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
}: DashboardSectionsClientProps) {
  const detailsModal = useSubscriptionDetailsModal();
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
            <h2>Spend Breakdown</h2>
            <p className="text-muted">Chart and category legend content will render inside this container.</p>
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
