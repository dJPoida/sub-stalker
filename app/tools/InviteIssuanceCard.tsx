"use client";

import { useFormState, useFormStatus } from "react-dom";

import type { InviteIssuanceActionState } from "./actions";

type InviteIssuanceCardProps = {
  issueInviteAction: (
    previousState: InviteIssuanceActionState,
    formData: FormData,
  ) => Promise<InviteIssuanceActionState>;
};

const INITIAL_STATE: InviteIssuanceActionState = {
  status: "idle",
};

function IssueInviteSubmitButton(): JSX.Element {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} type="submit">
      {pending ? "Issuing Invite..." : "Issue + Send Invite"}
    </button>
  );
}

export default function InviteIssuanceCard({ issueInviteAction }: InviteIssuanceCardProps): JSX.Element {
  const [state, formAction] = useFormState(issueInviteAction, INITIAL_STATE);

  return (
    <article className="surface surface-soft">
      <h2>Issue Invitation Email</h2>
      <p className="text-muted">
        Create a single-use invite token and send it in one step. If delivery fails, manual share fallback is shown.
      </p>

      <form action={formAction} className="mt-md form-grid">
        <label className="form-field">
          Invite email
          <input
            autoComplete="off"
            inputMode="email"
            name="email"
            placeholder="name@example.com"
            required
            type="email"
          />
        </label>

        <label className="form-field">
          Expires in (days)
          <input defaultValue="7" max={30} min={1} name="expiresInDays" required type="number" />
        </label>

        <IssueInviteSubmitButton />
      </form>

      {state.status === "error" ? <p className="status-error mt-md">{state.message}</p> : null}

      {state.status === "success" ? (
        <div className="stack mt-md" aria-live="polite">
          <p className={state.inviteEmailOutcome === "failed" ? "status-error" : "status-help"}>
            {state.message}
          </p>
          {state.inviteEmailOutcome !== "sent" ? (
            <p className="text-muted">
              Email fallback is active. Share the one-time token or full invite URL below.
            </p>
          ) : null}
          {state.inviteEmailOutcome === "failed" && state.inviteEmailError ? (
            <p className="text-muted">Send error: {state.inviteEmailError}</p>
          ) : null}
          <p className="text-muted">
            Email: <strong>{state.email}</strong>
            <br />
            Expires: <strong>{new Date(state.expiresAt).toLocaleString()}</strong>
          </p>
          <label className="form-field">
            One-time invite token
            <input readOnly type="text" value={state.inviteToken} />
          </label>
          <label className="form-field">
            Shareable invite URL
            <input readOnly type="text" value={state.inviteUrl} />
          </label>
        </div>
      ) : null}
    </article>
  );
}
