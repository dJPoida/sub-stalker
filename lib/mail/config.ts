import { normalizeEnvValue } from "../env";

import type { MailProviderName } from "./types";

const DEFAULT_MAIL_FROM_NAME = "Sub Stalker";
const DEFAULT_TEST_FROM_ADDRESS = "onboarding@resend.dev";
const DEFAULT_EMAIL_LOG_RETENTION_DAYS = 90;

function readNormalizedEnv(
  key: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[key];

  if (!raw) {
    return null;
  }

  const normalized = normalizeEnvValue(raw);
  return normalized || null;
}

export function getMailProviderApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return readNormalizedEnv("MAIL_PROVIDER_API_KEY", env);
}

export function isEmailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(getMailProviderApiKey(env));
}

export function getConfiguredMailFromAddress(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return readNormalizedEnv("MAIL_FROM_ADDRESS", env);
}

export function getMailFromAddress(env: NodeJS.ProcessEnv = process.env): string {
  return getConfiguredMailFromAddress(env) ?? DEFAULT_TEST_FROM_ADDRESS;
}

export function getMailFromName(env: NodeJS.ProcessEnv = process.env): string {
  return readNormalizedEnv("MAIL_FROM_NAME", env) ?? DEFAULT_MAIL_FROM_NAME;
}

export function getMailProvider(env: NodeJS.ProcessEnv = process.env): MailProviderName {
  const requestedProvider = (readNormalizedEnv("MAIL_PROVIDER", env) ?? "").toLowerCase();

  if (requestedProvider === "mock") {
    return "mock";
  }

  if (requestedProvider === "console") {
    return "console";
  }

  if (isEmailConfigured(env)) {
    return "resend";
  }

  return "console";
}

export function getEmailLogRetentionDays(env: NodeJS.ProcessEnv = process.env): number {
  const raw = readNormalizedEnv("EMAIL_DELIVERY_LOG_RETENTION_DAYS", env);
  const parsed = Number(raw);

  if (!raw || !Number.isFinite(parsed)) {
    return DEFAULT_EMAIL_LOG_RETENTION_DAYS;
  }

  const rounded = Math.trunc(parsed);

  if (rounded < 1) {
    return DEFAULT_EMAIL_LOG_RETENTION_DAYS;
  }

  return rounded;
}

export function getEmailServiceStatus(env: NodeJS.ProcessEnv = process.env): {
  configured: boolean;
  provider: MailProviderName;
  fromAddress: string;
} {
  const configured = isEmailConfigured(env);
  return {
    configured,
    provider: getMailProvider(env),
    fromAddress: getConfiguredMailFromAddress(env) ?? "not configured",
  };
}
