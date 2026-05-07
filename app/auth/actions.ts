"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { normalizeCurrencyCode } from "@/lib/currencies";
import { isInvitesRequired } from "@/lib/env";
import { createUserWithInvite } from "@/lib/invites";
import {
  authenticateWithPassword,
  clearAuthSession,
  clearSignInRateLimit,
  consumeSignInRateLimit,
  hashPassword,
  pruneExpiredSessions,
  pruneStaleSignInAttempts,
  setAuthSession,
} from "@/lib/auth";
import { issueRegistrationVerificationForUser } from "@/lib/registration-verification";

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function parseDefaultCurrency(value: FormDataEntryValue | null): string | null {
  return normalizeCurrencyCode(normalizeText(value));
}

function getClientIp(headerStore: Awaited<ReturnType<typeof headers>>): string | null {
  const forwarded = headerStore.get("x-forwarded-for");

  if (!forwarded) {
    return null;
  }

  const first = forwarded.split(",")[0]?.trim();
  return first || null;
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
  source: "signup" | "signin" | "resend";
  delivery?: string | null;
  retryAfterSeconds?: number | null;
}): string {
  const searchParams = new URLSearchParams({
    email: params.email,
    source: params.source,
  });

  if (params.delivery) {
    searchParams.set("delivery", params.delivery);
  }

  if (typeof params.retryAfterSeconds === "number" && params.retryAfterSeconds > 0) {
    searchParams.set("retry_after", String(params.retryAfterSeconds));
  }

  return `/auth/verify/requested?${searchParams.toString()}`;
}

async function redirectExistingSignupUser(user: {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
}): Promise<never> {
  if (user.emailVerifiedAt) {
    const searchParams = new URLSearchParams({
      email: user.email,
      error: "account_exists",
    });

    redirect(`/auth/sign-in?${searchParams.toString()}`);
  }

  const verification = await issueRegistrationVerificationForUser({
    userId: user.id,
    email: user.email,
    baseUrl: await getRequestBaseUrl(),
  });

  redirect(
    buildVerificationRequestedRedirect({
      email: user.email,
      source: "signup",
      delivery: verification.outcome,
      retryAfterSeconds: verification.retryAfterSeconds,
    }),
  );
}

export async function signUpAction(formData: FormData): Promise<void> {
  if (!(await isSameOriginRequest())) {
    redirect("/auth/sign-up?error=invalid_request");
  }

  const email = normalizeEmail(formData.get("email"));
  const password = normalizeText(formData.get("password"));
  const inviteToken = normalizeText(formData.get("inviteToken"));
  const defaultCurrency = parseDefaultCurrency(formData.get("defaultCurrency"));

  if (!email || !password) {
    redirect("/auth/sign-up?error=missing_fields");
  }

  if (password.length < 8) {
    redirect("/auth/sign-up?error=password_too_short");
  }

  if (!defaultCurrency) {
    redirect("/auth/sign-up?error=invalid_currency");
  }

  const passwordHash = hashPassword(password);
  const invitesRequired = isInvitesRequired();
  const existingUser = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (existingUser) {
    await redirectExistingSignupUser(existingUser);
  }

  if (invitesRequired) {
    const registration = await createUserWithInvite({
      email,
      passwordHash,
      inviteToken,
      defaultCurrency,
    });

    if (!registration.ok) {
      if (registration.reason === "unable_to_create") {
        redirect("/auth/sign-up?error=unable_to_create");
      }

      redirect("/auth/sign-up?error=invalid_invite");
    }

    const verification = await issueRegistrationVerificationForUser({
      userId: registration.user.id,
      email: registration.user.email,
      baseUrl: await getRequestBaseUrl(),
    });

    redirect(
      buildVerificationRequestedRedirect({
        email: registration.user.email,
        source: "signup",
        delivery: verification.outcome,
        retryAfterSeconds: verification.retryAfterSeconds,
      }),
    );
  }

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      settings: {
        create: {
          defaultCurrency,
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  const verification = await issueRegistrationVerificationForUser({
    userId: user.id,
    email: user.email,
    baseUrl: await getRequestBaseUrl(),
  });

  redirect(
    buildVerificationRequestedRedirect({
      email: user.email,
      source: "signup",
      delivery: verification.outcome,
      retryAfterSeconds: verification.retryAfterSeconds,
    }),
  );
}

export async function signInAction(formData: FormData): Promise<void> {
  if (!(await isSameOriginRequest())) {
    redirect("/auth/sign-in?error=invalid_request");
  }

  const email = normalizeEmail(formData.get("email"));
  const password = normalizeText(formData.get("password"));

  if (!email || !password) {
    redirect("/auth/sign-in?error=missing_fields");
  }

  const headerStore = await headers();
  const ipAddress = getClientIp(headerStore);

  await pruneStaleSignInAttempts();
  const rateLimit = await consumeSignInRateLimit(email, ipAddress);

  if (!rateLimit.allowed) {
    const retryAfter = rateLimit.retryAfterSeconds ?? 60;
    redirect(`/auth/sign-in?error=rate_limited&retry_after=${retryAfter}`);
  }

  const authentication = await authenticateWithPassword(email, password);

  if (!authentication.ok && authentication.reason === "email_unverified") {
    await clearSignInRateLimit(email, ipAddress);
    redirect(
      buildVerificationRequestedRedirect({
        email: authentication.user?.email ?? email,
        source: "signin",
      }),
    );
  }

  if (!authentication.ok) {
    redirect("/auth/sign-in?error=invalid_credentials");
  }

  await clearSignInRateLimit(email, ipAddress);
  await pruneExpiredSessions();
  await setAuthSession(authentication.user);
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  if (!(await isSameOriginRequest())) {
    redirect("/auth/sign-in?error=invalid_request");
  }

  await clearAuthSession();
  redirect("/auth/sign-in");
}
