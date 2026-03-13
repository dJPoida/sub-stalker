import { createHmac, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { db } from "./db";
import { normalizeEnvValue } from "./env";
import {
  sendRegistrationVerificationEmail,
  type RegistrationVerificationEmailSendResult,
} from "./mail";

export const REGISTRATION_VERIFICATION_TOKEN_BYTES = 32;
export const REGISTRATION_VERIFICATION_TTL_MINUTES = 60;
export const REGISTRATION_VERIFICATION_WINDOW_SECONDS = 60 * 60;
export const REGISTRATION_VERIFICATION_MAX_PER_WINDOW = 3;

type TimeDependencies = {
  now?: () => Date;
};

type IssueRegistrationVerificationDependencies = TimeDependencies & {
  sendRegistrationVerificationEmailFn?: typeof sendRegistrationVerificationEmail;
};

export type RegistrationVerificationDispatchResult =
  | ({
      retryAfterSeconds: null;
      verificationToken: string;
      verificationUrl: string;
      expiresAt: Date;
    } & RegistrationVerificationEmailSendResult)
  | {
      outcome: "rate_limited";
      provider: null;
      messageId: null;
      error: null;
      retryAfterSeconds: number;
      verificationToken: null;
      verificationUrl: null;
      expiresAt: null;
    };

export type ResendRegistrationVerificationResult =
  | RegistrationVerificationDispatchResult
  | {
      outcome: "ignored";
      provider: null;
      messageId: null;
      error: null;
      retryAfterSeconds: null;
      verificationToken: null;
      verificationUrl: null;
      expiresAt: null;
    };

export type ConsumeRegistrationVerificationResult =
  | {
      ok: true;
      email: string;
      userId: string;
    }
  | {
      ok: false;
      reason: "missing_token" | "invalid_token";
      email: null;
      userId: null;
    }
  | {
      ok: false;
      reason: "expired_token" | "replayed_token" | "revoked_token" | "already_verified";
      email: string;
      userId: string;
    };

function getRegistrationVerificationSecret(): string {
  const secret = normalizeEnvValue(process.env.AUTH_SECRET ?? "");

  if (!secret) {
    throw new Error("Missing AUTH_SECRET.");
  }

  return secret;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function logRegistrationVerificationEvent(
  event: string,
  payload: Record<string, string | number | boolean | null>,
): void {
  console.info(
    JSON.stringify({
      event,
      domain: "registration_verification",
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  );
}

function resolveNow(now?: () => Date): Date {
  return now ? now() : new Date();
}

function resolveVerificationFailureReason(tokenRecord: {
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  user: {
    email: string;
    emailVerifiedAt: Date | null;
  };
}, now: Date): Exclude<ConsumeRegistrationVerificationResult, { ok: true; email: string; userId: string }> | null {
  if (tokenRecord.consumedAt) {
    return {
      ok: false,
      reason: "replayed_token",
      email: tokenRecord.user.email,
      userId: tokenRecord.userId,
    };
  }

  if (tokenRecord.revokedAt) {
    return {
      ok: false,
      reason: "revoked_token",
      email: tokenRecord.user.email,
      userId: tokenRecord.userId,
    };
  }

  if (tokenRecord.user.emailVerifiedAt) {
    return {
      ok: false,
      reason: "already_verified",
      email: tokenRecord.user.email,
      userId: tokenRecord.userId,
    };
  }

  if (tokenRecord.expiresAt <= now) {
    return {
      ok: false,
      reason: "expired_token",
      email: tokenRecord.user.email,
      userId: tokenRecord.userId,
    };
  }

  return null;
}

async function enforceRegistrationVerificationRateLimit(
  recipientEmail: string,
  now: Date,
): Promise<number | null> {
  const normalizedEmail = normalizeEmail(recipientEmail);
  const windowStart = new Date(now.getTime() - REGISTRATION_VERIFICATION_WINDOW_SECONDS * 1000);

  const [sentInWindow, oldestInWindow] = await Promise.all([
    db.emailDeliveryLog.count({
      where: {
        recipientEmail: normalizedEmail,
        templateName: "registration_verification",
        createdAt: {
          gte: windowStart,
        },
      },
    }),
    db.emailDeliveryLog.findFirst({
      where: {
        recipientEmail: normalizedEmail,
        templateName: "registration_verification",
        createdAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
      },
    }),
  ]);

  if (sentInWindow < REGISTRATION_VERIFICATION_MAX_PER_WINDOW) {
    return null;
  }

  if (!oldestInWindow) {
    return REGISTRATION_VERIFICATION_WINDOW_SECONDS;
  }

  return Math.max(
    Math.ceil(
      (oldestInWindow.createdAt.getTime() + REGISTRATION_VERIFICATION_WINDOW_SECONDS * 1000 - now.getTime()) / 1000,
    ),
    1,
  );
}

export function hashRegistrationVerificationToken(token: string): string {
  return createHmac("sha256", getRegistrationVerificationSecret()).update(token).digest("hex");
}

export function buildRegistrationVerificationUrl(baseUrl: string, token: string): string {
  const trimmedBaseUrl = baseUrl.replace(/\/$/, "");
  return `${trimmedBaseUrl}/auth/verify?token=${encodeURIComponent(token)}`;
}

export async function issueRegistrationVerificationForUser(
  params: {
    userId: string;
    email: string;
    baseUrl: string;
  },
  dependencies: IssueRegistrationVerificationDependencies = {},
): Promise<RegistrationVerificationDispatchResult> {
  const now = resolveNow(dependencies.now);
  const normalizedEmail = normalizeEmail(params.email);
  const retryAfterSeconds = await enforceRegistrationVerificationRateLimit(normalizedEmail, now);

  if (retryAfterSeconds !== null) {
    logRegistrationVerificationEvent("verification_dispatch_rejected", {
      reason: "rate_limited",
      userId: params.userId,
      recipientEmail: normalizedEmail,
      retryAfterSeconds,
    });

    return {
      outcome: "rate_limited",
      provider: null,
      messageId: null,
      error: null,
      retryAfterSeconds,
      verificationToken: null,
      verificationUrl: null,
      expiresAt: null,
    };
  }

  const verificationToken = randomBytes(REGISTRATION_VERIFICATION_TOKEN_BYTES).toString("base64url");
  const tokenHash = hashRegistrationVerificationToken(verificationToken);
  const expiresAt = new Date(now.getTime() + REGISTRATION_VERIFICATION_TTL_MINUTES * 60 * 1000);
  const verificationUrl = buildRegistrationVerificationUrl(params.baseUrl, verificationToken);

  await db.$transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({
      where: {
        userId: params.userId,
        consumedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    await tx.emailVerificationToken.create({
      data: {
        userId: params.userId,
        tokenHash,
        expiresAt,
      },
    });
  });

  const sendEmailFn = dependencies.sendRegistrationVerificationEmailFn ?? sendRegistrationVerificationEmail;
  const delivery = await sendEmailFn({
    to: normalizedEmail,
    userId: params.userId,
    verificationUrl,
    expiresInMinutes: REGISTRATION_VERIFICATION_TTL_MINUTES,
  });

  logRegistrationVerificationEvent("verification_dispatch_completed", {
    userId: params.userId,
    recipientEmail: normalizedEmail,
    outcome: delivery.outcome,
    provider: delivery.provider,
    messageId: delivery.messageId,
    error: delivery.error,
  });

  return {
    ...delivery,
    retryAfterSeconds: null,
    verificationToken,
    verificationUrl,
    expiresAt,
  };
}

export async function resendRegistrationVerificationForEmail(
  params: {
    email: string;
    baseUrl: string;
  },
  dependencies: IssueRegistrationVerificationDependencies = {},
): Promise<ResendRegistrationVerificationResult> {
  const normalizedEmail = normalizeEmail(params.email);
  const user = await db.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (!user || user.emailVerifiedAt) {
    logRegistrationVerificationEvent("verification_dispatch_ignored", {
      recipientEmail: normalizedEmail,
      reason: user?.emailVerifiedAt ? "already_verified" : "unknown_account",
    });

    return {
      outcome: "ignored",
      provider: null,
      messageId: null,
      error: null,
      retryAfterSeconds: null,
      verificationToken: null,
      verificationUrl: null,
      expiresAt: null,
    };
  }

  return issueRegistrationVerificationForUser(
    {
      userId: user.id,
      email: user.email,
      baseUrl: params.baseUrl,
    },
    dependencies,
  );
}

export async function consumeRegistrationVerificationToken(
  rawToken: string,
  dependencies: TimeDependencies = {},
): Promise<ConsumeRegistrationVerificationResult> {
  const token = rawToken.trim();

  if (!token) {
    return {
      ok: false,
      reason: "missing_token",
      email: null,
      userId: null,
    };
  }

  const tokenHash = hashRegistrationVerificationToken(token);
  const now = resolveNow(dependencies.now);

  return db.$transaction(async (tx): Promise<ConsumeRegistrationVerificationResult> => {
    const lockedTokens = await tx.$queryRaw<
      Array<{
        id: string;
        userId: string;
        expiresAt: Date;
        consumedAt: Date | null;
        revokedAt: Date | null;
        email: string;
        emailVerifiedAt: Date | null;
      }>
    >(Prisma.sql`
      SELECT
        evt."id",
        evt."userId",
        evt."expiresAt",
        evt."consumedAt",
        evt."revokedAt",
        u."email" AS "email",
        u."emailVerifiedAt" AS "emailVerifiedAt"
      FROM "public"."EmailVerificationToken" evt
      INNER JOIN "public"."User" u
        ON u."id" = evt."userId"
      WHERE evt."tokenHash" = ${tokenHash}
      FOR UPDATE
    `);

    const tokenRow = lockedTokens[0];
    const tokenRecord = tokenRow
      ? {
          id: tokenRow.id,
          userId: tokenRow.userId,
          expiresAt: tokenRow.expiresAt,
          consumedAt: tokenRow.consumedAt,
          revokedAt: tokenRow.revokedAt,
          user: {
            email: tokenRow.email,
            emailVerifiedAt: tokenRow.emailVerifiedAt,
          },
        }
      : null;

    if (!tokenRecord) {
      logRegistrationVerificationEvent("verification_consumption_rejected", {
        reason: "invalid_token",
        tokenHash,
      });

      return {
        ok: false,
        reason: "invalid_token",
        email: null,
        userId: null,
      };
    }

    const failure = resolveVerificationFailureReason(tokenRecord, now);

    if (failure) {
      logRegistrationVerificationEvent("verification_consumption_rejected", {
        reason: failure.reason,
        userId: tokenRecord.userId,
        recipientEmail: tokenRecord.user.email,
      });

      return failure;
    }

    await tx.emailVerificationToken.update({
      where: {
        id: tokenRecord.id,
      },
      data: {
        consumedAt: now,
      },
    });

    await tx.user.update({
      where: {
        id: tokenRecord.userId,
      },
      data: {
        emailVerifiedAt: tokenRecord.user.emailVerifiedAt ?? now,
      },
    });

    await tx.emailVerificationToken.updateMany({
      where: {
        userId: tokenRecord.userId,
        id: {
          not: tokenRecord.id,
        },
        consumedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    logRegistrationVerificationEvent("verification_consumption_succeeded", {
      userId: tokenRecord.userId,
      recipientEmail: tokenRecord.user.email,
    });

    return {
      ok: true,
      email: tokenRecord.user.email,
      userId: tokenRecord.userId,
    };
  });
}

export function isVerifiedAuthUser(user: { emailVerifiedAt: Date | null }): boolean {
  return Boolean(user.emailVerifiedAt);
}
