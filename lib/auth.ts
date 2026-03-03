import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "./db";
import { normalizeEnvValue } from "./env";

export type AuthUser = {
  id: string;
  email: string;
};

export type SignInRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number | null;
};

const SESSION_COOKIE_NAME = "sub_stalker_session";
const SESSION_ABSOLUTE_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_IDLE_TTL_SECONDS = 60 * 60 * 24 * 3;
const SESSION_TOUCH_INTERVAL_SECONDS = 60 * 15;
const MAX_CONCURRENT_SESSIONS_PER_USER = 5;

const SIGN_IN_RATE_LIMIT_WINDOW_SECONDS = 60 * 15;
const SIGN_IN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const SIGN_IN_RATE_LIMIT_BLOCK_SECONDS = 60 * 30;
const SIGN_IN_ATTEMPT_RETENTION_DAYS = 7;

function getAuthSecret(): string {
  const secret = normalizeEnvValue(process.env.AUTH_SECRET ?? "");

  if (!secret) {
    throw new Error("Missing AUTH_SECRET.");
  }

  return secret;
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function hashSessionToken(token: string): string {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

function hashRateLimitKey(email: string, ipAddress: string | null): string {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedIp = (ipAddress ?? "unknown").trim().toLowerCase() || "unknown";
  return createHash("sha256").update(`${normalizedEmail}|${normalizedIp}`).digest("hex");
}

function clearCookie(cookieStore: Awaited<ReturnType<typeof cookies>>): void {
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

async function enforceSessionLimit(userId: string): Promise<void> {
  const overflowSessions = await db.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: MAX_CONCURRENT_SESSIONS_PER_USER,
    select: { id: true },
  });

  if (overflowSessions.length === 0) {
    return;
  }

  await db.session.deleteMany({
    where: {
      id: {
        in: overflowSessions.map((session) => session.id),
      },
    },
  });
}

export async function pruneExpiredSessions(): Promise<number> {
  const now = new Date();
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_TTL_SECONDS * 1000);
  const result = await db.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lte: now } },
        { lastSeenAt: { lte: idleCutoff } },
      ],
    },
  });

  return result.count;
}

export async function pruneStaleSignInAttempts(): Promise<number> {
  const cutoff = new Date(Date.now() - SIGN_IN_ATTEMPT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await db.signInAttempt.deleteMany({
    where: {
      updatedAt: {
        lte: cutoff,
      },
    },
  });

  return result.count;
}

export async function consumeSignInRateLimit(
  email: string,
  ipAddress: string | null,
): Promise<SignInRateLimitResult> {
  const key = hashRateLimitKey(email, ipAddress);
  const now = new Date();
  const windowCutoff = new Date(now.getTime() - SIGN_IN_RATE_LIMIT_WINDOW_SECONDS * 1000);

  const attempt = await db.signInAttempt.findUnique({
    where: { key },
  });

  if (!attempt) {
    await db.signInAttempt.create({
      data: {
        key,
        attemptCount: 1,
        windowStartedAt: now,
      },
    });

    return {
      allowed: true,
      retryAfterSeconds: null,
    };
  }

  if (attempt.blockedUntil && attempt.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        Math.ceil((attempt.blockedUntil.getTime() - now.getTime()) / 1000),
        1,
      ),
    };
  }

  if (attempt.windowStartedAt <= windowCutoff) {
    await db.signInAttempt.update({
      where: { key },
      data: {
        attemptCount: 1,
        windowStartedAt: now,
        blockedUntil: null,
      },
    });

    return {
      allowed: true,
      retryAfterSeconds: null,
    };
  }

  const nextAttemptCount = attempt.attemptCount + 1;

  if (nextAttemptCount > SIGN_IN_RATE_LIMIT_MAX_ATTEMPTS) {
    const blockedUntil = new Date(now.getTime() + SIGN_IN_RATE_LIMIT_BLOCK_SECONDS * 1000);
    await db.signInAttempt.update({
      where: { key },
      data: {
        attemptCount: nextAttemptCount,
        blockedUntil,
      },
    });

    return {
      allowed: false,
      retryAfterSeconds: SIGN_IN_RATE_LIMIT_BLOCK_SECONDS,
    };
  }

  await db.signInAttempt.update({
    where: { key },
    data: {
      attemptCount: nextAttemptCount,
    },
  });

  return {
    allowed: true,
    retryAfterSeconds: null,
  };
}

export async function clearSignInRateLimit(email: string, ipAddress: string | null): Promise<void> {
  await db.signInAttempt.deleteMany({
    where: {
      key: hashRateLimitKey(email, ipAddress),
    },
  });
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, existingHash] = storedHash.split("$");

  if (algorithm !== "scrypt" || !salt || !existingHash) {
    return false;
  }

  const hash = scryptSync(password, salt, 64).toString("hex");
  return safeEqual(existingHash, hash);
}

export async function setAuthSession(user: AuthUser): Promise<void> {
  const cookieStore = await cookies();
  const now = Date.now();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(now + SESSION_ABSOLUTE_TTL_SECONDS * 1000);
  const lastSeenAt = new Date(now);

  await pruneExpiredSessions();

  await db.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      lastSeenAt,
    },
  });

  await enforceSessionLimit(user.id);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_ABSOLUTE_TTL_SECONDS,
  });
}

export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(token),
      },
    });
  }

  clearCookie(cookieStore);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = await db.session.findUnique({
    where: {
      tokenHash,
    },
    select: {
      expiresAt: true,
      lastSeenAt: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const now = Date.now();
  const isAbsoluteExpired = session.expiresAt.getTime() <= now;
  const isIdleExpired = session.lastSeenAt.getTime() <= now - SESSION_IDLE_TTL_SECONDS * 1000;

  if (isAbsoluteExpired || isIdleExpired) {
    await db.session.deleteMany({
      where: {
        tokenHash,
      },
    });

    clearCookie(cookieStore);
    return null;
  }

  const shouldTouch = session.lastSeenAt.getTime() <= now - SESSION_TOUCH_INTERVAL_SECONDS * 1000;

  if (shouldTouch) {
    await db.session.update({
      where: { tokenHash },
      data: { lastSeenAt: new Date(now) },
    });
  }

  return session.user;
}

export async function requireAuthenticatedUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return user;
}
