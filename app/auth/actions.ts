"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  clearAuthSession,
  hashPassword,
  setAuthSession,
  verifyPassword,
} from "@/lib/auth";

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

export async function signUpAction(formData: FormData): Promise<void> {
  const email = normalizeEmail(formData.get("email"));
  const password = normalizeText(formData.get("password"));
  const name = normalizeText(formData.get("name"));

  if (!email || !password) {
    redirect("/auth/sign-up?error=missing_fields");
  }

  if (password.length < 8) {
    redirect("/auth/sign-up?error=password_too_short");
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    redirect("/auth/sign-up?error=email_exists");
  }

  const user = await db.user.create({
    data: {
      email,
      name: name || null,
      passwordHash: hashPassword(password),
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
  const email = normalizeEmail(formData.get("email"));
  const password = normalizeText(formData.get("password"));

  if (!email || !password) {
    redirect("/auth/sign-in?error=missing_fields");
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

  await setAuthSession({ id: user.id, email: user.email });
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  await clearAuthSession();
  redirect("/auth/sign-in");
}
