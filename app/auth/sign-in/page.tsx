import Link from "next/link";
import { redirect } from "next/navigation";

import { signInAction } from "@/app/auth/actions";
import { PendingFieldset, PendingSubmitButton } from "@/app/components/PendingFormControls";
import { getSignInErrorMessage } from "@/lib/auth-errors";
import { getCurrentUser } from "@/lib/auth";

type SignInPageProps = {
  searchParams?: {
    email?: string;
    error?: string;
    retry_after?: string;
  };
};

function normalizeEmail(value: string | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const errorMessage = getSignInErrorMessage(searchParams?.error, searchParams?.retry_after);
  const emailPrefill = normalizeEmail(searchParams?.email);

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
              <input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={emailPrefill}
                placeholder="name@example.com"
                required
              />
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
