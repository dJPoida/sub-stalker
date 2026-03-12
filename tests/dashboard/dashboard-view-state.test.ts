import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildDashboardPayload, type DashboardSubscriptionSourceRecord } from "../../lib/dashboard";
import {
  getDashboardRenderState,
  INITIAL_DASHBOARD_REQUEST_STATE,
  reduceDashboardRequestState,
} from "../../lib/dashboard-view-state";

function makeSubscription(
  overrides: Partial<DashboardSubscriptionSourceRecord> & Pick<DashboardSubscriptionSourceRecord, "id" | "name">,
): DashboardSubscriptionSourceRecord {
  const { id, name, ...rest } = overrides;

  return {
    amountCents: 1200,
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

describe("dashboard view state", () => {
  test("covers loading, empty, populated, and error render states", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");
    const emptyPayload = buildDashboardPayload([], now);
    const populatedPayload = buildDashboardPayload([makeSubscription({ id: "github", name: "GitHub Team" })], now);

    const loadingState = reduceDashboardRequestState(INITIAL_DASHBOARD_REQUEST_STATE, { type: "fetch_start" });
    assert.equal(getDashboardRenderState(loadingState), "loading");

    const emptyState = reduceDashboardRequestState(loadingState, {
      type: "fetch_success",
      data: emptyPayload,
    });
    assert.equal(getDashboardRenderState(emptyState), "empty");

    const populatedState = reduceDashboardRequestState(emptyState, {
      type: "fetch_success",
      data: populatedPayload,
    });
    assert.equal(getDashboardRenderState(populatedState), "populated");

    const errorState = reduceDashboardRequestState(INITIAL_DASHBOARD_REQUEST_STATE, {
      type: "fetch_error",
      errorMessage: "Unable to reach dashboard API.",
    });
    assert.equal(getDashboardRenderState(errorState), "error");
  });

  test("keeps populated state while refreshing to avoid unnecessary skeleton regressions", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");
    const payload = buildDashboardPayload([makeSubscription({ id: "canva", name: "Canva Pro" })], now);

    const readyState = reduceDashboardRequestState(INITIAL_DASHBOARD_REQUEST_STATE, {
      type: "fetch_success",
      data: payload,
    });

    const refreshingState = reduceDashboardRequestState(readyState, { type: "fetch_start" });

    assert.equal(refreshingState.status, "loading");
    assert.ok(refreshingState.data);
    assert.equal(getDashboardRenderState(refreshingState), "populated");
  });

  test("retains previous payload after a fetch error", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");
    const payload = buildDashboardPayload([makeSubscription({ id: "figma", name: "Figma Professional" })], now);

    const readyState = reduceDashboardRequestState(INITIAL_DASHBOARD_REQUEST_STATE, {
      type: "fetch_success",
      data: payload,
    });

    const errorState = reduceDashboardRequestState(readyState, {
      type: "fetch_error",
      errorMessage: "Dashboard service timed out.",
    });

    assert.equal(errorState.status, "error");
    assert.equal(errorState.errorMessage, "Dashboard service timed out.");
    assert.equal(errorState.data?.kpis.subscriptions.total, 1);
    assert.equal(getDashboardRenderState(errorState), "populated");
  });
});
