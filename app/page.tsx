import Link from "next/link";

import DashboardCurrencyForm from "@/app/DashboardCurrencyForm";
import DashboardDataClient from "@/app/DashboardDataClient";
import { updateDashboardCurrencyAction } from "@/app/dashboard/actions";
import { getCurrentUser } from "@/lib/auth";
import { resolvePreferredCurrency } from "@/lib/currencies";
import { db } from "@/lib/db";

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

  const settings = await db.userSettings.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      defaultCurrency: true,
    },
  });

  const defaultCurrency = resolvePreferredCurrency(settings?.defaultCurrency);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Dashboard</p>
          <h1>Subscription overview</h1>
          <p className="page-lead">
            Signed in as {user.email}. Overview totals and comparisons use your site currency.
          </p>
        </div>
        <div className="inline-actions dashboard-header-actions">
          <DashboardCurrencyForm
            defaultCurrency={defaultCurrency}
            updateCurrencyAction={updateDashboardCurrencyAction}
          />
          <Link className="button" href="/subscriptions">
            Add Subscription
          </Link>
        </div>
      </header>

      <DashboardDataClient initialCurrency={defaultCurrency} />
    </section>
  );
}
