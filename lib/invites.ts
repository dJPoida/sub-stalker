import { createHmac, randomBytes } from "node:crypto";

import { InviteStatus } from "@prisma/client";

import { db } from "./db";
import { normalizeEnvValue } from "./env";
import { isValidInviteEmail, normalizeInviteEmail } from "./invite-email";
import { buildInviteUrl } from "./invite-link";

export const DEFAULT_INVITE_EXPIRY_DAYS = 7;
export const MIN_INVITE_EXPIRY_DAYS = 1;
export const MAX_INVITE_EXPIRY_DAYS = 30;

const INVITE_TOKEN_BYTES = 32;
export const INVITE_ISSUANCE_WINDOW_SECONDS = 60 * 60;
export const INVITE_ISSUANCE_MAX_PER_WINDOW = 20;

export type InviteIssueResult = {
  inviteId: string;
  email: string;
  expiresAt: string;
  inviteToken: string;
  inviteUrl: string;
  rotatedExistingInvite: boolean;
};

export type InviteRegistrationResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
      };
    }
  | {
      ok: false;
      reason: "invalid_invite" | "unable_to_create";
    };

export class InviteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InviteValidationError";
  }
}

export class InviteIssuanceRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Invite issuance rate limited.");
    this.name = "InviteIssuanceRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function getInviteSecret(): string {
  const secret = normalizeEnvValue(process.env.AUTH_SECRET ?? "");

  if (!secret) {
    throw new Error("Missing AUTH_SECRET.");
  }

  return secret;
}

export function parseInviteExpiryDays(rawValue: string | null | undefined): number | null {
  const normalized = String(rawValue ?? "").trim();

  if (!normalized) {
    return DEFAULT_INVITE_EXPIRY_DAYS;
  }

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isInteger(parsed) || parsed < MIN_INVITE_EXPIRY_DAYS || parsed > MAX_INVITE_EXPIRY_DAYS) {
    return null;
  }

  return parsed;
}

export function hashInviteToken(token: string): string {
  return createHmac("sha256", getInviteSecret()).update(token).digest("hex");
}

function logInviteEvent(event: string, payload: Record<string, unknown>): void {
  console.info(
    JSON.stringify({
      event,
      domain: "invites",
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  );
}

async function enforceInviteIssuanceRateLimit(createdByUserId: string): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - INVITE_ISSUANCE_WINDOW_SECONDS * 1000);

  const [issuedInWindow, oldestInWindow] = await Promise.all([
    db.invite.count({
      where: {
        createdByUserId,
        createdAt: {
          gte: windowStart,
        },
      },
    }),
    db.invite.findFirst({
      where: {
        createdByUserId,
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

  if (issuedInWindow < INVITE_ISSUANCE_MAX_PER_WINDOW) {
    return;
  }

  const retryAfterSeconds = oldestInWindow
    ? Math.max(
        Math.ceil(
          (oldestInWindow.createdAt.getTime() + INVITE_ISSUANCE_WINDOW_SECONDS * 1000 - now.getTime()) / 1000,
        ),
        1,
      )
    : INVITE_ISSUANCE_WINDOW_SECONDS;

  logInviteEvent("invite_rejected", {
    reason: "issuance_rate_limited",
    createdByUserId,
    retryAfterSeconds,
  });

  throw new InviteIssuanceRateLimitError(retryAfterSeconds);
}

export async function issueInvite(params: {
  email: string;
  expiresInDays: number;
  createdByUserId: string;
  baseUrl: string;
}): Promise<InviteIssueResult> {
  const email = normalizeInviteEmail(params.email);

  if (!isValidInviteEmail(email)) {
    throw new InviteValidationError("Invalid invite email.");
  }

  await enforceInviteIssuanceRateLimit(params.createdByUserId);

  const inviteToken = randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
  const tokenHash = hashInviteToken(inviteToken);
  const expiresAt = new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000);

  const created = await db.$transaction(async (tx) => {
    const rotated = await tx.invite.updateMany({
      where: {
        email,
        status: InviteStatus.PENDING,
      },
      data: {
        status: InviteStatus.REVOKED,
      },
    });

    const invite = await tx.invite.create({
      data: {
        email,
        tokenHash,
        expiresAt,
        status: InviteStatus.PENDING,
        createdByUserId: params.createdByUserId,
      },
      select: {
        id: true,
        email: true,
        expiresAt: true,
      },
    });

    return {
      invite,
      rotatedExistingInvite: rotated.count > 0,
    };
  });

  logInviteEvent("invite_created", {
    inviteId: created.invite.id,
    email,
    createdByUserId: params.createdByUserId,
    rotatedExistingInvite: created.rotatedExistingInvite,
    expiresAt: created.invite.expiresAt.toISOString(),
  });

  return {
    inviteId: created.invite.id,
    email: created.invite.email,
    expiresAt: created.invite.expiresAt.toISOString(),
    inviteToken,
    inviteUrl: buildInviteUrl(params.baseUrl, inviteToken, created.invite.email),
    rotatedExistingInvite: created.rotatedExistingInvite,
  };
}

export async function createUserWithInvite(params: {
  email: string;
  name: string | null;
  passwordHash: string;
  inviteToken: string;
}): Promise<InviteRegistrationResult> {
  const email = normalizeInviteEmail(params.email);
  const inviteToken = params.inviteToken.trim();

  if (!inviteToken) {
    logInviteEvent("invite_rejected", {
      reason: "missing_token",
      email,
    });

    return {
      ok: false,
      reason: "invalid_invite",
    };
  }

  const tokenHash = hashInviteToken(inviteToken);
  const now = new Date();

  return db.$transaction(async (tx): Promise<InviteRegistrationResult> => {
    const existingUser = await tx.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return {
        ok: false,
        reason: "unable_to_create",
      };
    }

    const invite = await tx.invite.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        email: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!invite) {
      logInviteEvent("invite_rejected", {
        reason: "invalid_token",
        email,
      });

      return {
        ok: false,
        reason: "invalid_invite",
      };
    }

    if (invite.email !== email) {
      logInviteEvent("invite_rejected", {
        inviteId: invite.id,
        reason: "email_mismatch",
        inviteEmail: invite.email,
        submittedEmail: email,
      });

      return {
        ok: false,
        reason: "invalid_invite",
      };
    }

    if (invite.status !== InviteStatus.PENDING) {
      logInviteEvent("invite_rejected", {
        inviteId: invite.id,
        reason: "status_not_pending",
        status: invite.status,
        email,
      });

      return {
        ok: false,
        reason: "invalid_invite",
      };
    }

    if (invite.expiresAt <= now) {
      await tx.invite.updateMany({
        where: {
          id: invite.id,
          status: InviteStatus.PENDING,
        },
        data: {
          status: InviteStatus.EXPIRED,
        },
      });

      logInviteEvent("invite_rejected", {
        inviteId: invite.id,
        reason: "expired",
        email,
      });

      return {
        ok: false,
        reason: "invalid_invite",
      };
    }

    const consumeResult = await tx.invite.updateMany({
      where: {
        id: invite.id,
        status: InviteStatus.PENDING,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        status: InviteStatus.CONSUMED,
        consumedAt: now,
      },
    });

    if (consumeResult.count !== 1) {
      logInviteEvent("invite_rejected", {
        inviteId: invite.id,
        reason: "already_consumed",
        email,
      });

      return {
        ok: false,
        reason: "invalid_invite",
      };
    }

    const user = await tx.user.create({
      data: {
        email,
        name: params.name,
        passwordHash: params.passwordHash,
        settings: {
          create: {},
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    await tx.invite.update({
      where: {
        id: invite.id,
      },
      data: {
        consumedByUserId: user.id,
      },
    });

    logInviteEvent("invite_consumed", {
      inviteId: invite.id,
      email,
      consumedByUserId: user.id,
    });

    return {
      ok: true,
      user,
    };
  });
}

export async function expirePendingInvites(now = new Date()): Promise<number> {
  const result = await db.invite.updateMany({
    where: {
      status: InviteStatus.PENDING,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: InviteStatus.EXPIRED,
    },
  });

  if (result.count > 0) {
    logInviteEvent("invite_expired_batch", {
      expiredCount: result.count,
      runAt: now.toISOString(),
    });
  }

  return result.count;
}
