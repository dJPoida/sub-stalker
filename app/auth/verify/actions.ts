"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resendRegistrationVerificationForEmail } from "@/lib/registration-verification";

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
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

  const proto = headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "development" ? "http" : "https");

  try {
    const originUrl = new URL(origin);
    return originUrl.host.toLowerCase() === host.toLowerCase() && originUrl.protocol === `${proto}:`;
  } catch {
    return false;
  }
}

async function getRequestBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "development" ? "http" : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

function buildVerificationRequestedRedirect(params: {
  email: string;
  delivery?: string | null;
  retryAfterSeconds?: number | null;
}): string {
  const searchParams = new URLSearchParams({
    source: "resend",
  });

  if (params.email) {
    searchParams.set("email", params.email);
  }

  if (params.delivery) {
    searchParams.set("delivery", params.delivery);
  }

  if (typeof params.retryAfterSeconds === "number" && params.retryAfterSeconds > 0) {
    searchParams.set("retry_after", String(params.retryAfterSeconds));
  }

  return `/auth/verify/requested?${searchParams.toString()}`;
}

export async function resendRegistrationVerificationAction(formData: FormData): Promise<void> {
  const email = normalizeEmail(formData.get("email"));

  if (!(await isSameOriginRequest())) {
    redirect(buildVerificationRequestedRedirect({ email, delivery: "invalid_request" }));
  }

  if (!email) {
    redirect(buildVerificationRequestedRedirect({ email, delivery: "missing_email" }));
  }

  const result = await resendRegistrationVerificationForEmail({
    email,
    baseUrl: await getRequestBaseUrl(),
  });

  redirect(
    buildVerificationRequestedRedirect({
      email,
      delivery: result.outcome,
      retryAfterSeconds: result.retryAfterSeconds,
    }),
  );
}
