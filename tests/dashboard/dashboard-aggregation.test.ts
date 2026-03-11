import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  DASHBOARD_RENEWALS_WINDOW_DAYS,
  DASHBOARD_UPCOMING_RENEWALS_WINDOW_DAYS,
  type DashboardSubscriptionSourceRecord,
  buildDashboardPayload,
} from "../../lib/dashboard";

function makeSubscription(
  overrides: Partial<DashboardSubscriptionSourceRecord> & Pick<DashboardSubscriptionSourceRecord, "id" | "name">,
): DashboardSubscriptionSourceRecord {
  const { id, name, ...rest } = overrides;

  return {
    amountCents: 1000,
    currency: "usd",
    billingInterval: "MONTHLY",
    nextBillingDate: new Date("2026-03-20T00:00:00.000Z"),
    isActive: true,
    paymentMethod: "Visa 1234",
    signedUpBy: null,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    ...rest,
    id,
    name,
  };
}

describe("buildDashboardPayload", () => {
  test("handles an empty subscription list", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");
    const payload = buildDashboardPayload([], now);

    assert.equal(payload.generatedAt, now.toISOString());
    assert.equal(payload.kpis.subscriptions.total, 0);
    assert.equal(payload.kpis.subscriptions.active, 0);
    assert.equal(payload.kpis.subscriptions.canceled, 0);
    assert.equal(payload.kpis.renewalsInNext7Days, 0);
    assert.equal(payload.kpis.monthlyEquivalentSpend.amountCents, null);
    assert.equal(payload.kpis.annualProjection.amountCents, null);
    assert.deepEqual(payload.spendBreakdownByCategory, []);
    assert.deepEqual(payload.attentionNeeded, []);
    assert.deepEqual(payload.upcomingRenewals, []);
    assert.deepEqual(payload.topCostDrivers, []);
    assert.deepEqual(payload.potentialSavings.opportunities, []);
    assert.deepEqual(payload.recentSubscriptions, []);
    assert.equal(payload.nextCharge, null);
  });

  test("uses explicit next-7 and next-30-day windows and excludes custom cadence from normalized totals", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");
    const inSevenDays = new Date(now.getTime() + DASHBOARD_RENEWALS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const justAfterSevenDays = new Date(inSevenDays.getTime() + 1);
    const inThirtyDays = new Date(now.getTime() + DASHBOARD_UPCOMING_RENEWALS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const justAfterThirtyDays = new Date(inThirtyDays.getTime() + 1);

    const payload = buildDashboardPayload(
      [
        makeSubscription({
          id: "monthly",
          name: "Notion",
          amountCents: 1000,
          billingInterval: "MONTHLY",
          nextBillingDate: inSevenDays,
        }),
        makeSubscription({
          id: "yearly",
          name: "Cloudflare",
          amountCents: 12000,
          billingInterval: "YEARLY",
          nextBillingDate: inThirtyDays,
        }),
        makeSubscription({
          id: "weekly",
          name: "Gym",
          amountCents: 500,
          billingInterval: "WEEKLY",
          nextBillingDate: justAfterSevenDays,
        }),
        makeSubscription({
          id: "custom",
          name: "Other Service",
          amountCents: 700,
          billingInterval: "CUSTOM",
          nextBillingDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        }),
        makeSubscription({
          id: "outside-window",
          name: "Beyond Window",
          amountCents: 2500,
          billingInterval: "MONTHLY",
          nextBillingDate: justAfterThirtyDays,
        }),
      ],
      now,
    );

    assert.equal(payload.kpis.renewalsInNext7Days, 2);
    assert.equal(payload.upcomingRenewals.length, 4);
    assert.equal(payload.kpis.monthlyEquivalentSpend.currency, "USD");
    assert.equal(payload.kpis.monthlyEquivalentSpend.amountCents, 6665);
    assert.equal(payload.kpis.annualProjection.amountCents, 80000);
    assert.equal(payload.kpis.monthlyEquivalentSpend.excludedCustomCadenceCount, 1);
    assert.equal(payload.kpis.annualProjection.excludedCustomCadenceCount, 1);
    assert.equal(payload.attentionNeeded.some((item) => item.type === "annual_renewal_soon"), true);
  });

  test("does not merge mixed currencies into a single normalized KPI total", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");

    const payload = buildDashboardPayload(
      [
        makeSubscription({ id: "usd", name: "GitHub", amountCents: 1000, currency: "usd" }),
        makeSubscription({ id: "aud", name: "Canva", amountCents: 2000, currency: "aud" }),
      ],
      now,
    );

    assert.equal(payload.kpis.monthlyEquivalentSpend.amountCents, null);
    assert.equal(payload.kpis.monthlyEquivalentSpend.currency, null);
    assert.equal(payload.kpis.monthlyEquivalentSpend.totalsByCurrency.length, 2);
    assert.deepEqual(payload.kpis.monthlyEquivalentSpend.totalsByCurrency.map((entry) => entry.currency), ["AUD", "USD"]);
  });

  test("keeps canceled subscriptions in counts while excluding them from active spend and cost drivers", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");

    const payload = buildDashboardPayload(
      [
        makeSubscription({ id: "active", name: "Netlify", amountCents: 3000, isActive: true }),
        makeSubscription({ id: "inactive", name: "Old Tool", amountCents: 9000, isActive: false }),
      ],
      now,
    );

    assert.equal(payload.kpis.subscriptions.total, 2);
    assert.equal(payload.kpis.subscriptions.active, 1);
    assert.equal(payload.kpis.subscriptions.canceled, 1);
    assert.equal(payload.kpis.monthlyEquivalentSpend.amountCents, 3000);
    assert.deepEqual(payload.topCostDrivers.map((driver) => driver.id), ["active"]);
  });

  test("builds duplicate-service alerts and savings opportunities deterministically", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");

    const payload = buildDashboardPayload(
      [
        makeSubscription({ id: "stream-a", name: "Netflix", amountCents: 1000, currency: "usd" }),
        makeSubscription({ id: "stream-b", name: "Netflix", amountCents: 2200, currency: "usd" }),
        makeSubscription({ id: "stream-c", name: "Netflix", amountCents: 1800, currency: "usd" }),
      ],
      now,
    );

    assert.equal(payload.attentionNeeded.some((item) => item.type === "potential_duplicate"), true);
    assert.equal(payload.potentialSavings.opportunities.length, 1);
    assert.equal(payload.potentialSavings.currency, "USD");
    assert.equal(payload.potentialSavings.estimatedMonthlySavingsCents, 4000);
    assert.deepEqual(payload.potentialSavings.opportunities[0]?.subscriptionIds, ["stream-c", "stream-b"]);
  });
});
