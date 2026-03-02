import { redirect } from "next/navigation";

import { signInAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";

type SignInPageProps = {
  searchParams?: {
    error?: string;
  };
};

function getErrorMessage(errorCode?: string): string | null {
  if (!errorCode) {
    return null;
  }

  if (errorCode === "missing_fields") {
    return "Enter both email and password.";
  }

  if (errorCode === "invalid_credentials") {
    return "Invalid email or password.";
  }

  return "Unable to sign in.";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const errorMessage = getErrorMessage(searchParams?.error);

  return (
    <section className="card">
      <h1>Sign In</h1>
      <p>Use your account credentials to continue.</p>
      {errorMessage ? <p className="status-error">{errorMessage}</p> : null}
      <form className="form" action={signInAction}>
        <label className="form-field">
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="form-field">
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit">Sign In</button>
      </form>
    </section>
  );
}
