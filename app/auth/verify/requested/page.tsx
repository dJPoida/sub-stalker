import Link from "next/link";

import { PendingFieldset, PendingSubmitButton } from "@/app/components/PendingFormControls";

import { resendRegistrationVerificationAction } from "../actions";

type VerificationRequestedPageProps = {
  searchParams?: {
    email?: string;
    source?: string;
    delivery?: string;
    retry_after?: string;
  };
};

function normalizeEmail(value: string | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function getHeading(source: string | undefined): { title: string; body: string } {
  if (source === "signin") {
    return {
      title: "Verify your email before signing in",
      body: "Your password was correct, but the account still needs email verification before a session can be created.",
    };
  }

  if (source === "resend") {
    return {
      title: "Verification email status",
      body: "If the address belongs to an unverified account, you can request another verification email below.",
    };
  }

  return {
    title: "Check your inbox",
    body: "A verification email is required before your account can access the app.",
  };
}

function getStatusMessage(delivery: string | undefined, retryAfter: string | undefined, email: string): string | null {
  if (!delivery) {
    return email ? `We’re waiting for verification on ${email}.` : null;
  }

  if (delivery === "sent") {
    return email ? `Verification email sent to ${email}.` : "Verification email sent.";
  }

  if (delivery === "skipped") {
    return "Email delivery is currently unavailable, so the verification message could not be sent automatically.";
  }

  if (delivery === "failed") {
    return "Verification email delivery failed. Retry below to send a fresh link.";
  }

  if (delivery === "rate_limited") {
    const retrySeconds = Number(retryAfter ?? "0");

    if (Number.isFinite(retrySeconds) && retrySeconds > 0) {
      return `Too many verification emails were requested recently. Try again in ${retrySeconds} seconds.`;
    }

    return "Too many verification emails were requested recently. Try again shortly.";
  }

  if (delivery === "ignored") {
    return "If the address belongs to an unverified account, a fresh verification email can be requested here.";
  }

  if (delivery === "invalid_request") {
    return "Invalid resend request. Retry from this page.";
  }

  if (delivery === "missing_email") {
    return "Enter an email address to resend the verification email.";
  }

  return null;
}

export default function VerificationRequestedPage({ searchParams }: VerificationRequestedPageProps) {
  const email = normalizeEmail(searchParams?.email);
  const heading = getHeading(searchParams?.source);
  const statusMessage = getStatusMessage(searchParams?.delivery, searchParams?.retry_after, email);

  return (
    <section className="auth-wrap">
      <article className="card auth-card">
        <p className="eyebrow">Email Verification</p>
        <h1>{heading.title}</h1>
        <p className="page-lead">{heading.body}</p>
        {statusMessage ? <p className="status-help mt-md">{statusMessage}</p> : null}
        <form className="mt-md" action={resendRegistrationVerificationAction}>
          <PendingFieldset className="form-grid form-pending-group">
            <label className="form-field">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={email}
                placeholder="name@example.com"
                required
              />
            </label>
            <PendingSubmitButton className="button" idleLabel="Resend Verification Email" pendingLabel="Sending..." />
          </PendingFieldset>
        </form>
        <p className="auth-switch">
          <Link href="/auth/sign-in">Back to sign in</Link>
        </p>
      </article>
    </section>
  );
}
