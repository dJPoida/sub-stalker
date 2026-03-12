import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildInviteUrl } from "../../lib/invite-link";

describe("buildInviteUrl", () => {
  test("includes invite token and normalized invite email in query params", () => {
    const inviteUrl = buildInviteUrl("https://example.com/", "abc123", "Invited.User+demo@Example.com");
    const parsed = new URL(inviteUrl);

    assert.equal(parsed.pathname, "/auth/sign-up");
    assert.equal(parsed.searchParams.get("invite"), "abc123");
    assert.equal(parsed.searchParams.get("email"), "invited.user+demo@example.com");
  });
});
