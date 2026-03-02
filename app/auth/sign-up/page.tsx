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

  if (errorCode === "email_exists") {
    return "That email is already in use.";
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
    <section className="card">
      <h1>Sign Up</h1>
      <p>Create an account to start tracking subscriptions.</p>
      {errorMessage ? <p className="status-error">{errorMessage}</p> : null}
      <form className="form" action={signUpAction}>
        <label className="form-field">
          Name (optional)
          <input name="name" type="text" autoComplete="name" />
        </label>
        <label className="form-field">
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="form-field">
          Password
          <input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <button type="submit">Create Account</button>
      </form>
    </section>
  );
}
