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
    assert.equal(payload.attentionNeeded.some((item) => item.type === "annual_renewal_approaching"), true);
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

  test("ranks top cost drivers by normalized monthly equivalent spend", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");

    const payload = buildDashboardPayload(
      [
        makeSubscription({ id: "monthly", name: "Monthly Plan", amountCents: 2100, billingInterval: "MONTHLY" }),
        makeSubscription({ id: "weekly", name: "Weekly Plan", amountCents: 500, billingInterval: "WEEKLY" }),
        makeSubscription({ id: "yearly", name: "Yearly Plan", amountCents: 24000, billingInterval: "YEARLY" }),
      ],
      now,
    );

    assert.deepEqual(payload.topCostDrivers.map((driver) => driver.id), ["weekly", "monthly", "yearly"]);
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

    assert.equal(payload.attentionNeeded.some((item) => item.type === "potential_duplicate_services"), true);
    assert.equal(payload.potentialSavings.opportunities.length, 1);
    assert.equal(payload.potentialSavings.currency, "USD");
    assert.equal(payload.potentialSavings.estimatedMonthlySavingsCents, 4000);
    assert.deepEqual(payload.potentialSavings.opportunities[0]?.subscriptionIds, ["stream-c", "stream-b"]);
  });

  test("includes potentially-unused savings candidates while preventing duplicate-group double counting", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");

    const payload = buildDashboardPayload(
      [
        makeSubscription({
          id: "duplicate-a",
          name: "Netflix",
          amountCents: 1000,
          createdAt: new Date("2025-06-01T00:00:00.000Z"),
          updatedAt: new Date("2025-10-01T00:00:00.000Z"),
          nextBillingDate: new Date("2026-03-20T00:00:00.000Z"),
        }),
        makeSubscription({
          id: "duplicate-b",
          name: "Netflix",
          amountCents: 2200,
          createdAt: new Date("2025-06-01T00:00:00.000Z"),
          updatedAt: new Date("2025-10-01T00:00:00.000Z"),
          nextBillingDate: new Date("2026-03-22T00:00:00.000Z"),
        }),
        makeSubscription({
          id: "unused-standalone",
          name: "Legacy Tool",
          amountCents: 3000,
          createdAt: new Date("2025-06-01T00:00:00.000Z"),
          updatedAt: new Date("2025-10-01T00:00:00.000Z"),
          nextBillingDate: new Date("2026-03-24T00:00:00.000Z"),
        }),
      ],
      now,
    );

    assert.deepEqual(
      payload.potentialSavings.opportunities.map((opportunity) => [opportunity.type, opportunity.subscriptionIds]),
      [
        ["potentially_unused_subscription", ["unused-standalone"]],
        ["duplicate_overlap", ["duplicate-b"]],
      ],
    );
    assert.equal(payload.potentialSavings.currency, "USD");
    assert.equal(payload.potentialSavings.estimatedMonthlySavingsCents, 5200);
  });

  test("builds promo-ending and potentially-unused alerts with actionable amount/date context", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");

    const payload = buildDashboardPayload(
      [
        makeSubscription({
          id: "promo-1",
          name: "Streaming Trial Promo",
          amountCents: 1299,
          billingInterval: "MONTHLY",
          createdAt: new Date("2026-02-20T00:00:00.000Z"),
          updatedAt: new Date("2026-03-01T00:00:00.000Z"),
          nextBillingDate: new Date("2026-03-14T00:00:00.000Z"),
        }),
        makeSubscription({
          id: "unused-1",
          name: "Legacy Tool Suite",
          amountCents: 4500,
          billingInterval: "MONTHLY",
          createdAt: new Date("2025-07-01T00:00:00.000Z"),
          updatedAt: new Date("2025-10-01T00:00:00.000Z"),
          nextBillingDate: new Date("2026-03-20T00:00:00.000Z"),
        }),
      ],
      now,
    );

    const promoAlert = payload.attentionNeeded.find((item) => item.type === "promo_ending_soon");
    const unusedAlert = payload.attentionNeeded.find((item) => item.type === "potentially_unused_subscription");

    assert.ok(promoAlert);
    assert.equal(promoAlert.severity, "high");
    assert.equal(promoAlert.message.includes("$12.99"), true);
    assert.equal(promoAlert.message.includes("Mar"), true);

    assert.ok(unusedAlert);
    assert.equal(unusedAlert.severity, "low");
    assert.equal(unusedAlert.message.includes("$45.00"), true);
    assert.equal(unusedAlert.message.includes("No subscription updates"), true);
  });

  test("keeps attention ordering deterministic regardless of input order", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");
    const records = [
      makeSubscription({
        id: "promo-1",
        name: "Cloud Trial Promo",
        amountCents: 1599,
        createdAt: new Date("2026-02-18T00:00:00.000Z"),
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
        nextBillingDate: new Date("2026-03-14T00:00:00.000Z"),
      }),
      makeSubscription({
        id: "annual-1",
        name: "Cloudflare Pro",
        amountCents: 12000,
        billingInterval: "YEARLY",
        nextBillingDate: new Date("2026-03-28T00:00:00.000Z"),
      }),
      makeSubscription({
        id: "duplicate-a",
        name: "Netflix",
        amountCents: 1000,
        nextBillingDate: new Date("2026-03-22T00:00:00.000Z"),
      }),
      makeSubscription({
        id: "duplicate-b",
        name: "Netflix",
        amountCents: 2200,
        nextBillingDate: new Date("2026-03-26T00:00:00.000Z"),
      }),
      makeSubscription({
        id: "unused-1",
        name: "Design Toolkit",
        amountCents: 3000,
        createdAt: new Date("2025-07-01T00:00:00.000Z"),
        updatedAt: new Date("2025-10-01T00:00:00.000Z"),
        nextBillingDate: new Date("2026-03-24T00:00:00.000Z"),
      }),
    ] satisfies DashboardSubscriptionSourceRecord[];

    const forwardIds = buildDashboardPayload(records, now).attentionNeeded.map((item) => item.id);
    const reverseIds = buildDashboardPayload([...records].reverse(), now).attentionNeeded.map((item) => item.id);

    assert.deepEqual(forwardIds, reverseIds);
  });

  test("sorts upcoming renewals by soonest renewal date and then name", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");

    const payload = buildDashboardPayload(
      [
        makeSubscription({
          id: "third",
          name: "Zulu Service",
          nextBillingDate: new Date("2026-03-26T00:00:00.000Z"),
        }),
        makeSubscription({
          id: "first-b",
          name: "Beta Service",
          nextBillingDate: new Date("2026-03-14T00:00:00.000Z"),
        }),
        makeSubscription({
          id: "first-a",
          name: "Alpha Service",
          nextBillingDate: new Date("2026-03-14T00:00:00.000Z"),
        }),
      ],
      now,
    );

    assert.deepEqual(payload.upcomingRenewals.map((renewal) => renewal.id), ["first-a", "first-b", "third"]);
  });

  test("assigns deterministic upcoming renewal tags with explicit precedence", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");

    const payload = buildDashboardPayload(
      [
        makeSubscription({
          id: "urgent-over-work",
          name: "GitHub Team",
          nextBillingDate: new Date("2026-03-12T00:00:00.000Z"),
        }),
        makeSubscription({
          id: "renew-over-gaming",
          name: "Xbox Game Pass",
          nextBillingDate: new Date("2026-03-16T00:00:00.000Z"),
        }),
        makeSubscription({
          id: "work-over-gaming",
          name: "Steam GitHub Bundle",
          nextBillingDate: new Date("2026-03-30T00:00:00.000Z"),
        }),
        makeSubscription({
          id: "gaming",
          name: "PlayStation Plus",
          nextBillingDate: new Date("2026-03-31T00:00:00.000Z"),
        }),
      ],
      now,
    );

    const tagsById = new Map(payload.upcomingRenewals.map((renewal) => [renewal.id, renewal.tag]));

    assert.equal(tagsById.get("urgent-over-work"), "urgent");
    assert.equal(tagsById.get("renew-over-gaming"), "renew");
    assert.equal(tagsById.get("work-over-gaming"), "work");
    assert.equal(tagsById.get("gaming"), "gaming");
  });
});
