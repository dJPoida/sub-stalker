"use client";

import { SESSION_EXPIRED_ERROR_CODE } from "@/lib/auth-errors";

export const SESSION_EXPIRED_SIGN_IN_PATH = `/auth/sign-in?error=${SESSION_EXPIRED_ERROR_CODE}`;

export class SessionExpiredRedirectError extends Error {
  constructor() {
    super("Session expired.");
    this.name = "SessionExpiredRedirectError";
  }
}

export function isSessionExpiredRedirectError(error: unknown): error is SessionExpiredRedirectError {
  return error instanceof SessionExpiredRedirectError;
}

export function redirectToSessionExpiredSignIn(): never {
  window.location.assign(SESSION_EXPIRED_SIGN_IN_PATH);
  throw new SessionExpiredRedirectError();
}

export function redirectOnUnauthorized(response: Response): void {
  if (response.status === 401) {
    redirectToSessionExpiredSignIn();
  }
}
