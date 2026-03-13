import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";

import { authenticateWithPassword, hashPassword } from "../../lib/auth";
import { db } from "../../lib/db";
import { clearMockEmailLog } from "../../lib/mail/providers";
import {
  REGISTRATION_VERIFICATION_MAX_PER_WINDOW,
  consumeRegistrationVerificationToken,
  hashRegistrationVerificationToken,
  issueRegistrationVerificationForUser,
  resendRegistrationVerificationForEmail,
} from "../../lib/registration-verification";

const createdEmails = new Set<string>();
const originalMailProvider = process.env.MAIL_PROVIDER;

function uniqueEmail(tag: string): string {
  const email = `verify-${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.com`;
  createdEmails.add(email.toLowerCase());
  return email;
}

async function cleanupCreatedRecords(): Promise<void> {
  const emails = [...createdEmails];

  if (emails.length === 0) {
    return;
  }

  await db.emailDeliveryLog.deleteMany({
    where: {
      recipientEmail: {
        in: emails,
      },
    },
  });

  await db.user.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  });

  createdEmails.clear();
  clearMockEmailLog();
}

async function canConnectToDatabase(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function createUser(params: {
  email: string;
  verified?: boolean;
  password?: string;
}): Promise<{ id: string; email: string }> {
  return db.user.create({
    data: {
      email: params.email.toLowerCase(),
      passwordHash: hashPassword(params.password ?? "test-password"),
      emailVerifiedAt: params.verified ? new Date() : null,
      settings: {
        create: {},
      },
    },
    select: {
      id: true,
      email: true,
    },
  });
}

describe("registration verification", () => {
  before(async () => {
    assert.equal(await canConnectToDatabase(), true, "Database is unavailable for auth verification tests.");
  });

  beforeEach(() => {
    createdEmails.clear();
    clearMockEmailLog();
    process.env.MAIL_PROVIDER = "mock";
  });

  afterEach(async () => {
    await cleanupCreatedRecords();
  });

  after(() => {
    if (originalMailProvider === undefined) {
      delete process.env.MAIL_PROVIDER;
      return;
    }

    process.env.MAIL_PROVIDER = originalMailProvider;
  });

  test("rejects expired verification tokens", async () => {
    const user = await createUser({
      email: uniqueEmail("expired"),
    });

    const issued = await issueRegistrationVerificationForUser({
      userId: user.id,
      email: user.email,
      baseUrl: "http://localhost:3000",
    });

    if (issued.outcome === "rate_limited") {
      assert.fail("Expected initial verification dispatch to avoid rate limiting.");
    }

    await db.emailVerificationToken.update({
      where: {
        tokenHash: hashRegistrationVerificationToken(issued.verificationToken),
      },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const consumed = await consumeRegistrationVerificationToken(issued.verificationToken);
    assert.deepEqual(consumed, {
      ok: false,
      reason: "expired_token",
      email: user.email,
      userId: user.id,
    });

    const storedUser = await db.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        emailVerifiedAt: true,
      },
    });

    assert.equal(storedUser?.emailVerifiedAt, null);
  });

  test("consumes a verification token once and rejects replay", async () => {
    const user = await createUser({
      email: uniqueEmail("replay"),
    });

    const issued = await issueRegistrationVerificationForUser({
      userId: user.id,
      email: user.email,
      baseUrl: "http://localhost:3000",
    });

    if (issued.outcome === "rate_limited") {
      assert.fail("Expected initial verification dispatch to avoid rate limiting.");
    }

    const firstConsumption = await consumeRegistrationVerificationToken(issued.verificationToken);
    assert.deepEqual(firstConsumption, {
      ok: true,
      email: user.email,
      userId: user.id,
    });

    const secondConsumption = await consumeRegistrationVerificationToken(issued.verificationToken);
    assert.deepEqual(secondConsumption, {
      ok: false,
      reason: "replayed_token",
      email: user.email,
      userId: user.id,
    });

    const tokenRecord = await db.emailVerificationToken.findUnique({
      where: {
        tokenHash: hashRegistrationVerificationToken(issued.verificationToken),
      },
      select: {
        consumedAt: true,
      },
    });

    const storedUser = await db.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        emailVerifiedAt: true,
      },
    });

    assert.ok(tokenRecord?.consumedAt instanceof Date);
    assert.ok(storedUser?.emailVerifiedAt instanceof Date);
  });

  test("rate limits resend attempts and rotates the active token", async () => {
    const user = await createUser({
      email: uniqueEmail("resend"),
    });

    for (let attempt = 0; attempt < REGISTRATION_VERIFICATION_MAX_PER_WINDOW; attempt += 1) {
      const result = await resendRegistrationVerificationForEmail({
        email: user.email,
        baseUrl: "http://localhost:3000",
      });

      assert.equal(result.outcome, "sent");
    }

    const blocked = await resendRegistrationVerificationForEmail({
      email: user.email,
      baseUrl: "http://localhost:3000",
    });

    assert.equal(blocked.outcome, "rate_limited");
    assert.ok((blocked.retryAfterSeconds ?? 0) > 0);

    const tokens = await db.emailVerificationToken.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        revokedAt: true,
      },
    });

    const deliveryLogs = await db.emailDeliveryLog.count({
      where: {
        recipientEmail: user.email,
        templateName: "registration_verification",
      },
    });

    assert.equal(tokens.length, REGISTRATION_VERIFICATION_MAX_PER_WINDOW);
    assert.ok(tokens.slice(0, -1).every((token) => token.revokedAt instanceof Date));
    assert.equal(tokens.at(-1)?.revokedAt, null);
    assert.equal(deliveryLogs, REGISTRATION_VERIFICATION_MAX_PER_WINDOW);
  });

  test("blocks password authentication until the email is verified", async () => {
    const password = "correct-horse-battery-staple";
    const email = uniqueEmail("gate");
    await createUser({
      email,
      password,
    });

    const blocked = await authenticateWithPassword(email.toLowerCase(), password);
    assert.equal(blocked.ok, false);

    if (blocked.ok) {
      assert.fail("Expected unverified user to be blocked.");
    }

    assert.equal(blocked.reason, "email_unverified");
    assert.equal(blocked.user?.email, email.toLowerCase());
    assert.ok(blocked.user?.id);

    await db.user.update({
      where: {
        email: email.toLowerCase(),
      },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    const allowed = await authenticateWithPassword(email.toLowerCase(), password);
    assert.equal(allowed.ok, true);

    if (!allowed.ok) {
      assert.fail("Expected verified user to authenticate successfully.");
    }

    assert.equal(allowed.user.email, email.toLowerCase());
  });
});
