import Link from "next/link";
import { redirect } from "next/navigation";

import { signInAction } from "@/app/auth/actions";
import { PendingFieldset, PendingSubmitButton } from "@/app/components/PendingFormControls";
import { getCurrentUser } from "@/lib/auth";

type SignInPageProps = {
  searchParams?: {
    error?: string;
    retry_after?: string;
  };
};

function getErrorMessage(errorCode?: string, retryAfter?: string): string | null {
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

  if (errorCode === "rate_limited") {
    const seconds = Number(retryAfter ?? "0");

    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "Too many sign-in attempts. Please wait and try again.";
    }

    return `Too many sign-in attempts. Try again in ${seconds} seconds.`;
  }

  return "Unable to sign in.";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const errorMessage = getErrorMessage(searchParams?.error, searchParams?.retry_after);

  return (
    <section className="auth-wrap">
      <article className="card auth-card">
        <p className="eyebrow">Welcome Back</p>
        <h1>Sign In</h1>
        <p className="page-lead">Access your subscription command center.</p>
        {errorMessage ? <p className="status-error mt-md">{errorMessage}</p> : null}
        <form className="mt-md" action={signInAction}>
          <PendingFieldset className="form-grid form-pending-group">
            <label className="form-field">
              Email
              <input name="email" type="email" autoComplete="email" placeholder="name@example.com" required />
            </label>
            <label className="form-field">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </label>
            <PendingSubmitButton className="button" idleLabel="Sign In" pendingLabel="Signing In..." />
          </PendingFieldset>
        </form>
        <p className="auth-switch">
          New here? <Link href="/auth/sign-up">Create an account</Link>
        </p>
      </article>
    </section>
  );
}
