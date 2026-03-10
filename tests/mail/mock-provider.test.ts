import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { getMailProvider } from "../../lib/mail/config";
import { clearMockEmailLog, createMailProvider, getMockEmailLog } from "../../lib/mail/providers";

describe("mail provider selection", () => {
  test("uses mock provider when MAIL_PROVIDER=mock", () => {
    const provider = getMailProvider({
      MAIL_PROVIDER: "mock",
      NODE_ENV: "test",
    } as NodeJS.ProcessEnv);

    assert.equal(provider, "mock");
  });

  test("falls back to console provider when no API key is configured", () => {
    const provider = getMailProvider({
      MAIL_PROVIDER_API_KEY: "",
      NODE_ENV: "test",
    } as NodeJS.ProcessEnv);

    assert.equal(provider, "console");
  });
});

describe("mock mail provider", () => {
  afterEach(() => {
    clearMockEmailLog();
  });

  test("captures sends without network calls", async () => {
    const provider = createMailProvider("mock");

    const result = await provider.send({
      to: "person@example.com",
      subject: "Mock send",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    assert.equal(result.success, true);
    assert.match(result.messageId ?? "", /^mock-/);

    const entries = getMockEmailLog();
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.to, "person@example.com");
    assert.equal(entries[0]?.subject, "Mock send");
    assert.equal(entries[0]?.htmlLength, "<p>Hello</p>".length);
    assert.equal(entries[0]?.textLength, "Hello".length);
  });
});
