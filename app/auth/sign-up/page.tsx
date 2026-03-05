import Link from "next/link";
import { redirect } from "next/navigation";

import { signUpAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";

type SignUpPageProps = {
  searchParams?: {
    error?: string;
  };
};

function getErrorMessage(errorCode?: string): string | null {
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

  if (errorCode === "unable_to_create") {
    return "Unable to create account with the provided details.";
  }

  return "Unable to create account.";
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const errorMessage = getErrorMessage(searchParams?.error);

  return (
    <section className="auth-wrap">
      <article className="card auth-card">
        <p className="eyebrow">Get Started</p>
        <h1>Create Account</h1>
        <p className="page-lead">Set up your account to begin tracking recurring charges.</p>
        {errorMessage ? <p className="status-error mt-md">{errorMessage}</p> : null}
        <form className="form-grid mt-md" action={signUpAction}>
          <label className="form-field">
            Name (optional)
            <input name="name" type="text" autoComplete="name" placeholder="Your name" />
          </label>
          <label className="form-field">
            Email
            <input name="email" type="email" autoComplete="email" placeholder="name@example.com" required />
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
          <button className="button" type="submit">
            Create Account
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link href="/auth/sign-in">Sign in</Link>
        </p>
      </article>
    </section>
  );
}
