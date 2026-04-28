"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { DisplayMode } from "@prisma/client";

import { requireAuthenticatedUser } from "@/lib/auth";
import { normalizeCurrencyCode } from "@/lib/currencies";
import { db } from "@/lib/db";

function normalizeText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function parseDefaultCurrency(value: FormDataEntryValue | null): string | null {
  return normalizeCurrencyCode(normalizeText(value));
}

function parseReminderDaysBefore(value: FormDataEntryValue | null): number | null {
  const normalized = normalizeText(value);

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 30) {
    return null;
  }

  return parsed;
}

function parseDisplayMode(value: FormDataEntryValue | null): DisplayMode | null {
  const normalized = normalizeText(value).toUpperCase();

  if (normalized === "DEVICE" || normalized === "LIGHT" || normalized === "DARK") {
    return normalized;
  }

  return null;
}

function parseDisplayName(value: FormDataEntryValue | null): string | null | "invalid" {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > 120) {
    return "invalid";
  }

  return normalized;
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

async function requireValidRequest(): Promise<void> {
  if (!(await isSameOriginRequest())) {
    redirect("/settings?error=invalid_request");
  }
}

function redirectInvalidFields(): never {
  redirect("/settings?error=invalid_fields");
}

export async function updateDisplayModeAction(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();
  await requireValidRequest();

  const displayMode = parseDisplayMode(formData.get("displayMode"));

  if (!displayMode) {
    redirectInvalidFields();
  }

  await db.userSettings.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      displayMode,
    },
    update: {
      displayMode,
    },
  });

  redirect("/settings?result=display_saved");
}

export async function updateDefaultCurrencyAction(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();
  await requireValidRequest();

  const defaultCurrency = parseDefaultCurrency(formData.get("defaultCurrency"));

  if (!defaultCurrency) {
    redirectInvalidFields();
  }

  await db.userSettings.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      defaultCurrency,
    },
    update: {
      defaultCurrency,
    },
  });

  redirect("/settings?result=currency_saved");
}

export async function updateRemindersEnabledAction(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();
  await requireValidRequest();

  const remindersEnabled = formData.get("remindersEnabled") === "on";

  await db.userSettings.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      remindersEnabled,
    },
    update: {
      remindersEnabled,
    },
  });

  redirect("/settings?result=reminders_saved");
}

export async function updateReminderLeadTimeAction(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();
  await requireValidRequest();

  const reminderDaysBefore = parseReminderDaysBefore(formData.get("reminderDaysBefore"));

  if (reminderDaysBefore === null) {
    redirectInvalidFields();
  }

  await db.userSettings.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      reminderDaysBefore,
    },
    update: {
      reminderDaysBefore,
    },
  });

  redirect("/settings?result=lead_time_saved");
}

export async function updateAccountDetailsAction(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();
  await requireValidRequest();

  const displayName = parseDisplayName(formData.get("displayName"));

  if (displayName === "invalid") {
    redirectInvalidFields();
  }

  await db.user.update({
    where: {
      id: user.id,
    },
    data: {
      name: displayName,
    },
  });

  redirect("/settings?result=account_saved");
}
