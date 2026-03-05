import { requireAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

import {
  createSubscriptionAction,
  deactivateSubscriptionAction,
  updateSubscriptionAction,
} from "./actions";

type SubscriptionsPageProps = {
  searchParams?: {
    error?: string;
    result?: string;
  };
};

type BillingIntervalOption = {
  value: "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  label: string;
};

const BILLING_INTERVAL_OPTIONS: BillingIntervalOption[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "CUSTOM", label: "Custom" },
];

function formatAmount(amountCents: number, currency: string): string {
  return (amountCents / 100).toFixed(2) + ` ${currency}`;
}

function toDateInputValue(value: Date | null): string {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function getResultMessage(searchParams?: SubscriptionsPageProps["searchParams"]): {
  type: "error" | "success";
  text: string;
} | null {
  if (!searchParams) {
    return null;
  }

  if (searchParams.error === "invalid_request") {
    return {
      type: "error",
      text: "Invalid subscriptions request. Please retry from this page.",
    };
  }

  if (searchParams.error === "invalid_fields") {
    return {
      type: "error",
      text: "Invalid subscription details. Check amount, currency, and billing fields.",
    };
  }

  if (searchParams.error === "not_found") {
    return {
      type: "error",
      text: "Subscription not found or not accessible for this account.",
    };
  }

  if (searchParams.result === "created") {
    return {
      type: "success",
      text: "Subscription created.",
    };
  }

  if (searchParams.result === "updated") {
    return {
      type: "success",
      text: "Subscription updated.",
    };
  }

  if (searchParams.result === "deactivated") {
    return {
      type: "success",
      text: "Subscription deactivated.",
    };
  }

  return null;
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const user = await requireAuthenticatedUser();
  const resultMessage = getResultMessage(searchParams);
  const subscriptions = await db.subscription.findMany({
    where: {
      userId: user.id,
    },
    orderBy: [{ isActive: "desc" }, { nextBillingDate: "asc" }, { createdAt: "desc" }],
  });
  const activeCount = subscriptions.filter((subscription) => subscription.isActive).length;
  const inactiveCount = subscriptions.length - activeCount;

  return (
    <section className="page-stack">
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Subscriptions</p>
          <h1>Recurring billing management</h1>
          <p className="page-lead">Signed in as {user.email}. Add, update, and deactivate plans from one workspace.</p>
        </div>
        <div className="metric-grid">
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
        </div>
      </header>

      {resultMessage ? (
        <p className={resultMessage.type === "error" ? "status-error" : "status-help"}>{resultMessage.text}</p>
      ) : null}

      <article className="surface">
        <h2>Add Subscription</h2>
        <form className="form-grid" action={createSubscriptionAction}>
          <label className="form-field">
            Name
            <input name="name" type="text" maxLength={120} placeholder="Netflix" required />
          </label>
          <label className="form-field">
            Provider (optional)
            <input name="provider" type="text" maxLength={120} placeholder="Netflix, Inc." />
          </label>
          <div className="split-grid">
            <label className="form-field">
              Amount
              <input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required />
            </label>
            <label className="form-field">
              Currency (3-letter ISO)
              <input name="currency" type="text" minLength={3} maxLength={3} defaultValue="USD" required />
            </label>
          </div>
          <div className="split-grid">
            <label className="form-field">
              Billing interval
              <select name="billingInterval" defaultValue="MONTHLY" required>
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
          <div>
            <button type="submit">Create Subscription</button>
          </div>
        </form>
      </article>

      {subscriptions.length === 0 ? (
        <p className="status-help">No subscriptions yet. Add your first subscription above to start tracking recurring spend.</p>
      ) : (
        <div className="subscriptions-list">
          {subscriptions.map((subscription) => (
            <article className="surface" key={subscription.id}>
              <div className="subscription-header">
                <h2>{subscription.name}</h2>
                <span className={subscription.isActive ? "pill pill-ok" : "pill pill-fail"}>
                  {subscription.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <p className="subscription-meta">Current amount: {formatAmount(subscription.amountCents, subscription.currency)}</p>
              <form className="form-grid" action={updateSubscriptionAction}>
                <input name="subscriptionId" type="hidden" value={subscription.id} />
                <label className="form-field">
                  Name
                  <input name="name" type="text" maxLength={120} defaultValue={subscription.name} required />
                </label>
                <label className="form-field">
                  Provider (optional)
                  <input name="provider" type="text" maxLength={120} defaultValue={subscription.provider ?? ""} />
                </label>
                <div className="split-grid">
                  <label className="form-field">
                    Amount
                    <input
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      defaultValue={(subscription.amountCents / 100).toFixed(2)}
                      required
                    />
                  </label>
                  <label className="form-field">
                    Currency (3-letter ISO)
                    <input
                      name="currency"
                      type="text"
                      minLength={3}
                      maxLength={3}
                      defaultValue={subscription.currency}
                      required
                    />
                  </label>
                </div>
                <div className="split-grid">
                  <label className="form-field">
                    Billing interval
                    <select name="billingInterval" defaultValue={subscription.billingInterval} required>
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
                      name="nextBillingDate"
                      type="date"
                      defaultValue={toDateInputValue(subscription.nextBillingDate)}
                    />
                  </label>
                </div>
                <div className="inline-actions">
                  <button type="submit">Save Changes</button>
                </div>
              </form>
              {subscription.isActive ? (
                <form action={deactivateSubscriptionAction}>
                  <input name="subscriptionId" type="hidden" value={subscription.id} />
                  <button className="button-danger" type="submit">
                    Deactivate
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
