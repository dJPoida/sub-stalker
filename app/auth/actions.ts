"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { isInvitesRequired } from "@/lib/env";
import { createUserWithInvite } from "@/lib/invites";
import {
  clearAuthSession,
  clearSignInRateLimit,
  consumeSignInRateLimit,
  hashPassword,
  pruneExpiredSessions,
  pruneStaleSignInAttempts,
  setAuthSession,
  verifyPassword,
} from "@/lib/auth";

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
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

export async function signUpAction(formData: FormData): Promise<void> {
  if (!(await isSameOriginRequest())) {
    redirect("/auth/sign-up?error=invalid_request");
  }

  const email = normalizeEmail(formData.get("email"));
  const password = normalizeText(formData.get("password"));
  const name = normalizeText(formData.get("name"));
  const inviteToken = normalizeText(formData.get("inviteToken"));

  if (!email || !password) {
    redirect("/auth/sign-up?error=missing_fields");
  }

  if (password.length < 8) {
    redirect("/auth/sign-up?error=password_too_short");
  }

  const passwordHash = hashPassword(password);
  const invitesRequired = isInvitesRequired();

  if (invitesRequired) {
    const registration = await createUserWithInvite({
      email,
      name: name || null,
      passwordHash,
      inviteToken,
    });

    if (!registration.ok) {
      if (registration.reason === "unable_to_create") {
        redirect("/auth/sign-up?error=unable_to_create");
      }

      redirect("/auth/sign-up?error=invalid_invite");
    }

    await setAuthSession(registration.user);
    redirect("/");
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    redirect("/auth/sign-up?error=unable_to_create");
  }

  const user = await db.user.create({
    data: {
      email,
      name: name || null,
      passwordHash,
      settings: {
        create: {},
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  await setAuthSession(user);
  redirect("/");
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

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    redirect("/auth/sign-in?error=invalid_credentials");
  }

  await clearSignInRateLimit(email, ipAddress);
  await pruneExpiredSessions();
  await setAuthSession({ id: user.id, email: user.email });
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  if (!(await isSameOriginRequest())) {
    redirect("/auth/sign-in?error=invalid_request");
  }

  await clearAuthSession();
  redirect("/auth/sign-in");
}
