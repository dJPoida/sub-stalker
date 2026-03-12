const INVITE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInviteEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidInviteEmail(value: string): boolean {
  return INVITE_EMAIL_PATTERN.test(value);
}

export function parseInviteEmailPrefill(value: string | null | undefined): string {
  const normalized = normalizeInviteEmail(String(value ?? ""));

  if (!isValidInviteEmail(normalized)) {
    return "";
  }

  return normalized;
}
