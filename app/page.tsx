import Link from "next/link";

import DashboardSectionsClient from "@/app/DashboardSectionsClient";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function estimateMonthlyAmountCents(subscription: { amountCents: number; billingInterval: string }): number {
  if (subscription.billingInterval === "YEARLY") {
    return Math.round(subscription.amountCents / 12);
  }

  if (subscription.billingInterval === "WEEKLY") {
    return Math.round(subscription.amountCents * 4.33);
  }

  return subscription.amountCents;
}

function formatMoney(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="page-stack">
        <header className="page-header">
          <div className="stack">
            <p className="eyebrow">Subscription Intelligence</p>
            <h1>Track recurring spend with confidence.</h1>
            <p className="page-lead">
              Sub Stalker gives you one clean workspace for upcoming charges, account settings, and operational tools.
            </p>
          </div>
          <div className="inline-actions">
            <Link className="button" href="/auth/sign-up">
              Create Account
            </Link>
            <Link className="button button-secondary" href="/auth/sign-in">
              Sign In
            </Link>
          </div>
        </header>
        <div className="split-grid">
          <article className="surface">
            <h2>What you get</h2>
            <ul className="stack text-muted">
              <li>Unified subscription tracking and renewal visibility.</li>
              <li>Account-level settings for reminders and default currency.</li>
              <li>System status and maintenance controls for operations.</li>
            </ul>
          </article>
          <article className="surface surface-soft">
            <h2>Get started in 2 steps</h2>
            <ol className="stack text-muted">
              <li>Create your account.</li>
              <li>Add your first subscription from the subscriptions page.</li>
            </ol>
          </article>
        </div>
      </section>
    );
  }

  const subscriptions = await db.subscription.findMany({
    where: {
      userId: user.id,
    },
    orderBy: [{ isActive: "desc" }, { nextBillingDate: "asc" }, { createdAt: "desc" }],
  });

  const activeSubscriptions = subscriptions.filter((subscription) => subscription.isActive);
  const estimatedMonthlySpendCents = activeSubscriptions.reduce(
    (total, subscription) => total + estimateMonthlyAmountCents(subscription),
    0,
  );
  const activeCurrencies = new Set(activeSubscriptions.map((subscription) => subscription.currency));
  const monthlySpendDisplay =
    activeSubscriptions.length === 0
      ? "n/a"
      : activeCurrencies.size === 1
      ? formatMoney(estimatedMonthlySpendCents, activeSubscriptions[0].currency)
      : "Mixed currencies";

  const nextCharge = activeSubscriptions
    .filter((subscription) => subscription.nextBillingDate !== null)
    .sort((first, second) => {
      return (
        (first.nextBillingDate?.getTime() ?? Number.POSITIVE_INFINITY) -
        (second.nextBillingDate?.getTime() ?? Number.POSITIVE_INFINITY)
      );
    })[0];

  const upcomingCharges = activeSubscriptions
    .filter((subscription) => subscription.nextBillingDate !== null)
    .slice(0, 5);

  const recentSubscriptions = [...subscriptions]
    .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime())
    .slice(0, 5);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Dashboard</p>
          <h1>Subscription overview</h1>
          <p className="page-lead">Signed in as {user.email}. Review upcoming charges and recent account activity.</p>
        </div>
        <div className="inline-actions">
          <Link className="button" href="/subscriptions">
            Manage Subscriptions
          </Link>
          <Link className="button button-secondary" href="/settings">
            Preferences
          </Link>
        </div>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Active Subscriptions</span>
          <strong className="metric-value">{activeSubscriptions.length}</strong>
          <span className="metric-note">Currently billing</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Estimated Monthly Spend</span>
          <strong className="metric-value">{monthlySpendDisplay}</strong>
          <span className="metric-note">Normalized from all active plans</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Next Charge</span>
          <strong className="metric-value">
            {nextCharge ? formatMoney(nextCharge.amountCents, nextCharge.currency) : "n/a"}
          </strong>
          <span className="metric-note">
            {nextCharge?.nextBillingDate ? `${nextCharge.name} on ${formatDate(nextCharge.nextBillingDate)}` : "No date set"}
          </span>
        </article>
      </section>

      <DashboardSectionsClient
        recentSubscriptions={recentSubscriptions.map((subscription) => ({
          id: subscription.id,
          name: subscription.name,
          isActive: subscription.isActive,
          amountCents: subscription.amountCents,
          currency: subscription.currency,
          nextBillingDate: subscription.nextBillingDate ? subscription.nextBillingDate.toISOString() : null,
          createdAt: subscription.createdAt.toISOString(),
        }))}
        upcomingCharges={upcomingCharges.map((subscription) => ({
          id: subscription.id,
          name: subscription.name,
          isActive: subscription.isActive,
          amountCents: subscription.amountCents,
          currency: subscription.currency,
          nextBillingDate: subscription.nextBillingDate ? subscription.nextBillingDate.toISOString() : null,
          createdAt: subscription.createdAt.toISOString(),
        }))}
      />

      <article className="surface">
        <h2>Quick Actions</h2>
        <div className="inline-actions mt-sm">
          <Link className="button" href="/subscriptions">
            Add or Update Subscriptions
          </Link>
          <Link className="button button-secondary" href="/tools">
            Run Maintenance Tools
          </Link>
          <Link className="button button-secondary" href="/status">
            View System Status
          </Link>
        </div>
      </article>
    </section>
  );
}
