"use client";

import { useEffect, useMemo, useState } from "react";
import { PendingFieldset, PendingSubmitButton } from "@/app/components/PendingFormControls";

type ActionResultMessage = {
  type: "error" | "success";
  text: string;
};

type SubscriptionRecord = {
  id: string;
  name: string;
  provider: string | null;
  amountCents: number;
  currency: string;
  billingInterval: "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  nextBillingDate: string | null;
  isActive: boolean;
  createdAt: string;
};

type BillingIntervalOption = {
  value: "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  label: string;
};

type SubscriptionsClientProps = {
  userEmail: string;
  subscriptions: SubscriptionRecord[];
  resultMessage: ActionResultMessage | null;
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (formData: FormData) => Promise<void>;
  deactivateAction: (formData: FormData) => Promise<void>;
};

const BILLING_INTERVAL_OPTIONS: BillingIntervalOption[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "CUSTOM", label: "Custom" },
];

function formatAmount(amountCents: number, currency: string): string {
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

function toDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function compareByNextBillingDate(first: SubscriptionRecord, second: SubscriptionRecord): number {
  const firstTime = first.nextBillingDate ? new Date(first.nextBillingDate).getTime() : Number.POSITIVE_INFINITY;
  const secondTime = second.nextBillingDate ? new Date(second.nextBillingDate).getTime() : Number.POSITIVE_INFINITY;
  return firstTime - secondTime;
}

export default function SubscriptionsClient({
  userEmail,
  subscriptions,
  resultMessage,
  createAction,
  updateAction,
  deactivateAction,
}: SubscriptionsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"next" | "amount_desc" | "amount_asc" | "name">("next");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);

  const activeCount = subscriptions.filter((subscription) => subscription.isActive).length;
  const inactiveCount = subscriptions.length - activeCount;

  const editingSubscription = useMemo(() => {
    if (!editingSubscriptionId) {
      return null;
    }

    return subscriptions.find((subscription) => subscription.id === editingSubscriptionId) ?? null;
  }, [editingSubscriptionId, subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = subscriptions.filter((subscription) => {
      if (statusFilter === "active" && !subscription.isActive) {
        return false;
      }

      if (statusFilter === "inactive" && subscription.isActive) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableParts = [
        subscription.name,
        subscription.provider ?? "",
        subscription.currency,
        subscription.billingInterval,
      ];

      return searchableParts.some((part) => part.toLowerCase().includes(normalizedQuery));
    });

    if (sortBy === "name") {
      return filtered.sort((first, second) => first.name.localeCompare(second.name));
    }

    if (sortBy === "amount_desc") {
      return filtered.sort((first, second) => second.amountCents - first.amountCents);
    }

    if (sortBy === "amount_asc") {
      return filtered.sort((first, second) => first.amountCents - second.amountCents);
    }

    return filtered.sort(compareByNextBillingDate);
  }, [searchQuery, statusFilter, sortBy, subscriptions]);

  useEffect(() => {
    if (!isAddModalOpen && !editingSubscriptionId) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      setIsAddModalOpen(false);
      setEditingSubscriptionId(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isAddModalOpen, editingSubscriptionId]);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Subscriptions</p>
          <h1>Recurring billing management</h1>
          <p className="page-lead">Signed in as {userEmail}. Add, update, and deactivate plans from one workspace.</p>
        </div>
        <div className="inline-actions">
          <button onClick={() => setIsAddModalOpen(true)} type="button">
            Add Subscription
          </button>
        </div>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Total</span>
          <strong className="metric-value">{subscriptions.length}</strong>
          <span className="metric-note">All subscriptions</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Active</span>
          <strong className="metric-value">{activeCount}</strong>
          <span className="metric-note">Currently billing</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Inactive</span>
          <strong className="metric-value">{inactiveCount}</strong>
          <span className="metric-note">Archived plans</span>
        </article>
      </section>

      {resultMessage ? (
        <p className={resultMessage.type === "error" ? "status-error" : "status-help"}>{resultMessage.text}</p>
      ) : null}

      <article className="surface">
        <div className="control-grid">
          <label className="form-field">
            Search
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Name, provider, currency..."
              type="text"
              value={searchQuery}
            />
          </label>
          <label className="form-field">
            Status
            <select
              onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
              value={statusFilter}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="form-field">
            Sort by
            <select
              onChange={(event) => setSortBy(event.target.value as "next" | "amount_desc" | "amount_asc" | "name")}
              value={sortBy}
            >
              <option value="next">Next billing date</option>
              <option value="amount_desc">Amount (high to low)</option>
              <option value="amount_asc">Amount (low to high)</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label className="form-field">
            View
            <input readOnly type="text" value={`${filteredSubscriptions.length} shown`} />
          </label>
        </div>
      </article>

      {filteredSubscriptions.length === 0 ? (
        <p className="status-help">
          No subscriptions match your filters. Clear search/filter controls or add a new subscription.
        </p>
      ) : (
        <section className="subscription-cards">
          {filteredSubscriptions.map((subscription) => (
            <article className="surface subscription-card" key={subscription.id}>
              <div className="subscription-header">
                <h2>{subscription.name}</h2>
                <span className={subscription.isActive ? "pill pill-ok" : "pill pill-fail"}>
                  {subscription.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <p className="subscription-meta">{formatAmount(subscription.amountCents, subscription.currency)}</p>
              <p className="text-muted">
                Interval: {subscription.billingInterval.toLowerCase()} - Next billing: {formatDate(subscription.nextBillingDate)}
              </p>
              <p className="text-muted">
                Provider: {subscription.provider?.trim() ? subscription.provider : "Not specified"}
              </p>
              <div className="inline-actions mt-md">
                <button className="button button-secondary" onClick={() => setEditingSubscriptionId(subscription.id)} type="button">
                  Edit
                </button>
                {subscription.isActive ? (
                  <form
                    action={deactivateAction}
                    onSubmit={(event) => {
                      const confirmed = window.confirm("Deactivate this subscription?");

                      if (!confirmed) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input name="subscriptionId" type="hidden" value={subscription.id} />
                    <PendingSubmitButton
                      className="button-danger"
                      idleLabel="Deactivate"
                      pendingLabel="Deactivating..."
                    />
                  </form>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}

      {isAddModalOpen ? (
        <div
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setIsAddModalOpen(false)}
          role="dialog"
        >
          <article className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <p className="eyebrow">New Subscription</p>
                <h2>Add Subscription</h2>
              </div>
              <button className="button button-secondary button-small" onClick={() => setIsAddModalOpen(false)} type="button">
                Close
              </button>
            </header>
            <form action={createAction} className="form-grid">
              <PendingFieldset className="form-grid form-pending-group">
                <label className="form-field">
                  Name
                  <input maxLength={120} name="name" placeholder="Netflix" required type="text" />
                </label>
                <label className="form-field">
                  Provider (optional)
                  <input maxLength={120} name="provider" placeholder="Netflix, Inc." type="text" />
                </label>
                <div className="split-grid">
                  <label className="form-field">
                    Amount
                    <input inputMode="decimal" min="0.01" name="amount" required step="0.01" type="number" />
                  </label>
                  <label className="form-field">
                    Currency
                    <input defaultValue="USD" maxLength={3} minLength={3} name="currency" required type="text" />
                  </label>
                </div>
                <div className="split-grid">
                  <label className="form-field">
                    Billing interval
                    <select defaultValue="MONTHLY" name="billingInterval" required>
                      {BILLING_INTERVAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    Next billing date (optional)
                    <input name="nextBillingDate" type="date" />
                  </label>
                </div>
                <div className="inline-actions">
                  <PendingSubmitButton idleLabel="Create Subscription" pendingLabel="Creating Subscription..." />
                  <button className="button button-secondary" onClick={() => setIsAddModalOpen(false)} type="button">
                    Cancel
                  </button>
                </div>
              </PendingFieldset>
            </form>
          </article>
        </div>
      ) : null}

      {editingSubscription ? (
        <div
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setEditingSubscriptionId(null)}
          role="dialog"
        >
          <article className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <p className="eyebrow">Edit Subscription</p>
                <h2>{editingSubscription.name}</h2>
              </div>
              <button className="button button-secondary button-small" onClick={() => setEditingSubscriptionId(null)} type="button">
                Close
              </button>
            </header>
            <form action={updateAction} className="form-grid">
              <input name="subscriptionId" type="hidden" value={editingSubscription.id} />
              <PendingFieldset className="form-grid form-pending-group">
                <label className="form-field">
                  Name
                  <input defaultValue={editingSubscription.name} maxLength={120} name="name" required type="text" />
                </label>
                <label className="form-field">
                  Provider (optional)
                  <input defaultValue={editingSubscription.provider ?? ""} maxLength={120} name="provider" type="text" />
                </label>
                <div className="split-grid">
                  <label className="form-field">
                    Amount
                    <input
                      defaultValue={(editingSubscription.amountCents / 100).toFixed(2)}
                      inputMode="decimal"
                      min="0.01"
                      name="amount"
                      required
                      step="0.01"
                      type="number"
                    />
                  </label>
                  <label className="form-field">
                    Currency
                    <input
                      defaultValue={editingSubscription.currency}
                      maxLength={3}
                      minLength={3}
                      name="currency"
                      required
                      type="text"
                    />
                  </label>
                </div>
                <div className="split-grid">
                  <label className="form-field">
                    Billing interval
                    <select defaultValue={editingSubscription.billingInterval} name="billingInterval" required>
                      {BILLING_INTERVAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    Next billing date (optional)
                    <input
                      defaultValue={toDateInputValue(editingSubscription.nextBillingDate)}
                      name="nextBillingDate"
                      type="date"
                    />
                  </label>
                </div>
                <div className="inline-actions">
                  <PendingSubmitButton idleLabel="Save Changes" pendingLabel="Saving Changes..." />
                  <button className="button button-secondary" onClick={() => setEditingSubscriptionId(null)} type="button">
                    Cancel
                  </button>
                </div>
              </PendingFieldset>
            </form>
          </article>
        </div>
      ) : null}
    </section>
  );
}
