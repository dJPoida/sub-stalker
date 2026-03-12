import { normalizeInviteEmail } from "./invite-email";

export function buildInviteUrl(baseUrl: string, inviteToken: string, inviteEmail: string): string {
  const trimmedBaseUrl = baseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    invite: inviteToken,
    email: normalizeInviteEmail(inviteEmail),
  });

  return `${trimmedBaseUrl}/auth/sign-up?${params.toString()}`;
}
