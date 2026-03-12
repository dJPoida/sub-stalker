"use server";

import { BillingInterval } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

const BILLING_INTERVAL_VALUES = new Set<BillingInterval>(Object.values(BillingInterval));
const MAX_AMOUNT_CENTS = 100_000_000;

function normalizeText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function normalizeOptionalText(value: FormDataEntryValue | null): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

function parseOptionalMarkdown(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "");
  return raw.trim().length > 0 ? raw : null;
}

function parseAmountCents(value: FormDataEntryValue | null): number | null {
  const raw = normalizeText(value);

  if (!raw || !/^\d+(\.\d{1,2})?$/.test(raw)) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  const amountCents = Math.round(parsed * 100);

  if (amountCents <= 0 || amountCents > MAX_AMOUNT_CENTS) {
    return null;
  }

  return amountCents;
}

function parseCurrency(value: FormDataEntryValue | null): string | null {
  const normalized = normalizeText(value).toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function parseBillingInterval(value: FormDataEntryValue | null): BillingInterval | null {
  const normalized = normalizeText(value).toUpperCase() as BillingInterval;

  if (!BILLING_INTERVAL_VALUES.has(normalized)) {
    return null;
  }

  return normalized;
}

function parseNextBillingDate(value: FormDataEntryValue | null): Date | null | "invalid" {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return "invalid";
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return "invalid";
  }

  return parsed;
}

async function isSameOriginRequest(): Promise<boolean> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }

  if (!host) {
    return false;
  }

  const proto =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

  try {
    const originUrl = new URL(origin);
    return originUrl.host.toLowerCase() === host.toLowerCase() && originUrl.protocol === `${proto}:`;
  } catch {
    return false;
  }
}

type ParsedSubscriptionInput = {
  name: string;
  paymentMethod: string;
  signedUpBy: string | null;
  billingConsoleUrl: string | null;
  cancelSubscriptionUrl: string | null;
  billingHistoryUrl: string | null;
  notesMarkdown: string | null;
  amountCents: number;
  currency: string;
  billingInterval: BillingInterval;
  nextBillingDate: Date | null;
};

function parseOptionalHttpUrl(value: FormDataEntryValue | null): string | null | "invalid" {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== "http:" && protocol !== "https:") {
      return "invalid";
    }
  } catch {
    return "invalid";
  }

  return normalized;
}

function parseSubscriptionInput(formData: FormData): ParsedSubscriptionInput | null {
  const name = normalizeText(formData.get("name"));
  const paymentMethod = normalizeText(formData.get("paymentMethod"));
  const signedUpBy = normalizeOptionalText(formData.get("signedUpBy"));
  const billingConsoleUrl = parseOptionalHttpUrl(formData.get("billingConsoleUrl"));
  const cancelSubscriptionUrl = parseOptionalHttpUrl(formData.get("cancelSubscriptionUrl"));
  const billingHistoryUrl = parseOptionalHttpUrl(formData.get("billingHistoryUrl"));
  const notesMarkdown = parseOptionalMarkdown(formData.get("notesMarkdown"));
  const amountCents = parseAmountCents(formData.get("amount"));
  const currency = parseCurrency(formData.get("currency"));
  const billingInterval = parseBillingInterval(formData.get("billingInterval"));
  const nextBillingDate = parseNextBillingDate(formData.get("nextBillingDate"));

  if (
    !name ||
    !paymentMethod ||
    billingConsoleUrl === "invalid" ||
    cancelSubscriptionUrl === "invalid" ||
    billingHistoryUrl === "invalid" ||
    amountCents === null ||
    currency === null ||
    billingInterval === null ||
    nextBillingDate === "invalid"
  ) {
    return null;
  }

  return {
    name,
    paymentMethod,
    signedUpBy,
    billingConsoleUrl,
    cancelSubscriptionUrl,
    billingHistoryUrl,
    notesMarkdown,
    amountCents,
    currency,
    billingInterval,
    nextBillingDate,
  };
}

function parseSubscriptionId(value: FormDataEntryValue | null): string | null {
  const subscriptionId = normalizeText(value);
  return subscriptionId || null;
}

export async function createSubscriptionAction(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();

  if (!(await isSameOriginRequest())) {
    redirect("/subscriptions?error=invalid_request");
  }

  const parsedInput = parseSubscriptionInput(formData);

  if (!parsedInput) {
    redirect("/subscriptions?error=invalid_fields");
  }

  await db.subscription.create({
    data: {
      userId: user.id,
      ...parsedInput,
    },
  });

  redirect("/subscriptions?result=created");
}

export async function updateSubscriptionAction(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();

  if (!(await isSameOriginRequest())) {
    redirect("/subscriptions?error=invalid_request");
  }

  const subscriptionId = parseSubscriptionId(formData.get("subscriptionId"));
  const parsedInput = parseSubscriptionInput(formData);

  if (!subscriptionId || !parsedInput) {
    redirect("/subscriptions?error=invalid_fields");
  }

  const result = await db.subscription.updateMany({
    where: {
      id: subscriptionId,
      userId: user.id,
    },
    data: parsedInput,
  });

  if (result.count === 0) {
    redirect("/subscriptions?error=not_found");
  }

  redirect(`/subscriptions?result=updated&eventId=${Date.now()}`);
}

export async function deactivateSubscriptionAction(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();

  if (!(await isSameOriginRequest())) {
    redirect("/subscriptions?error=invalid_request");
  }

  const subscriptionId = parseSubscriptionId(formData.get("subscriptionId"));

  if (!subscriptionId) {
    redirect("/subscriptions?error=invalid_fields");
  }

  const result = await db.subscription.updateMany({
    where: {
      id: subscriptionId,
      userId: user.id,
    },
    data: {
      isActive: false,
    },
  });

  if (result.count === 0) {
    redirect("/subscriptions?error=not_found");
  }

  redirect("/subscriptions?result=deactivated");
}
