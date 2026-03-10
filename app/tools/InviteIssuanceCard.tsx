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
      {pending ? "Issuing Invite..." : "Issue Invite"}
    </button>
  );
}

export default function InviteIssuanceCard({ issueInviteAction }: InviteIssuanceCardProps): JSX.Element {
  const [state, formAction] = useFormState(issueInviteAction, INITIAL_STATE);

  return (
    <article className="surface surface-soft">
      <h2>Issue Invitation Link</h2>
      <p className="text-muted">Create a single-use invite token for manual sharing. Raw tokens are never stored.</p>

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
          <p className="status-help">{state.message}</p>
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
