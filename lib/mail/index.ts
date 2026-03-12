import { EmailDeliveryStatus } from "@prisma/client";

import { db } from "../db";

import {
  getEmailLogRetentionDays,
  getEmailServiceStatus,
  getMailProvider,
} from "./config";
import { clearMockEmailLog, createMailProvider, getMockEmailLog } from "./providers";
import {
  renderInviteIssuanceTemplate,
  renderRegistrationVerificationTemplate,
  renderSubscriptionReminderTemplate,
  renderTestEmailTemplate,
} from "./templates";
import type { EmailPayload, EmailResult, MailProviderName, MockEmailRecord } from "./types";

const TEST_EMAIL_RATE_LIMIT_MAX_PER_HOUR = 3;
const TEST_EMAIL_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

type PrismaKnownRequestLike = {
  code?: unknown;
  meta?: {
    modelName?: unknown;
    table?: unknown;
  };
};

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown email error.";
}

function asPrismaKnownRequestLike(error: unknown): PrismaKnownRequestLike | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  return error as PrismaKnownRequestLike;
}

function isMissingEmailDeliveryLogTableError(error: unknown): boolean {
  const prismaError = asPrismaKnownRequestLike(error);

  if (!prismaError) {
    return false;
  }

  const code = typeof prismaError.code === "string" ? prismaError.code : "";

  if (code !== "P2021" && code !== "P2022") {
    return false;
  }

  const modelName = typeof prismaError.meta?.modelName === "string" ? prismaError.meta.modelName : "";
  const table = typeof prismaError.meta?.table === "string" ? prismaError.meta.table : "";

  return modelName === "EmailDeliveryLog" || table.includes("EmailDeliveryLog");
}

function resolveDeliveryStatus(provider: MailProviderName, result: EmailResult): EmailDeliveryStatus {
  if (!result.success) {
    return EmailDeliveryStatus.FAILED;
  }

  if (provider === "console") {
    return EmailDeliveryStatus.SKIPPED;
  }

  return EmailDeliveryStatus.SENT;
}

function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function writeDeliveryLog(
  payload: EmailPayload,
  provider: MailProviderName,
  result: EmailResult,
): Promise<void> {
  await db.emailDeliveryLog.create({
    data: {
      userId: payload.userId ?? null,
      recipientEmail: normalizeRecipientEmail(payload.to),
      templateName: payload.templateName ?? "custom",
      status: resolveDeliveryStatus(provider, result),
      providerMessageId: result.messageId ?? null,
      errorMessage: result.success ? null : result.error ?? "Unknown email send failure.",
    },
  });
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const providerName = getMailProvider();
  const provider = createMailProvider(providerName);
  let result: EmailResult;

  try {
    result = await provider.send({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
    });
  } catch (error) {
    result = {
      success: false,
      error: asErrorMessage(error),
    };
  }

  try {
    await writeDeliveryLog(payload, providerName, result);
  } catch (error) {
    console.error("[mail] Failed to persist EmailDeliveryLog entry.", {
      to: normalizeRecipientEmail(payload.to),
      templateName: payload.templateName ?? "custom",
      provider: providerName,
      error: asErrorMessage(error),
    });
  }

  return result;
}

export async function sendTestEmail(input: {
  to: string;
  userId?: string;
  appName?: string;
}): Promise<EmailResult> {
  const rendered = await renderTestEmailTemplate({
    appName: input.appName,
    recipientEmail: input.to,
  });

  return sendEmail({
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    templateName: rendered.templateName,
    userId: input.userId,
  });
}

export type RegistrationVerificationEmailSendOutcome = "sent" | "skipped" | "failed";

export type RegistrationVerificationEmailSendResult = {
  outcome: RegistrationVerificationEmailSendOutcome;
  provider: MailProviderName;
  messageId: string | null;
  error: string | null;
};

type SendRegistrationVerificationEmailDependencies = {
  providerName?: MailProviderName;
  sendEmailFn?: (payload: EmailPayload) => Promise<EmailResult>;
};

export async function sendRegistrationVerificationEmail(input: {
  to: string;
  userId?: string;
  verificationUrl: string;
  expiresInMinutes?: number;
  appName?: string;
},
dependencies: SendRegistrationVerificationEmailDependencies = {},
): Promise<RegistrationVerificationEmailSendResult> {
  const rendered = await renderRegistrationVerificationTemplate({
    appName: input.appName,
    verificationUrl: input.verificationUrl,
    expiresInMinutes: input.expiresInMinutes,
  });

  const providerName = dependencies.providerName ?? getMailProvider();
  const sendEmailFn = dependencies.sendEmailFn ?? sendEmail;
  const result = await sendEmailFn({
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    templateName: rendered.templateName,
    userId: input.userId,
  });

  if (!result.success) {
    return {
      outcome: "failed",
      provider: providerName,
      messageId: result.messageId ?? null,
      error: result.error ?? "Unknown email send failure.",
    };
  }

  if (providerName === "console") {
    return {
      outcome: "skipped",
      provider: providerName,
      messageId: result.messageId ?? null,
      error: null,
    };
  }

  return {
    outcome: "sent",
    provider: providerName,
    messageId: result.messageId ?? null,
    error: null,
  };
}

export async function sendSubscriptionReminderEmail(input: {
  to: string;
  userId?: string;
  reminderDaysBefore: number;
  subscriptions: Array<{
    name: string;
    amountCents: number;
    currency: string;
    renewalDate: Date;
  }>;
  appName?: string;
}): Promise<EmailResult> {
  const rendered = await renderSubscriptionReminderTemplate({
    appName: input.appName,
    reminderDaysBefore: input.reminderDaysBefore,
    subscriptions: input.subscriptions,
  });

  return sendEmail({
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    templateName: rendered.templateName,
    userId: input.userId,
  });
}

export type InviteEmailSendOutcome = "sent" | "skipped" | "failed";

export type InviteEmailSendResult = {
  outcome: InviteEmailSendOutcome;
  provider: MailProviderName;
  messageId: string | null;
  error: string | null;
};

type SendInviteEmailDependencies = {
  providerName?: MailProviderName;
  sendEmailFn?: (payload: EmailPayload) => Promise<EmailResult>;
};

export async function sendInviteEmail(
  input: {
    to: string;
    userId?: string;
    inviteUrl: string;
    expiresAt: Date;
    appName?: string;
  },
  dependencies: SendInviteEmailDependencies = {},
): Promise<InviteEmailSendResult> {
  const rendered = await renderInviteIssuanceTemplate({
    appName: input.appName,
    recipientEmail: input.to,
    inviteUrl: input.inviteUrl,
    expiresAt: input.expiresAt,
  });

  const providerName = dependencies.providerName ?? getMailProvider();
  const sendEmailFn = dependencies.sendEmailFn ?? sendEmail;
  const result = await sendEmailFn({
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    templateName: rendered.templateName,
    userId: input.userId,
  });

  if (!result.success) {
    return {
      outcome: "failed",
      provider: providerName,
      messageId: result.messageId ?? null,
      error: result.error ?? "Unknown email send failure.",
    };
  }

  if (providerName === "console") {
    return {
      outcome: "skipped",
      provider: providerName,
      messageId: result.messageId ?? null,
      error: null,
    };
  }

  return {
    outcome: "sent",
    provider: providerName,
    messageId: result.messageId ?? null,
    error: null,
  };
}

export type TestEmailRateLimitState = {
  allowed: boolean;
  attemptsInWindow: number;
  remainingInWindow: number;
  retryAfterSeconds: number | null;
};

export async function getTestEmailRateLimitState(userId: string): Promise<TestEmailRateLimitState> {
  const windowStart = new Date(Date.now() - TEST_EMAIL_RATE_LIMIT_WINDOW_MS);
  try {
    const attemptsInWindow = await db.emailDeliveryLog.count({
      where: {
        userId,
        templateName: "test_email",
        createdAt: {
          gte: windowStart,
        },
      },
    });

    if (attemptsInWindow < TEST_EMAIL_RATE_LIMIT_MAX_PER_HOUR) {
      return {
        allowed: true,
        attemptsInWindow,
        remainingInWindow: TEST_EMAIL_RATE_LIMIT_MAX_PER_HOUR - attemptsInWindow,
        retryAfterSeconds: null,
      };
    }

    const oldestAttempt = await db.emailDeliveryLog.findFirst({
      where: {
        userId,
        templateName: "test_email",
        createdAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
      },
    });

    const retryAfterSeconds = oldestAttempt
      ? Math.max(
          Math.ceil(
            (oldestAttempt.createdAt.getTime() + TEST_EMAIL_RATE_LIMIT_WINDOW_MS - Date.now()) / 1000,
          ),
          1,
        )
      : 60 * 60;

    return {
      allowed: false,
      attemptsInWindow,
      remainingInWindow: 0,
      retryAfterSeconds,
    };
  } catch (error) {
    if (isMissingEmailDeliveryLogTableError(error)) {
      console.warn(
        "[mail] EmailDeliveryLog table is unavailable; allowing test email send without rate-limit persistence.",
      );

      return {
        allowed: true,
        attemptsInWindow: 0,
        remainingInWindow: TEST_EMAIL_RATE_LIMIT_MAX_PER_HOUR,
        retryAfterSeconds: null,
      };
    }

    throw error;
  }
}

export async function pruneEmailDeliveryLogs(): Promise<number> {
  const retentionDays = getEmailLogRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  try {
    const result = await db.emailDeliveryLog.deleteMany({
      where: {
        createdAt: {
          lte: cutoff,
        },
      },
    });

    return result.count;
  } catch (error) {
    if (isMissingEmailDeliveryLogTableError(error)) {
      console.warn("[mail] EmailDeliveryLog table is unavailable; skipping log pruning.");
      return 0;
    }

    throw error;
  }
}

export function getEmailMockLog(): MockEmailRecord[] {
  return getMockEmailLog();
}

export function clearEmailMockLog(): void {
  clearMockEmailLog();
}

export { getEmailServiceStatus, getMailProvider } from "./config";
export type { EmailPayload, EmailResult, MockEmailRecord } from "./types";
