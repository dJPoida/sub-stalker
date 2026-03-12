import * as React from "react";
import { Button, Heading, Link, Text } from "@react-email/components";

import EmailLayout from "./Layout";

type InviteIssuanceEmailTemplateProps = {
  appName: string;
  recipientEmail: string;
  inviteUrl: string;
  expiresAt: string;
};

const buttonStyle = {
  backgroundColor: "#1f6feb",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "700",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 18px",
};

export default function InviteIssuanceEmailTemplate({
  appName,
  recipientEmail,
  inviteUrl,
  expiresAt,
}: InviteIssuanceEmailTemplateProps) {
  return (
    <EmailLayout appName={appName} previewText={`Your ${appName} invite is ready.`}>
      <Heading style={{ margin: "0 0 14px 0", fontSize: "24px", lineHeight: "1.3" }}>
        You are invited to {appName}
      </Heading>
      <Text style={{ margin: "0 0 12px 0", fontSize: "15px", lineHeight: "1.6" }}>
        This invite was issued for <strong>{recipientEmail}</strong>. Use the link below to complete sign-up.
      </Text>
      <Button href={inviteUrl} style={buttonStyle}>
        Accept invite
      </Button>
      <Text style={{ margin: "14px 0 0 0", fontSize: "14px", lineHeight: "1.6" }}>
        This invite expires on {expiresAt}.
      </Text>
      <Text style={{ margin: "14px 0 0 0", fontSize: "13px", lineHeight: "1.6" }}>
        If the button does not work, open this URL:
      </Text>
      <Text style={{ margin: "4px 0 0 0", fontSize: "13px", lineHeight: "1.6" }}>
        <Link href={inviteUrl}>{inviteUrl}</Link>
      </Text>
    </EmailLayout>
  );
}
