import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { sendInviteEmail } from "../../lib/mail";

describe("sendInviteEmail", () => {
  test("returns sent outcome for mock provider and uses invite template payload", async () => {
    let capturedTemplateName = "";
    let capturedSubject = "";

    const result = await sendInviteEmail(
      {
        to: "invitee@example.com",
        userId: "user-123",
        inviteUrl: "https://example.com/auth/sign-up?invite=abc123",
        expiresAt: new Date("2026-03-20T10:00:00.000Z"),
      },
      {
        providerName: "mock",
        sendEmailFn: async (payload) => {
          capturedTemplateName = payload.templateName ?? "";
          capturedSubject = payload.subject;
          return {
            success: true,
            messageId: "mock-message-1",
          };
        },
      },
    );

    assert.equal(result.outcome, "sent");
    assert.equal(result.provider, "mock");
    assert.equal(result.messageId, "mock-message-1");
    assert.equal(capturedTemplateName, "invite_issuance");
    assert.match(capturedSubject, /invite link/i);
  });

  test("returns skipped outcome when console provider is active", async () => {
    const result = await sendInviteEmail(
      {
        to: "invitee@example.com",
        inviteUrl: "https://example.com/auth/sign-up?invite=abc123",
        expiresAt: new Date("2026-03-20T10:00:00.000Z"),
      },
      {
        providerName: "console",
        sendEmailFn: async () => ({
          success: true,
          messageId: "console-message-1",
        }),
      },
    );

    assert.equal(result.outcome, "skipped");
    assert.equal(result.provider, "console");
    assert.equal(result.error, null);
  });

  test("returns failed outcome with error when provider send fails", async () => {
    const result = await sendInviteEmail(
      {
        to: "invitee@example.com",
        inviteUrl: "https://example.com/auth/sign-up?invite=abc123",
        expiresAt: new Date("2026-03-20T10:00:00.000Z"),
      },
      {
        providerName: "mock",
        sendEmailFn: async () => ({
          success: false,
          error: "Simulated provider failure",
        }),
      },
    );

    assert.equal(result.outcome, "failed");
    assert.equal(result.provider, "mock");
    assert.equal(result.error, "Simulated provider failure");
  });
});
