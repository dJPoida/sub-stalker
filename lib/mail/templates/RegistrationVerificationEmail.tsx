import { Button, Heading, Link, Text } from "@react-email/components";

import EmailLayout from "./Layout";

type RegistrationVerificationEmailTemplateProps = {
  appName: string;
  verificationUrl: string;
  expiresInMinutes: number;
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

export default function RegistrationVerificationEmailTemplate({
  appName,
  verificationUrl,
  expiresInMinutes,
}: RegistrationVerificationEmailTemplateProps) {
  return (
    <EmailLayout
      appName={appName}
      previewText={`Verify your ${appName} account email address.`}
    >
      <Heading style={{ margin: "0 0 14px 0", fontSize: "24px", lineHeight: "1.3" }}>
        Verify your email address
      </Heading>
      <Text style={{ margin: "0 0 12px 0", fontSize: "15px", lineHeight: "1.6" }}>
        Confirm ownership of this inbox to activate your {appName} account.
      </Text>
      <Button href={verificationUrl} style={buttonStyle}>
        Verify email
      </Button>
      <Text style={{ margin: "14px 0 0 0", fontSize: "14px", lineHeight: "1.6" }}>
        This link expires in {expiresInMinutes} minutes.
      </Text>
      <Text style={{ margin: "14px 0 0 0", fontSize: "13px", lineHeight: "1.6" }}>
        If the button does not work, open this URL:
      </Text>
      <Text style={{ margin: "4px 0 0 0", fontSize: "13px", lineHeight: "1.6" }}>
        <Link href={verificationUrl}>{verificationUrl}</Link>
      </Text>
    </EmailLayout>
  );
}
