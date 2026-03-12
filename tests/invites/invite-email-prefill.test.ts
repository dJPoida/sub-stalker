import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseInviteEmailPrefill } from "../../lib/invite-email";

describe("parseInviteEmailPrefill", () => {
  test("normalizes and returns valid invite email values", () => {
    const prefill = parseInviteEmailPrefill("  Invited.User+demo@Example.com  ");

    assert.equal(prefill, "invited.user+demo@example.com");
  });

  test("returns empty string for invalid invite email values", () => {
    const prefill = parseInviteEmailPrefill("not-an-email");

    assert.equal(prefill, "");
  });
});
