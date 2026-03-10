import { render } from "@react-email/render";

import RegistrationVerificationEmailTemplate from "./RegistrationVerificationEmail";
import SubscriptionReminderEmailTemplate, {
  type SubscriptionReminderItem,
} from "./SubscriptionReminderEmail";
import TestEmailTemplate from "./TestEmail";

const DEFAULT_APP_NAME = "Sub Stalker";

export type RenderedEmailTemplate = {
  subject: string;
  html: string;
  text: string;
  templateName: string;
};

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

async function renderTemplate(component: JSX.Element): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([
    render(component),
    render(component, {
      plainText: true,
    }),
  ]);

  return {
    html,
    text,
  };
}

export async function renderTestEmailTemplate(input: {
  appName?: string;
  recipientEmail: string;
}): Promise<RenderedEmailTemplate> {
  const appName = input.appName ?? DEFAULT_APP_NAME;
  const subject = `${appName}: test email`;
  const rendered = await renderTemplate(
    <TestEmailTemplate appName={appName} recipientEmail={input.recipientEmail} />,
  );

  return {
    subject,
    ...rendered,
    templateName: "test_email",
  };
}

export async function renderRegistrationVerificationTemplate(input: {
  appName?: string;
  verificationUrl: string;
  expiresInMinutes?: number;
}): Promise<RenderedEmailTemplate> {
  const appName = input.appName ?? DEFAULT_APP_NAME;
  const expiresInMinutes = input.expiresInMinutes ?? 30;
  const subject = `${appName}: verify your email`;
  const rendered = await renderTemplate(
    <RegistrationVerificationEmailTemplate
      appName={appName}
      verificationUrl={input.verificationUrl}
      expiresInMinutes={expiresInMinutes}
    />,
  );

  return {
    subject,
    ...rendered,
    templateName: "registration_verification",
  };
}

export async function renderSubscriptionReminderTemplate(input: {
  appName?: string;
  reminderDaysBefore: number;
  subscriptions: Array<{
    name: string;
    amountCents: number;
    currency: string;
    renewalDate: Date;
  }>;
}): Promise<RenderedEmailTemplate> {
  const appName = input.appName ?? DEFAULT_APP_NAME;
  const mappedSubscriptions: SubscriptionReminderItem[] = input.subscriptions.map((subscription) => ({
    name: subscription.name,
    amount: formatCurrency(subscription.amountCents, subscription.currency),
    renewalDate: formatDate(subscription.renewalDate),
  }));
  const subject = `${appName}: upcoming subscription renewal reminders`;
  const rendered = await renderTemplate(
    <SubscriptionReminderEmailTemplate
      appName={appName}
      reminderDaysBefore={input.reminderDaysBefore}
      subscriptions={mappedSubscriptions}
    />,
  );

  return {
    subject,
    ...rendered,
    templateName: "subscription_reminder",
  };
}
