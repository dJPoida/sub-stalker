"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/lib/auth";
import { normalizeCurrencyCode } from "@/lib/currencies";
import { db } from "@/lib/db";

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

export async function updateDashboardCurrencyAction(formData: FormData): Promise<void> {
  const user = await requireAuthenticatedUser();

  if (!(await isSameOriginRequest())) {
    redirect("/?error=invalid_request");
  }

  const defaultCurrency = normalizeCurrencyCode(String(formData.get("defaultCurrency") ?? ""));

  if (!defaultCurrency) {
    redirect("/?error=invalid_currency");
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

  redirect("/");
}
