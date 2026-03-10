export type MailProviderName = "resend" | "console" | "mock";

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  templateName?: string;
  userId?: string;
};

export type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export type MailTransportPayload = Omit<EmailPayload, "templateName" | "userId">;

export type MockEmailRecord = {
  to: string;
  subject: string;
  replyTo?: string;
  htmlLength: number;
  textLength: number;
  sentAt: string;
  messageId: string;
};

export type MailProvider = {
  name: MailProviderName;
  send(payload: MailTransportPayload): Promise<EmailResult>;
};
