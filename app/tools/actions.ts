"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { pruneExpiredSessions, pruneStaleSignInAttempts, requireAuthenticatedUser } from "@/lib/auth";
import {
  InviteIssuanceRateLimitError,
  InviteValidationError,
  issueInvite,
  parseInviteExpiryDays,
} from "@/lib/invites";
import { isInvitesRequired } from "@/lib/env";
import { sendInviteEmail } from "@/lib/mail";
import { runDailyMaintenanceJobs } from "@/lib/maintenance";

export type InviteIssuanceActionState =
  | {
      status: "idle";
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "success";
      message: string;
      email: string;
      expiresAt: string;
      inviteToken: string;
      inviteUrl: string;
      rotatedExistingInvite: boolean;
      inviteEmailOutcome: "sent" | "skipped" | "failed";
      inviteEmailError: string | null;
    };

async function isSameOriginRequest(): Promise<boolean> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }

  if (!host) {
    return false;
  }

  const proto =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

  try {
    const originUrl = new URL(origin);
    return originUrl.host.toLowerCase() === host.toLowerCase() && originUrl.protocol === `${proto}:`;
  } catch {
    return false;
  }
}

async function getRequestBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development" ? "http" : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

function normalizeText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

export async function issueInviteAction(
  _previousState: InviteIssuanceActionState,
  formData: FormData,
): Promise<InviteIssuanceActionState> {
  const user = await requireAuthenticatedUser();

  if (!isInvitesRequired()) {
    return {
      status: "error",
      message: "Invitation mode is disabled (`INVITES_REQUIRED=false`).",
    };
  }

  if (!(await isSameOriginRequest())) {
    return {
      status: "error",
      message: "Invalid invite request. Retry from this page.",
    };
  }

  const email = normalizeText(formData.get("email"));
  const expiresInDays = parseInviteExpiryDays(normalizeText(formData.get("expiresInDays")));

  if (!email || expiresInDays === null) {
    return {
      status: "error",
      message: "Provide a valid email and expiration window (1-30 days).",
    };
  }

  try {
    const baseUrl = await getRequestBaseUrl();
    const result = await issueInvite({
      email,
      expiresInDays,
      createdByUserId: user.id,
      baseUrl,
    });
    const inviteEmailResult = await sendInviteEmail({
      to: result.email,
      userId: user.id,
      inviteUrl: result.inviteUrl,
      expiresAt: new Date(result.expiresAt),
    });
    const issuanceMessage = result.rotatedExistingInvite
      ? "Invite issued, previous pending invite rotated."
      : "Invite issued successfully.";

    const message =
      inviteEmailResult.outcome === "sent"
        ? `${issuanceMessage} Invitation email sent to ${result.email}.`
        : inviteEmailResult.outcome === "skipped"
          ? `${issuanceMessage} Email provider is unavailable, so share the invite link manually.`
          : `${issuanceMessage} Invite email failed, so share the invite link manually.`;

    return {
      status: "success",
      message,
      email: result.email,
      expiresAt: result.expiresAt,
      inviteToken: result.inviteToken,
      inviteUrl: result.inviteUrl,
      rotatedExistingInvite: result.rotatedExistingInvite,
      inviteEmailOutcome: inviteEmailResult.outcome,
      inviteEmailError: inviteEmailResult.error,
    };
  } catch (error) {
    if (error instanceof InviteIssuanceRateLimitError) {
      return {
        status: "error",
        message: `Invite issuance is temporarily rate limited. Try again in ${error.retryAfterSeconds} seconds.`,
      };
    }

    if (error instanceof InviteValidationError) {
      return {
        status: "error",
        message: "Provide a valid email address for invite issuance.",
      };
    }

    return {
      status: "error",
      message: "Unable to issue invite right now. Please retry.",
    };
  }
}

export async function runSessionCleanupAction(): Promise<void> {
  await requireAuthenticatedUser();

  if (!(await isSameOriginRequest())) {
    redirect("/tools?error=invalid_request");
  }

  const [sessionsDeleted, attemptsDeleted] = await Promise.all([
    pruneExpiredSessions(),
    pruneStaleSignInAttempts(),
  ]);

  redirect(
    `/tools?job=session_cleanup&sessions_deleted=${sessionsDeleted}&attempts_deleted=${attemptsDeleted}`,
  );
}

export async function runDailyMaintenanceAction(): Promise<void> {
  await requireAuthenticatedUser();

  if (!(await isSameOriginRequest())) {
    redirect("/tools?error=invalid_request");
  }

  const result = await runDailyMaintenanceJobs();
  redirect(
    `/tools?job=daily_maintenance&attempts_deleted=${result.staleSignInAttemptsDeleted}&invites_expired=${result.expiredPendingInvitesMarked}&email_logs_deleted=${result.emailDeliveryLogsDeleted}`,
  );
}
