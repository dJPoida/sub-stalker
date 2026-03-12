import * as React from "react";
import { Heading, Text } from "@react-email/components";

import EmailLayout from "./Layout";

type TestEmailTemplateProps = {
  appName: string;
  recipientEmail: string;
};

export default function TestEmailTemplate({ appName, recipientEmail }: TestEmailTemplateProps) {
  return (
    <EmailLayout
      appName={appName}
      previewText={`${appName} email service test completed successfully.`}
    >
      <Heading style={{ margin: "0 0 14px 0", fontSize: "24px", lineHeight: "1.3" }}>
        Email service is working
      </Heading>
      <Text style={{ margin: "0 0 12px 0", fontSize: "15px", lineHeight: "1.6" }}>
        This is a confirmation test from {appName}. Messages can now be delivered to:
      </Text>
      <Text style={{ margin: "0", fontSize: "15px", fontWeight: "700", lineHeight: "1.6" }}>
        {recipientEmail}
      </Text>
    </EmailLayout>
  );
}
