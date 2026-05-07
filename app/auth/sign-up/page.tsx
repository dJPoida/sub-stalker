import Link from "next/link";
import { redirect } from "next/navigation";

import { signUpAction } from "@/app/auth/actions";
import CurrencySelectControl from "@/app/components/CurrencySelectControl";
import { PendingFieldset, PendingSubmitButton } from "@/app/components/PendingFormControls";
import { getCurrentUser } from "@/lib/auth";
import { isInvitesRequired } from "@/lib/env";
import { parseInviteEmailPrefill } from "@/lib/invite-email";

type SignUpPageProps = {
  searchParams?: {
    error?: string;
    invite?: string;
    email?: string;
  };
};

function getErrorMessage(errorCode: string | undefined, invitesRequired: boolean): string | null {
  if (!errorCode) {
    return null;
  }

  if (errorCode === "missing_fields") {
    return "Email and password are required.";
  }

  if (errorCode === "password_too_short") {
    return "Password must be at least 8 characters.";
  }

  if (errorCode === "invalid_request") {
    return "Invalid sign-up request. Please try again.";
  }

  if (errorCode === "invalid_currency") {
    return "Choose a valid default currency.";
  }

  if (errorCode === "unable_to_create") {
    return "Unable to create account with the provided details.";
  }

  if (errorCode === "invalid_invite" && invitesRequired) {
    return "A valid invitation is required to create an account.";
  }

  return "Unable to create account.";
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const invitesRequired = isInvitesRequired();
  const errorMessage = getErrorMessage(searchParams?.error, invitesRequired);
  const inviteToken = String(searchParams?.invite ?? "").trim();
  const inviteEmailPrefill = parseInviteEmailPrefill(searchParams?.email);

  return (
    <section className="auth-wrap">
      <article className="card auth-card">
        <p className="eyebrow">Get Started</p>
        <h1>Create Account</h1>
        <p className="page-lead">Set up your account to begin tracking recurring charges.</p>
        {invitesRequired ? (
          <p className="status-help mt-md">Invitation-only mode is active. Enter a valid invitation token to continue.</p>
        ) : null}
        {errorMessage ? <p className="status-error mt-md">{errorMessage}</p> : null}
        <form className="mt-md" action={signUpAction}>
          <PendingFieldset className="form-grid form-pending-group">
            <label className="form-field">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={inviteEmailPrefill}
                placeholder="name@example.com"
                required
              />
            </label>
            <label className="form-field">
              Password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
                required
              />
            </label>
            <label className="form-field signup-currency-field">
              <span className="field-label-with-help">
                Default currency
                <span className="help-tooltip">
                  <span
                    aria-label="About default currency"
                    aria-describedby="signup-default-currency-help"
                    className="help-tooltip-trigger"
                    role="img"
                    tabIndex={0}
                  >
                    i
                  </span>
                  <span className="help-tooltip-content" id="signup-default-currency-help" role="tooltip">
                    Used for subscriptions and dashboard totals. You can change it later.
                  </span>
                </span>
              </span>
              <CurrencySelectControl
                ariaDescribedBy="signup-default-currency-help"
                className="signup-currency-control"
                name="defaultCurrency"
              />
            </label>
            {invitesRequired ? (
              <label className="form-field">
                Invitation token
                <input
                  name="inviteToken"
                  type="text"
                  autoComplete="off"
                  defaultValue={inviteToken}
                  placeholder="Paste your invite token"
                />
              </label>
            ) : null}
            <PendingSubmitButton className="button" idleLabel="Create Account" pendingLabel="Creating Account..." />
          </PendingFieldset>
        </form>
        <p className="auth-switch">
          Already have an account? <Link href="/auth/sign-in">Sign in</Link>
        </p>
      </article>
    </section>
  );
}
