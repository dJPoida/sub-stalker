"use client";

import type {
  SubscriptionModalCloseReason,
  SubscriptionModalOpenSource,
} from "@/lib/subscription-details";

type TelemetryEventName =
  | "subscription_details_modal_open"
  | "subscription_details_modal_close"
  | "subscription_details_view_full_history";

type TelemetryPayload = {
  eventName: TelemetryEventName;
  subscriptionId: string;
  source: SubscriptionModalOpenSource;
  closeReason?: SubscriptionModalCloseReason;
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
