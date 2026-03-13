import Link from "next/link";

import { consumeRegistrationVerificationToken } from "@/lib/registration-verification";

type VerifyPageProps = {
  searchParams?: {
    token?: string;
  };
};

function buildRequestedHref(email: string | null): string {
  if (!email) {
    return "/auth/verify/requested";
  }

  return `/auth/verify/requested?${new URLSearchParams({ email }).toString()}`;
}

function getVerificationMessage(result: Awaited<ReturnType<typeof consumeRegistrationVerificationToken>>): {
  title: string;
  body: string;
} {
  if (result.ok) {
    return {
      title: "Email verified",
      body: "Your account is now verified. Sign in to access the app.",
    };
  }

  if (result.reason === "missing_token") {
    return {
      title: "Verification link required",
      body: "Open the verification link from your email, or request a new verification message.",
    };
  }

  if (result.reason === "expired_token") {
    return {
      title: "Verification link expired",
      body: "This verification link has expired. Request a new email to finish setting up your account.",
    };
  }

  if (result.reason === "replayed_token") {
    return {
      title: "Verification link already used",
      body: "This verification link was already consumed. Sign in if your account is verified, or request a new email.",
    };
  }

  if (result.reason === "revoked_token") {
    return {
      title: "Verification link replaced",
      body: "A newer verification email has already replaced this link. Use the latest email, or request another one.",
    };
  }

  if (result.reason === "already_verified") {
    return {
      title: "Account already verified",
      body: "Your account has already been verified. Continue to sign in.",
    };
  }

  return {
    title: "Invalid verification link",
    body: "This verification link is invalid. Request a new verification email and try again.",
  };
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const token = String(searchParams?.token ?? "").trim();
  const result = await consumeRegistrationVerificationToken(token);
  const message = getVerificationMessage(result);
  const requestedHref = buildRequestedHref(result.email);

  return (
    <section className="auth-wrap">
      <article className="card auth-card">
        <p className="eyebrow">Email Verification</p>
        <h1>{message.title}</h1>
        <p className="page-lead">{message.body}</p>
        <p className="auth-switch">
          <Link href="/auth/sign-in">Go to sign in</Link>
        </p>
        {!result.ok ? (
          <p className="auth-switch">
            <Link href={requestedHref}>Request another verification email</Link>
          </p>
        ) : null}
      </article>
    </section>
  );
}
