"use client";

import { useState } from "react";

type TestEmailCardProps = {
  emailConfigured: boolean;
};

type SendState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type SendTestEmailResponse = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export default function TestEmailCard({ emailConfigured }: TestEmailCardProps): JSX.Element {
  const [sendState, setSendState] = useState<SendState>({ status: "idle" });

  async function handleSendTestEmail(): Promise<void> {
    setSendState({ status: "loading" });

    try {
      const response = await fetch("/api/mail/test", {
        method: "POST",
      });
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? ((await response.json().catch(() => null)) as SendTestEmailResponse | null)
        : null;

      if (!response.ok || !data?.success) {
        setSendState({
          status: "error",
          message: data?.error ?? `Unable to send test email right now (HTTP ${response.status}).`,
        });
        return;
      }

      setSendState({
        status: "success",
        message: data.messageId
          ? `Test email queued. Message ID: ${data.messageId}. Check inbox/spam.`
          : "Test email queued. Check inbox/spam.",
      });
    } catch {
      setSendState({
        status: "error",
        message: "Network error while sending test email.",
      });
    }
  }

  return (
    <article className="surface">
      <h2>Send Test Email</h2>
      <p className="text-muted">Send a verification message to your signed-in account email address.</p>

      {!emailConfigured ? (
        <p className="status-help mt-md">
          Email provider is not configured (`MAIL_PROVIDER_API_KEY` is missing). Test sends will use the
          console/no-op provider.
        </p>
      ) : null}

      <button className="mt-md" disabled={sendState.status === "loading"} onClick={handleSendTestEmail} type="button">
        {sendState.status === "loading" ? "Sending Test Email..." : "Send Test Email"}
      </button>

      {sendState.status === "success" ? <p className="status-help mt-md">{sendState.message}</p> : null}
      {sendState.status === "error" ? <p className="status-error mt-md">{sendState.message}</p> : null}
    </article>
  );
}
