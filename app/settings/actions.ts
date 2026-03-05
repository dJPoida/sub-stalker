"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { DisplayMode } from "@prisma/client";

import { requireAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

function normalizeText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function parseDefaultCurrency(value: FormDataEntryValue | null): string | null {
  const normalized = normalizeText(value).toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    return null;
  }

  return normalized;
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

export async function saveUserSettingsAction(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();

  if (!(await isSameOriginRequest())) {
    redirect("/settings?error=invalid_request");
  }

  const defaultCurrency = parseDefaultCurrency(formData.get("defaultCurrency"));
  const remindersEnabled = formData.get("remindersEnabled") === "on";
  const reminderDaysBefore = parseReminderDaysBefore(formData.get("reminderDaysBefore"));
  const displayMode = parseDisplayMode(formData.get("displayMode"));

  if (!defaultCurrency || reminderDaysBefore === null || !displayMode) {
    redirect("/settings?error=invalid_fields");
  }

  await db.userSettings.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      defaultCurrency,
      remindersEnabled,
      reminderDaysBefore,
      displayMode,
    },
    update: {
      defaultCurrency,
      remindersEnabled,
      reminderDaysBefore,
      displayMode,
    },
  });

  redirect("/settings?result=saved");
}
