import { randomUUID } from "node:crypto";

import { Resend } from "resend";

import { getMailFromAddress, getMailFromName, getMailProviderApiKey } from "./config";
import type {
  EmailResult,
  MailProvider,
  MailProviderName,
  MailTransportPayload,
  MockEmailRecord,
} from "./types";

const mockEmailLog: MockEmailRecord[] = [];

function buildFromHeader(): string {
  const fromName = getMailFromName();
  const fromAddress = getMailFromAddress();
  return `${fromName} <${fromAddress}>`;
}

function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown email provider error.";
}

function createResendProvider(): MailProvider {
  const apiKey = getMailProviderApiKey();

  if (!apiKey) {
    throw new Error("MAIL_PROVIDER_API_KEY is not set for Resend provider.");
  }

  const resend = new Resend(apiKey);

  return {
    name: "resend",
    async send(payload: MailTransportPayload): Promise<EmailResult> {
      try {
        const response = await resend.emails.send({
          from: buildFromHeader(),
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          replyTo: payload.replyTo,
        });

        if (response.error) {
          return {
            success: false,
            error: response.error.message,
          };
        }

        return {
          success: true,
          messageId: response.data?.id,
        };
      } catch (error) {
        return {
          success: false,
          error: sanitizeError(error),
        };
      }
    },
  };
}

function createConsoleProvider(): MailProvider {
  return {
    name: "console",
    async send(payload: MailTransportPayload): Promise<EmailResult> {
      const messageId = `console-${randomUUID()}`;
      console.info("[mail:console]", {
        messageId,
        to: payload.to,
        subject: payload.subject,
        replyTo: payload.replyTo ?? null,
      });

      return {
        success: true,
        messageId,
      };
    },
  };
}

function createMockProvider(): MailProvider {
  return {
    name: "mock",
    async send(payload: MailTransportPayload): Promise<EmailResult> {
      const messageId = `mock-${randomUUID()}`;

      mockEmailLog.push({
        messageId,
        to: payload.to,
        subject: payload.subject,
        replyTo: payload.replyTo,
        htmlLength: payload.html.length,
        textLength: payload.text?.length ?? 0,
        sentAt: new Date().toISOString(),
      });

      return {
        success: true,
        messageId,
      };
    },
  };
}

export function createMailProvider(provider: MailProviderName): MailProvider {
  if (provider === "resend") {
    return createResendProvider();
  }

  if (provider === "mock") {
    return createMockProvider();
  }

  return createConsoleProvider();
}

export function getMockEmailLog(): MockEmailRecord[] {
  return [...mockEmailLog];
}

export function clearMockEmailLog(): void {
  mockEmailLog.length = 0;
}
