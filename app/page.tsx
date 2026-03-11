import Link from "next/link";

import DashboardSectionsClient from "@/app/DashboardSectionsClient";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardPayloadForUser } from "@/lib/dashboard";

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

  const dashboardPayload = await getDashboardPayloadForUser(user.id);
  const availableCurrencies = [
    ...new Set([
      ...dashboardPayload.kpis.monthlyEquivalentSpend.totalsByCurrency.map((entry) => entry.currency),
      ...dashboardPayload.spendBreakdownByCategory.flatMap((entry) =>
        entry.totalsByCurrency.map((total) => total.currency),
      ),
      ...dashboardPayload.upcomingRenewals.map((entry) => entry.currency),
      ...dashboardPayload.recentSubscriptions.map((entry) => entry.currency),
    ]),
  ];

  return (
    <section className="page-stack">
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Dashboard</p>
          <h1>Subscription overview</h1>
          <p className="page-lead">
            Signed in as {user.email}. Use the control bar to scope dashboard sections by currency, date range, and search.
          </p>
        </div>
      </header>

      <DashboardSectionsClient
        availableCurrencies={availableCurrencies}
        monthlySpendTotalsByCurrency={dashboardPayload.kpis.monthlyEquivalentSpend.totalsByCurrency.map((entry) => ({
          currency: entry.currency,
          monthlyEquivalentSpendCents: entry.monthlyEquivalentSpendCents,
        }))}
        recentSubscriptions={dashboardPayload.recentSubscriptions.map((subscription) => ({
          id: subscription.id,
          name: subscription.name,
          isActive: subscription.isActive,
          amountCents: subscription.amountCents,
          currency: subscription.currency,
          createdAt: subscription.createdAt,
        }))}
        upcomingCharges={dashboardPayload.upcomingRenewals.map((subscription) => ({
          id: subscription.id,
          name: subscription.name,
          isActive: subscription.isActive,
          amountCents: subscription.amountCents,
          currency: subscription.currency,
          paymentMethod: subscription.paymentMethod,
          renewalDate: subscription.renewalDate,
          createdAt: subscription.createdAt,
          tag: subscription.tag,
        }))}
        spendBreakdownByCategory={dashboardPayload.spendBreakdownByCategory.map((category) => ({
          category: category.category,
          subscriptionCount: category.subscriptionCount,
          totalsByCurrency: category.totalsByCurrency.map((total) => ({
            currency: total.currency,
            monthlyEquivalentSpendCents: total.monthlyEquivalentSpendCents,
          })),
        }))}
      />
    </section>
  );
}
