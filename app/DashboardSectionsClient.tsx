"use client";

import SubscriptionDetailsModal from "@/app/components/SubscriptionDetailsModal";
import { useSubscriptionDetailsModal } from "@/app/components/useSubscriptionDetailsModal";

type DashboardSubscriptionListItem = {
  id: string;
  name: string;
  isActive: boolean;
  amountCents: number;
  currency: string;
  nextBillingDate: string | null;
  createdAt: string;
};

type DashboardSectionsClientProps = {
  upcomingCharges: DashboardSubscriptionListItem[];
  recentSubscriptions: DashboardSubscriptionListItem[];
};

function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function DashboardSectionsClient({ upcomingCharges, recentSubscriptions }: DashboardSectionsClientProps) {
  const detailsModal = useSubscriptionDetailsModal();

  return (
    <>
      <div className="split-grid">
        <article className="surface">
          <h2>Upcoming Charges</h2>
          {upcomingCharges.length === 0 ? (
            <p className="text-muted">No upcoming charges with billing dates yet.</p>
          ) : (
            <div className="stack">
              {upcomingCharges.map((subscription) => (
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
                    <span className={subscription.isActive ? "pill pill-ok" : "pill pill-fail"}>
                      {subscription.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <p className="subscription-meta">
                    {formatMoney(subscription.amountCents, subscription.currency)} -{" "}
                    {formatDate(subscription.nextBillingDate)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="surface surface-soft">
          <h2>Recent Activity</h2>
          {recentSubscriptions.length === 0 ? (
            <p className="text-muted">No subscriptions added yet.</p>
          ) : (
            <div className="stack">
              {recentSubscriptions.map((subscription) => (
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
