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

  return (
    <section className="card">
      <h1>Subscriptions</h1>
      <p>Signed in as {user.email}.</p>
      <p>Track recurring charges, renewal dates, and providers in one place.</p>
      {resultMessage ? (
        <p className={resultMessage.type === "error" ? "status-error" : "status-help"}>{resultMessage.text}</p>
      ) : null}

      <article className="status-item">
        <h2>Add Subscription</h2>
        <form className="form" action={createSubscriptionAction}>
          <label className="form-field">
            Name
            <input name="name" type="text" maxLength={120} required />
          </label>
          <label className="form-field">
            Provider (optional)
            <input name="provider" type="text" maxLength={120} />
          </label>
          <label className="form-field">
            Amount
            <input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required />
          </label>
          <label className="form-field">
            Currency (3-letter ISO)
            <input name="currency" type="text" minLength={3} maxLength={3} defaultValue="USD" required />
          </label>
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
          <button type="submit">Create Subscription</button>
        </form>
      </article>

      {subscriptions.length === 0 ? (
        <p className="status-help">
          No subscriptions yet. Add your first subscription above to start tracking recurring spend.
        </p>
      ) : (
        <div className="subscriptions-list">
          {subscriptions.map((subscription) => (
            <article className="status-item" key={subscription.id}>
              <div className="subscription-header">
                <h2>{subscription.name}</h2>
                <p className={subscription.isActive ? "status-ok" : "status-fail"}>
                  {subscription.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <p className="subscription-meta">
                Current amount: {formatAmount(subscription.amountCents, subscription.currency)}
              </p>
              <form className="form" action={updateSubscriptionAction}>
                <input name="subscriptionId" type="hidden" value={subscription.id} />
                <label className="form-field">
                  Name
                  <input name="name" type="text" maxLength={120} defaultValue={subscription.name} required />
                </label>
                <label className="form-field">
                  Provider (optional)
                  <input name="provider" type="text" maxLength={120} defaultValue={subscription.provider ?? ""} />
                </label>
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
                <button type="submit">Save Changes</button>
              </form>
              {subscription.isActive ? (
                <form action={deactivateSubscriptionAction}>
                  <input name="subscriptionId" type="hidden" value={subscription.id} />
                  <button className="danger-button" type="submit">
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
