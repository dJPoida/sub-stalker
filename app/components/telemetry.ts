"use client";

import type {
  SubscriptionModalCloseReason,
  SubscriptionModalOpenSource,
} from "@/lib/subscription-details";

type TelemetryEventName =
  | "subscription_details_modal_open"
  | "subscription_details_modal_close"
  | "subscription_details_view_full_history"
  | "subscription_details_fetch_empty"
  | "subscription_details_fetch_error"
  | "subscription_details_edit_click"
  | "subscription_details_copy_id"
  | "subscription_details_quick_action_click"
  | "subscription_details_cancel_flow_start"
  | "subscription_details_cancel_flow_complete"
  | "subscription_details_mutation_result";

type TelemetryPayload = {
  eventName: TelemetryEventName;
  subscriptionId: string;
  source: SubscriptionModalOpenSource;
  closeReason?: SubscriptionModalCloseReason;
  action?: string;
  outcome?: "success" | "failure";
};

export function trackTelemetryEvent(payload: TelemetryPayload): void {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    ...payload,
    createdAt: new Date().toISOString(),
  });

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/telemetry", blob);
    return;
  }

  fetch("/api/telemetry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
