import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, test } from "node:test";

import { hashPassword } from "../../lib/auth";
import { db } from "../../lib/db";
import {
  INVITE_ISSUANCE_MAX_PER_WINDOW,
  InviteIssuanceRateLimitError,
  createUserWithInvite,
  hashInviteToken,
  issueInvite,
} from "../../lib/invites";
import { sendInviteEmail } from "../../lib/mail";

const createdEmails = new Set<string>();

function uniqueEmail(tag: string): string {
  const email = `invite-${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.com`;
  createdEmails.add(email.toLowerCase());
  return email;
}

async function cleanupCreatedRecords(): Promise<void> {
  const emails = [...createdEmails];

  if (emails.length === 0) {
    return;
  }

  await db.invite.deleteMany({
    where: {
      email: {
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

  await db.emailDeliveryLog.deleteMany({
    where: {
      recipientEmail: {
        in: emails,
      },
    },
  });

  createdEmails.clear();
}

async function canConnectToDatabase(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

describe("invite flow", () => {
  before(async () => {
    assert.equal(await canConnectToDatabase(), true, "Database is unavailable for invite tests.");
  });

  beforeEach(async () => {
    createdEmails.clear();
  });

  afterEach(async () => {
    await cleanupCreatedRecords();
  });

  test("stores token hash and never stores raw token", async () => {
      const operatorEmail = uniqueEmail("operator");
      const targetEmail = uniqueEmail("target");

      const operator = await db.user.create({
        data: {
          email: operatorEmail.toLowerCase(),
          passwordHash: hashPassword("operator-password"),
          settings: {
            create: {},
          },
        },
        select: { id: true },
      });

      const issued = await issueInvite({
        email: targetEmail.toUpperCase(),
        expiresInDays: 7,
        createdByUserId: operator.id,
        baseUrl: "http://localhost:3000",
      });

      const storedInvite = await db.invite.findUnique({
        where: {
          id: issued.inviteId,
        },
        select: {
          email: true,
          tokenHash: true,
        },
      });

      assert.ok(storedInvite);
      assert.equal(storedInvite.email, targetEmail.toLowerCase());
      assert.notEqual(storedInvite.tokenHash, issued.inviteToken);
      assert.equal(storedInvite.tokenHash, hashInviteToken(issued.inviteToken));

      const inviteUrl = new URL(issued.inviteUrl);
      assert.equal(inviteUrl.searchParams.get("invite"), issued.inviteToken);
      assert.equal(inviteUrl.searchParams.get("email"), targetEmail.toLowerCase());
    });

  test("rejects invite token when submitted email does not match invite email", async () => {
      const operatorEmail = uniqueEmail("operator");
      const invitedEmail = uniqueEmail("invited");
      const mismatchEmail = uniqueEmail("mismatch");

      const operator = await db.user.create({
        data: {
          email: operatorEmail.toLowerCase(),
          passwordHash: hashPassword("operator-password"),
          settings: {
            create: {},
          },
        },
        select: { id: true },
      });

      const issued = await issueInvite({
        email: invitedEmail,
        expiresInDays: 7,
        createdByUserId: operator.id,
        baseUrl: "http://localhost:3000",
      });

      const result = await createUserWithInvite({
        email: mismatchEmail,
        name: "Mismatch User",
        passwordHash: hashPassword("test-password"),
        inviteToken: issued.inviteToken,
      });

      assert.deepEqual(result, {
        ok: false,
        reason: "invalid_invite",
      });

      const invite = await db.invite.findUnique({
        where: {
          tokenHash: hashInviteToken(issued.inviteToken),
        },
        select: {
          status: true,
        },
      });

      assert.equal(invite?.status, "PENDING");
    });

  test("rejects expired invite token and marks invite as EXPIRED", async () => {
      const operatorEmail = uniqueEmail("operator");
      const invitedEmail = uniqueEmail("invited");

      const operator = await db.user.create({
        data: {
          email: operatorEmail.toLowerCase(),
          passwordHash: hashPassword("operator-password"),
          settings: {
            create: {},
          },
        },
        select: { id: true },
      });

      const issued = await issueInvite({
        email: invitedEmail,
        expiresInDays: 7,
        createdByUserId: operator.id,
        baseUrl: "http://localhost:3000",
      });

      await db.invite.update({
        where: {
          tokenHash: hashInviteToken(issued.inviteToken),
        },
        data: {
          expiresAt: new Date(Date.now() - 5 * 60 * 1000),
        },
      });

      const result = await createUserWithInvite({
        email: invitedEmail,
        name: "Expired Invite",
        passwordHash: hashPassword("test-password"),
        inviteToken: issued.inviteToken,
      });

      assert.deepEqual(result, {
        ok: false,
        reason: "invalid_invite",
      });

      const invite = await db.invite.findUnique({
        where: {
          tokenHash: hashInviteToken(issued.inviteToken),
        },
        select: {
          status: true,
        },
      });

      assert.equal(invite?.status, "EXPIRED");
    });

  test("consumes invite once under parallel registration attempts", async () => {
      const operatorEmail = uniqueEmail("operator");
      const invitedEmail = uniqueEmail("invited");

      const operator = await db.user.create({
        data: {
          email: operatorEmail.toLowerCase(),
          passwordHash: hashPassword("operator-password"),
          settings: {
            create: {},
          },
        },
        select: { id: true },
      });

      const issued = await issueInvite({
        email: invitedEmail,
        expiresInDays: 7,
        createdByUserId: operator.id,
        baseUrl: "http://localhost:3000",
      });

      const firstAttempt = createUserWithInvite({
        email: invitedEmail,
        name: "Parallel One",
        passwordHash: hashPassword("parallel-password"),
        inviteToken: issued.inviteToken,
      });

      const secondAttempt = createUserWithInvite({
        email: invitedEmail,
        name: "Parallel Two",
        passwordHash: hashPassword("parallel-password"),
        inviteToken: issued.inviteToken,
      });

      const [firstResult, secondResult] = await Promise.all([firstAttempt, secondAttempt]);
      const successCount = [firstResult, secondResult].filter((result) => result.ok).length;
      const invalidInviteCount = [firstResult, secondResult].filter(
        (result) => !result.ok && result.reason === "invalid_invite",
      ).length;

      assert.equal(successCount, 1);
      assert.equal(invalidInviteCount, 1);

      const [usersWithEmail, inviteStatus] = await Promise.all([
        db.user.count({
          where: {
            email: invitedEmail.toLowerCase(),
          },
        }),
        db.invite.findUnique({
          where: {
            tokenHash: hashInviteToken(issued.inviteToken),
          },
          select: {
            status: true,
            consumedByUserId: true,
          },
        }),
      ]);

      assert.equal(usersWithEmail, 1);
      assert.equal(inviteStatus?.status, "CONSUMED");
      assert.ok(inviteStatus?.consumedByUserId);
    });

  test("rate limits invite issuance per operator", async () => {
      const operatorEmail = uniqueEmail("operator");

      const operator = await db.user.create({
        data: {
          email: operatorEmail.toLowerCase(),
          passwordHash: hashPassword("operator-password"),
          settings: {
            create: {},
          },
        },
        select: { id: true },
      });

      for (let index = 0; index < INVITE_ISSUANCE_MAX_PER_WINDOW; index += 1) {
        const targetEmail = uniqueEmail(`limit-${index}`);

        await issueInvite({
          email: targetEmail,
          expiresInDays: 7,
          createdByUserId: operator.id,
          baseUrl: "http://localhost:3000",
        });
      }

      await assert.rejects(
        async () => {
          await issueInvite({
            email: uniqueEmail("limit-overflow"),
            expiresInDays: 7,
            createdByUserId: operator.id,
            baseUrl: "http://localhost:3000",
          });
        },
        (error: unknown) => {
          if (!(error instanceof InviteIssuanceRateLimitError)) {
            return false;
          }

          return error.retryAfterSeconds > 0;
        },
      );
  });

  test("logs invite email sends with invite_issuance template name", async () => {
      const previousMailProvider = process.env.MAIL_PROVIDER;
      process.env.MAIL_PROVIDER = "mock";

      try {
        const operatorEmail = uniqueEmail("operator");
        const targetEmail = uniqueEmail("invitee");

        const operator = await db.user.create({
          data: {
            email: operatorEmail.toLowerCase(),
            passwordHash: hashPassword("operator-password"),
            settings: {
              create: {},
            },
          },
          select: { id: true },
        });

        const issued = await issueInvite({
          email: targetEmail,
          expiresInDays: 7,
          createdByUserId: operator.id,
          baseUrl: "http://localhost:3000",
        });

        const sendResult = await sendInviteEmail({
          to: issued.email,
          userId: operator.id,
          inviteUrl: issued.inviteUrl,
          expiresAt: new Date(issued.expiresAt),
        });

        assert.equal(sendResult.outcome, "sent");

        const logEntry = await db.emailDeliveryLog.findFirst({
          where: {
            recipientEmail: issued.email,
            templateName: "invite_issuance",
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            status: true,
            errorMessage: true,
            userId: true,
          },
        });

        assert.ok(logEntry);
        assert.equal(logEntry.status, "SENT");
        assert.equal(logEntry.errorMessage, null);
        assert.equal(logEntry.userId, operator.id);
      } finally {
        process.env.MAIL_PROVIDER = previousMailProvider;
      }
  });
});

after(async () => {
  await cleanupCreatedRecords();
  await db.$disconnect();
});
