import { NextResponse } from "next/server";

import type { SubscriptionModalCloseReason, SubscriptionModalOpenSource } from "@/lib/subscription-details";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type TelemetryEventName =
  | "subscription_details_modal_open"
  | "subscription_details_modal_close"
  | "subscription_details_view_full_history";

type TelemetryPayload = {
  eventName: TelemetryEventName;
  subscriptionId: string;
  source: SubscriptionModalOpenSource;
  closeReason?: SubscriptionModalCloseReason;
  createdAt?: string;
};

const EVENT_NAMES: TelemetryEventName[] = [
  "subscription_details_modal_open",
  "subscription_details_modal_close",
  "subscription_details_view_full_history",
];

const SOURCES: SubscriptionModalOpenSource[] = ["upcoming_charges", "recent_activity", "subscriptions_list"];

const CLOSE_REASONS: SubscriptionModalCloseReason[] = ["backdrop", "escape_key", "close_button", "unknown"];

function isTelemetryEventName(value: unknown): value is TelemetryEventName {
  return typeof value === "string" && EVENT_NAMES.includes(value as TelemetryEventName);
}

function isSource(value: unknown): value is SubscriptionModalOpenSource {
  return typeof value === "string" && SOURCES.includes(value as SubscriptionModalOpenSource);
}

function isCloseReason(value: unknown): value is SubscriptionModalCloseReason {
  return typeof value === "string" && CLOSE_REASONS.includes(value as SubscriptionModalCloseReason);
}

export async function POST(request: Request) {
  let payload: TelemetryPayload;

  try {
    payload = (await request.json()) as TelemetryPayload;
  } catch {
    return NextResponse.json({ error: "Invalid telemetry payload." }, { status: 400 });
  }

  if (!isTelemetryEventName(payload.eventName)) {
    return NextResponse.json({ error: "Unknown event name." }, { status: 400 });
  }

  if (!isSource(payload.source)) {
    return NextResponse.json({ error: "Unknown event source." }, { status: 400 });
  }

  if (typeof payload.subscriptionId !== "string" || payload.subscriptionId.trim().length === 0) {
    return NextResponse.json({ error: "Invalid subscription id." }, { status: 400 });
  }

  if (payload.closeReason && !isCloseReason(payload.closeReason)) {
    return NextResponse.json({ error: "Unknown close reason." }, { status: 400 });
  }

  console.info("[telemetry]", JSON.stringify({ ...payload, receivedAt: new Date().toISOString() }));

  return NextResponse.json({ ok: true }, { status: 202 });
}
