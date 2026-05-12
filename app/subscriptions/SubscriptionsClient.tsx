"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import CurrencySelectControl from "@/app/components/CurrencySelectControl";
import SubscriptionDetailsModal from "@/app/components/SubscriptionDetailsModal";
import { PendingFieldset, PendingSubmitButton } from "@/app/components/PendingFormControls";
import { useSubscriptionDetailsModal } from "@/app/components/useSubscriptionDetailsModal";

type ActionResultMessage = {
  type: "error" | "success";
  text: string;
};

type SubscriptionRecord = {
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
  paymentMethodSuggestions: string[];
  signedUpBySuggestions: string[];
  resultMessage: ActionResultMessage | null;
  updateSuccessToken: string | null;
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

const SubscriptionNotesEditor = dynamic(() => import("./SubscriptionNotesEditor"), {
  ssr: false,
});

function normalizeOptionalValue(value: string | null): string {
  return value?.trim() ?? "";
}

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

function buildOptionSet(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function eventTargetsInteractiveElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("a, button, input, select, textarea, form"));
}

export default function SubscriptionsClient({
  userEmail,
  subscriptions,
  paymentMethodSuggestions,
  signedUpBySuggestions,
  resultMessage,
  updateSuccessToken,
  createAction,
  updateAction,
  deactivateAction,
}: SubscriptionsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"next" | "amount_desc" | "amount_asc" | "name">("next");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [signedUpByFilter, setSignedUpByFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const detailsModal = useSubscriptionDetailsModal();

  const paymentMethodOptions = useMemo(
    () =>
      buildOptionSet([
        ...paymentMethodSuggestions,
        ...subscriptions.map((subscription) => subscription.paymentMethod),
      ]),
    [paymentMethodSuggestions, subscriptions],
  );
  const signedUpByOptions = useMemo(
    () =>
      buildOptionSet([
        ...signedUpBySuggestions,
        ...subscriptions.map((subscription) => subscription.signedUpBy ?? ""),
      ]),
    [signedUpBySuggestions, subscriptions],
  );

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

      if (paymentMethodFilter !== "all" && subscription.paymentMethod !== paymentMethodFilter) {
        return false;
      }

      const normalizedSignedUpBy = subscription.signedUpBy?.trim() ?? "";
      if (signedUpByFilter !== "all" && normalizedSignedUpBy !== signedUpByFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableParts = [
        subscription.name,
        subscription.paymentMethod,
        subscription.signedUpBy ?? "",
        subscription.billingConsoleUrl ?? "",
        subscription.cancelSubscriptionUrl ?? "",
        subscription.billingHistoryUrl ?? "",
        subscription.notesMarkdown ?? "",
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
  }, [searchQuery, statusFilter, sortBy, paymentMethodFilter, signedUpByFilter, subscriptions]);

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

  useEffect(() => {
    if (!updateSuccessToken) {
      return;
    }

    setEditingSubscriptionId(null);
  }, [updateSuccessToken]);

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
      <datalist id="payment-method-options">
        {paymentMethodOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="signed-up-by-options">
        {signedUpByOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <article className="surface">
        <div className="control-grid">
          <label className="form-field">
            Search
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Name, payment method, signed up by..."
              type="text"
              value={searchQuery}
            />
          </label>
          <label className="form-field">
            Payment method
            <select onChange={(event) => setPaymentMethodFilter(event.target.value)} value={paymentMethodFilter}>
              <option value="all">All</option>
              {paymentMethodOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            Signed up by
            <select onChange={(event) => setSignedUpByFilter(event.target.value)} value={signedUpByFilter}>
              <option value="all">All</option>
              {signedUpByOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
            <article
              className="surface subscription-card subscription-card-clickable"
              key={subscription.id}
              onClick={(event) => {
                if (eventTargetsInteractiveElement(event.target)) {
                  return;
                }

                void detailsModal.openModal({
                  subscriptionId: subscription.id,
                  source: "subscriptions_list",
                });
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                  return;
                }

                if (eventTargetsInteractiveElement(event.target)) {
                  return;
                }

                event.preventDefault();
                void detailsModal.openModal({
                  subscriptionId: subscription.id,
                  source: "subscriptions_list",
                });
              }}
              role="button"
              tabIndex={0}
            >
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
                Payment method: {subscription.paymentMethod}
              </p>
              <p className="text-muted">
                Signed up by: {subscription.signedUpBy?.trim() ? subscription.signedUpBy : "Not specified"}
              </p>
              <p className="text-muted">
                Billing console:{" "}
                {subscription.billingConsoleUrl ? (
                  <a className="subscription-link" href={subscription.billingConsoleUrl} rel="noreferrer noopener" target="_blank">
                    Open
                  </a>
                ) : (
                  "Not set"
                )}
              </p>
              <p className="text-muted">
                Cancel subscription:{" "}
                {subscription.cancelSubscriptionUrl ? (
                  <a className="subscription-link" href={subscription.cancelSubscriptionUrl} rel="noreferrer noopener" target="_blank">
                    Open
                  </a>
                ) : (
                  "Not set"
                )}
              </p>
              <p className="text-muted">
                Billing history:{" "}
                {subscription.billingHistoryUrl ? (
                  <a className="subscription-link" href={subscription.billingHistoryUrl} rel="noreferrer noopener" target="_blank">
                    Open
                  </a>
                ) : (
                  "Not set"
                )}
              </p>
              {subscription.notesMarkdown ? (
                <p className="text-muted">Notes saved ({subscription.notesMarkdown.length} chars)</p>
              ) : (
                <p className="text-muted">Notes: Not set</p>
              )}
              <div className="inline-actions mt-md">
                <button
                  className="button button-secondary"
                  onClick={() => setEditingSubscriptionId(subscription.id)}
                  type="button"
                >
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

      <SubscriptionDetailsModal
        actionMessage={detailsModal.actionMessage}
        details={detailsModal.details}
        errorMessage={detailsModal.errorMessage}
        isOpen={detailsModal.isOpen}
        loadState={detailsModal.fetchState}
        onClose={detailsModal.closeModal}
        onEditSubscription={(subscriptionId) => {
          detailsModal.closeModal("close_button");
          setEditingSubscriptionId(subscriptionId);
        }}
        onRetry={detailsModal.retryLoad}
        onRunMutationAction={detailsModal.runMutationAction}
        onViewFullHistoryClick={detailsModal.trackViewFullHistory}
        pendingActionKey={detailsModal.pendingActionKey}
        source={detailsModal.source}
      />

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
                  Payment method
                  <input
                    list="payment-method-options"
                    maxLength={120}
                    name="paymentMethod"
                    placeholder="Family Credit Card"
                    required
                    type="text"
                  />
                </label>
                <label className="form-field">
                  Signed up by (optional)
                  <input
                    list="signed-up-by-options"
                    maxLength={120}
                    name="signedUpBy"
                    placeholder="Me"
                    type="text"
                  />
                </label>
                <label className="form-field">
                  Billing console / manage plan URL (optional)
                  <input
                    inputMode="url"
                    name="billingConsoleUrl"
                    placeholder="https://..."
                    type="url"
                  />
                </label>
                <label className="form-field">
                  Cancel subscription URL (optional)
                  <input
                    inputMode="url"
                    name="cancelSubscriptionUrl"
                    placeholder="https://..."
                    type="url"
                  />
                </label>
                <label className="form-field">
                  Billing history URL (optional)
                  <input
                    inputMode="url"
                    name="billingHistoryUrl"
                    placeholder="https://..."
                    type="url"
                  />
                </label>
                <SubscriptionNotesEditor label="Notes and comments (markdown)" name="notesMarkdown" />
                <div className="split-grid">
                  <label className="form-field">
                    Amount
                    <input inputMode="decimal" min="0.01" name="amount" required step="0.01" type="number" />
                  </label>
                  <label className="form-field">
                    Currency
                    <CurrencySelectControl name="currency" required />
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
            </header>
            <form action={updateAction} className="form-grid">
              <input name="subscriptionId" type="hidden" value={editingSubscription.id} />
              <PendingFieldset className="form-grid form-pending-group">
                <label className="form-field">
                  Name
                  <input defaultValue={editingSubscription.name} maxLength={120} name="name" required type="text" />
                </label>
                <label className="form-field">
                  Payment method
                  <input
                    defaultValue={editingSubscription.paymentMethod}
                    list="payment-method-options"
                    maxLength={120}
                    name="paymentMethod"
                    required
                    type="text"
                  />
                </label>
                <label className="form-field">
                  Signed up by (optional)
                  <input
                    defaultValue={editingSubscription.signedUpBy ?? ""}
                    list="signed-up-by-options"
                    maxLength={120}
                    name="signedUpBy"
                    type="text"
                  />
                </label>
                <label className="form-field">
                  Billing console / manage plan URL (optional)
                  <input
                    defaultValue={normalizeOptionalValue(editingSubscription.billingConsoleUrl)}
                    inputMode="url"
                    name="billingConsoleUrl"
                    placeholder="https://..."
                    type="url"
                  />
                </label>
                <label className="form-field">
                  Cancel subscription URL (optional)
                  <input
                    defaultValue={normalizeOptionalValue(editingSubscription.cancelSubscriptionUrl)}
                    inputMode="url"
                    name="cancelSubscriptionUrl"
                    placeholder="https://..."
                    type="url"
                  />
                </label>
                <label className="form-field">
                  Billing history URL (optional)
                  <input
                    defaultValue={normalizeOptionalValue(editingSubscription.billingHistoryUrl)}
                    inputMode="url"
                    name="billingHistoryUrl"
                    placeholder="https://..."
                    type="url"
                  />
                </label>
                <SubscriptionNotesEditor
                  initialValue={editingSubscription.notesMarkdown}
                  label="Notes and comments (markdown)"
                  name="notesMarkdown"
                />
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
                    <CurrencySelectControl defaultValue={editingSubscription.currency} name="currency" required />
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
