export const SESSION_EXPIRED_ERROR_CODE = "session_expired";

export function getSignInErrorMessage(errorCode?: string, retryAfter?: string): string | null {
  if (!errorCode) {
    return null;
  }

  if (errorCode === "missing_fields") {
    return "Enter both email and password.";
  }

  if (errorCode === "invalid_credentials") {
    return "Invalid email or password.";
  }

  if (errorCode === "invalid_request") {
    return "Invalid sign-in request. Please try again.";
  }

  if (errorCode === "account_exists") {
    return "An account already exists for that email. Sign in instead.";
  }

  if (errorCode === SESSION_EXPIRED_ERROR_CODE) {
    return "Your session has expired. Please sign in again.";
  }

  if (errorCode === "rate_limited") {
    const seconds = Number(retryAfter ?? "0");

    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "Too many sign-in attempts. Please wait and try again.";
    }

    return `Too many sign-in attempts. Try again in ${seconds} seconds.`;
  }

  return "Unable to sign in.";
}
