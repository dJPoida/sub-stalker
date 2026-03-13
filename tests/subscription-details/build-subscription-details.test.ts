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
  });
});
