import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { SubscriptionDetailsSourceRecord } from "../../lib/subscription-details";
import { buildSubscriptionDetails } from "../../lib/subscription-details";

function makeRecord(
  overrides: Partial<SubscriptionDetailsSourceRecord> & Pick<SubscriptionDetailsSourceRecord, "id" | "name">,
): SubscriptionDetailsSourceRecord {
  const { id, name, ...rest } = overrides;

  return {
    id,
    name,
    paymentMethod: "Visa 4242",
    signedUpBy: "Alex",
    billingConsoleUrl: "https://example.com/manage",
    cancelSubscriptionUrl: "https://example.com/cancel",
    billingHistoryUrl: "https://example.com/history",
    notesMarkdown: "Primary workspace subscription.\nRenew before team seats expand.",
    amountCents: 2000,
    currency: "USD",
    billingInterval: "MONTHLY",
    nextBillingDate: new Date("2026-03-20T12:00:00.000Z"),
    isActive: true,
    createdAt: new Date("2026-01-10T08:00:00.000Z"),
    updatedAt: new Date("2026-03-10T09:30:00.000Z"),
    ...rest,
  };
}

describe("buildSubscriptionDetails", () => {
  test("adds inferred category and annual spend summary for standard cadences", () => {
    const details = buildSubscriptionDetails(
      makeRecord({
        id: "github-team",
        name: "GitHub Team",
      }),
    );

    assert.equal(details.inferredCategory, "Productivity");
    assert.deepEqual(details.spendSummary, {
      label: "Projected annual spend",
      amountCents: 24_000,
      currency: "USD",
    });
    assert.equal(details.schemaVersion, "2026-03-v2");
    assert.equal(details.v2.summaryStrip.currentPrice.monthlyEquivalentAmountCents, 2_000);
    assert.equal(details.v2.summaryStrip.reminders.statusLabel, "3 days before renewal");
  });

  test("falls back cleanly when category and annualized spend cannot be inferred", () => {
    const details = buildSubscriptionDetails(
      makeRecord({
        id: "custom-service",
        name: "Internal Retainer",
        billingInterval: "CUSTOM",
        paymentMethod: "1234",
        notesMarkdown: "   ",
      }),
    );

    assert.equal(details.inferredCategory, "Other");
    assert.equal(details.paymentMethodMasked, "••••");
    assert.deepEqual(details.spendSummary, {
      label: "Projected annual spend",
      amountCents: null,
      currency: "USD",
    });
    assert.equal(details.notesMarkdown, "   ");
    assert.equal(details.v2.notesCategory.state, "partial");
    assert.equal(details.v2.sectionStates.summaryStrip, "ready");
    assert.equal(details.v2.attentionNeeded.state, "partial");
    assert.deepEqual(
      details.v2.attentionNeeded.ruleOutcomes
        .filter((outcome) => outcome.status === "insufficient_data")
        .map((outcome) => outcome.code),
      ["price_increase_imminent", "higher_price_renewal"],
    );
  });

  test("derives promo alerts and action capabilities deterministically", () => {
    const details = buildSubscriptionDetails(
      makeRecord({
        id: "promo-service",
        name: "Streaming Trial Promo",
        amountCents: 1299,
        createdAt: new Date("2026-02-20T00:00:00.000Z"),
        updatedAt: new Date("2026-03-01T00:00:00.000Z"),
        nextBillingDate: new Date("2026-03-14T00:00:00.000Z"),
      }),
      {
        now: new Date("2026-03-11T00:00:00.000Z"),
      },
    );

    assert.equal(details.v2.attentionNeeded.items.length, 1);
    assert.equal(details.v2.attentionNeeded.items[0]?.code, "promo_ending_soon");
    assert.equal(details.v2.attentionNeeded.items[0]?.message.includes("Mar"), true);
    assert.equal(details.v2.attentionNeeded.ruleOutcomes[0]?.status, "matched");
    assert.equal(details.v2.header.status.stage, "active");
    assert.equal(details.v2.actionBar.quickActions.find((action) => action.key === "open_management_page")?.availability, "enabled");
    assert.equal(details.v2.actionBar.quickActions.find((action) => action.key === "mark_for_review")?.availability, "disabled");
  });

  test("derives cancel-scheduled lifecycle and disables cancel actions for inactive subscriptions", () => {
    const details = buildSubscriptionDetails(
      makeRecord({
        id: "cancelled-later",
        name: "Cloud Suite",
        isActive: false,
        nextBillingDate: new Date("2026-03-20T12:00:00.000Z"),
        notesMarkdown: null,
        cancelSubscriptionUrl: null,
        billingConsoleUrl: null,
        billingHistoryUrl: null,
      }),
      {
        now: new Date("2026-03-11T00:00:00.000Z"),
      },
    );

    assert.equal(details.status, "CANCELED");
    assert.equal(details.v2.lifecycle.stage, "cancel_scheduled");
    assert.equal(details.v2.lifecycle.label, "Cancel scheduled");
    assert.equal(details.v2.actionBar.header.find((action) => action.key === "mark_cancelled")?.availability, "disabled");
    assert.equal(details.v2.actionBar.quickActions.find((action) => action.key === "cancel_soon")?.availability, "disabled");
    assert.equal(details.v2.lifecycle.reviewState.canPersist, false);
  });

  test("matches higher-price renewal rules when comparison pricing is supplied", () => {
    const details = buildSubscriptionDetails(
      makeRecord({
        id: "price-rise",
        name: "AI Workspace",
        nextBillingDate: new Date("2026-03-14T00:00:00.000Z"),
        projectedNextChargeAmountCents: 3200,
        lastChargedAmountCents: 2400,
      }),
      {
        now: new Date("2026-03-11T00:00:00.000Z"),
      },
    );

    assert.equal(details.lastChargeAmountCents, 2400);
    assert.deepEqual(
      details.v2.attentionNeeded.items.map((item) => item.code),
      ["price_increase_imminent", "higher_price_renewal"],
    );
    assert.equal(details.v2.paymentHistory.upcomingRenewal.projectedAmountCents, 3200);
    assert.equal(details.v2.attentionNeeded.ruleOutcomes.find((outcome) => outcome.code === "higher_price_renewal")?.status, "matched");
  });
});
