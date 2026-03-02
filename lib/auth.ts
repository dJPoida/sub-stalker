import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { normalizeEnvValue } from "./env";

type SessionPayload = {
  sub: string;
  email: string;
  exp: number;
};

export type AuthUser = {
  id: string;
  email: string;
};

const SESSION_COOKIE_NAME = "sub_stalker_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getAuthSecret(): string {
  const secret = normalizeEnvValue(process.env.AUTH_SECRET ?? "");

  if (!secret) {
    throw new Error("Missing AUTH_SECRET.");
  }

  return secret;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): SessionPayload | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
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

export function createSessionToken(user: AuthUser): string {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = encodePayload(payload);
  const signature = sign(encodedPayload, getAuthSecret());
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): AuthUser | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, getAuthSecret());

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  const payload = decodePayload(encodedPayload);

  if (!payload) {
    return null;
  }

  if (!payload.sub || !payload.email || !payload.exp) {
    return null;
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email,
  };
}

export async function setAuthSession(user: AuthUser): Promise<void> {
  const cookieStore = await cookies();
  const token = createSessionToken(user);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function requireAuthenticatedUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return user;
}
