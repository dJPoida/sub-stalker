import assert from "node:assert/strict";
import { describe, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import SubscriptionDetailsModal from "../../app/components/SubscriptionDetailsModal";
import { buildSubscriptionDetails, type SubscriptionDetailsSourceRecord } from "../../lib/subscription-details";

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
    notesMarkdown: "Primary workspace subscription.",
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

function renderModalHtml(record: SubscriptionDetailsSourceRecord): string {
  const details = buildSubscriptionDetails(record, {
    now: new Date("2026-03-11T00:00:00.000Z"),
  });

  return renderToStaticMarkup(
    <SubscriptionDetailsModal
      details={details}
      errorMessage={null}
      isOpen
      loadState="ready"
      onClose={() => undefined}
      onEditSubscription={null}
      onViewFullHistoryClick={() => undefined}
      source="subscriptions_list"
    />,
  );
}

function renderModalStateHtml({
  errorMessage = null,
  loadState,
  onRetry = null,
}: {
  errorMessage?: string | null;
  loadState: "loading" | "empty" | "error";
  onRetry?: (() => void) | null;
}): string {
  return renderToStaticMarkup(
    <SubscriptionDetailsModal
      details={null}
      errorMessage={errorMessage}
      isOpen
      loadState={loadState}
      onClose={() => undefined}
      onRetry={onRetry}
      onViewFullHistoryClick={() => undefined}
      source="subscriptions_list"
    />,
  );
}

describe("SubscriptionDetailsModal attention panel", () => {
  test("renders alert items with review-state copy", () => {
    const html = renderModalHtml(
      makeRecord({
        id: "reviewed-price-rise",
        name: "AI Workspace",
        nextBillingDate: new Date("2026-03-14T00:00:00.000Z"),
        projectedNextChargeAmountCents: 3200,
        lastChargedAmountCents: 2400,
        markedForReview: true,
      }),
    );

    assert.match(html, /Attention Needed/);
    assert.match(html, /Marked for review/);
    assert.match(html, /Price increase imminent/);
    assert.match(html, /Renewal higher than last charge/);
    assert.match(html, /Projected increase: \$12\.00 over the current price/);
    assert.match(html, /Quick Actions/);
    assert.match(html, /Open management page/);
    assert.match(html, /Change alert/);
    assert.match(html, /Cancel soon/);
    assert.match(html, /Lifecycle Controls/);
    assert.match(html, /Management/);
    assert.match(html, /example\.com/);
    assert.match(html, /aria-labelledby="subscription-details-title"/);
    assert.match(html, /aria-describedby="subscription-details-description"/);
  });

  test("renders an empty state when no alerts are active", () => {
    const html = renderModalHtml(
      makeRecord({
        id: "steady-plan",
        name: "Back Office Suite",
        createdAt: new Date("2025-10-10T08:00:00.000Z"),
      }),
    );

    assert.match(html, /Attention Needed/);
    assert.match(html, /Not marked for review/);
    assert.match(html, /No promo or price-change alerts are active for this subscription\./);
  });

  test("keeps invalid management URLs out of rendered provider actions", () => {
    const html = renderModalHtml(
      makeRecord({
        id: "invalid-management-links",
        name: "Unsafe Provider",
        billingConsoleUrl: "javascript:alert(1)",
        cancelSubscriptionUrl: null,
        billingHistoryUrl: "ftp://example.com/history",
        markedForReview: false,
      }),
    );

    assert.match(html, /Management/);
    assert.doesNotMatch(html, /javascript:alert/);
    assert.doesNotMatch(html, /ftp:\/\/example\.com/);
    assert.match(html, /Not captured/);
    assert.match(html, /Management URL must start with http:\/\/ or https:\/\/\./);
  });

  test("renders accessible loading, error, and empty states", () => {
    const loadingHtml = renderModalStateHtml({ loadState: "loading" });
    const errorHtml = renderModalStateHtml({
      errorMessage: "Details service is unavailable.",
      loadState: "error",
      onRetry: () => undefined,
    });
    const emptyHtml = renderModalStateHtml({ loadState: "empty" });

    assert.match(loadingHtml, /role="status"/);
    assert.match(loadingHtml, /aria-busy="true"/);
    assert.match(loadingHtml, /Loading subscription details\./);
    assert.match(errorHtml, /Details service is unavailable\./);
    assert.match(errorHtml, />Retry</);
    assert.match(emptyHtml, /Subscription details are unavailable for this record\./);
  });
});
