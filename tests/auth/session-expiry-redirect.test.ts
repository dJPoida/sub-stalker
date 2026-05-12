import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  isSessionExpiredRedirectError,
  redirectOnUnauthorized,
  SESSION_EXPIRED_SIGN_IN_PATH,
  SessionExpiredRedirectError,
} from "../../app/components/session-expiry";
import { getSignInErrorMessage, SESSION_EXPIRED_ERROR_CODE } from "../../lib/auth-errors";

describe("session expiry redirect", () => {
  test("redirects unauthorized client responses to sign-in with session-expired error", () => {
    const originalWindow = globalThis.window;
    const assignedPaths: string[] = [];

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          assign: (path: string) => {
            assignedPaths.push(path);
          },
        },
      },
    });

    try {
      assert.throws(
        () => redirectOnUnauthorized(new Response(null, { status: 401 })),
        (error: unknown) => error instanceof SessionExpiredRedirectError && isSessionExpiredRedirectError(error),
      );
      assert.deepEqual(assignedPaths, [SESSION_EXPIRED_SIGN_IN_PATH]);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  test("does not redirect successful client responses", () => {
    assert.doesNotThrow(() => redirectOnUnauthorized(new Response(null, { status: 200 })));
  });

  test("maps the session-expired sign-in error to user-facing copy", () => {
    assert.equal(
      getSignInErrorMessage(SESSION_EXPIRED_ERROR_CODE),
      "Your session has expired. Please sign in again.",
    );
  });
});
