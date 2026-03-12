import * as React from "react";
import { Heading, Section, Text } from "@react-email/components";

import EmailLayout from "./Layout";

export type SubscriptionReminderItem = {
  name: string;
  amount: string;
  renewalDate: string;
};

type SubscriptionReminderEmailTemplateProps = {
  appName: string;
  reminderDaysBefore: number;
  subscriptions: SubscriptionReminderItem[];
};

const itemStyle = {
  border: "1px solid #d8e1ef",
  borderRadius: "10px",
  backgroundColor: "#f8fbff",
  padding: "12px 14px",
  margin: "0 0 10px 0",
};

export default function SubscriptionReminderEmailTemplate({
  appName,
  reminderDaysBefore,
  subscriptions,
}: SubscriptionReminderEmailTemplateProps) {
  return (
    <EmailLayout
      appName={appName}
      previewText={`${subscriptions.length} subscription renewal reminder${subscriptions.length === 1 ? "" : "s"}.`}
    >
      <Heading style={{ margin: "0 0 14px 0", fontSize: "24px", lineHeight: "1.3" }}>
        Upcoming renewal reminder
      </Heading>
      <Text style={{ margin: "0 0 14px 0", fontSize: "15px", lineHeight: "1.6" }}>
        You asked for reminders {reminderDaysBefore} day{reminderDaysBefore === 1 ? "" : "s"} before
        renewal.
      </Text>
      {subscriptions.map((subscription) => (
        <Section key={`${subscription.name}-${subscription.renewalDate}`} style={itemStyle}>
          <Text style={{ margin: "0", fontWeight: "700", fontSize: "15px" }}>{subscription.name}</Text>
          <Text style={{ margin: "4px 0 0 0", fontSize: "14px", lineHeight: "1.5" }}>
            Amount: {subscription.amount}
            <br />
            Renewal date: {subscription.renewalDate}
          </Text>
        </Section>
      ))}
    </EmailLayout>
  );
}
