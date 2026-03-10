import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { PropsWithChildren } from "react";

type EmailLayoutProps = PropsWithChildren<{
  previewText: string;
  appName: string;
}>;

const bodyStyle = {
  backgroundColor: "#f3f6fb",
  fontFamily: "Arial, sans-serif",
  color: "#111827",
  margin: "0",
  padding: "24px 0",
};

const containerStyle = {
  maxWidth: "620px",
  margin: "0 auto",
  padding: "24px",
  backgroundColor: "#ffffff",
  border: "1px solid #d8e1ef",
  borderRadius: "12px",
};

const brandStyle = {
  margin: "0 0 14px 0",
  color: "#1f6feb",
  fontWeight: "700",
  fontSize: "14px",
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
};

const footerTextStyle = {
  margin: "0",
  color: "#5f697c",
  fontSize: "12px",
  lineHeight: "1.5",
};

export default function EmailLayout({ previewText, appName, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={brandStyle}>{appName}</Text>
          <Section>{children}</Section>
          <Hr style={{ borderColor: "#d8e1ef", margin: "20px 0" }} />
          <Text style={footerTextStyle}>
            Sent by {appName}. If this message looks unexpected, you can ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
