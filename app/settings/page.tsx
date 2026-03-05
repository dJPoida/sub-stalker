import { requireAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

import { saveUserSettingsAction } from "./actions";
import SettingsClient from "./SettingsClient";

type SettingsPageProps = {
  searchParams?: {
    error?: string;
    result?: string;
  };
};

function getResultMessage(searchParams?: SettingsPageProps["searchParams"]): {
  type: "error" | "success";
  text: string;
} | null {
  if (!searchParams) {
    return null;
  }

  if (searchParams.error === "invalid_request") {
    return {
      type: "error",
      text: "Invalid settings request. Please retry from this page.",
    };
  }

  if (searchParams.error === "invalid_fields") {
    return {
      type: "error",
      text: "Invalid settings values. Use a 3-letter currency and reminder days between 0 and 30.",
    };
  }

  if (searchParams.result === "saved") {
    return {
      type: "success",
      text: "Settings saved.",
    };
  }

  return null;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await requireAuthenticatedUser();
  const resultMessage = getResultMessage(searchParams);

  const [settings, totalSubscriptions, activeSubscriptions] = await Promise.all([
    db.userSettings.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        defaultCurrency: true,
        remindersEnabled: true,
        reminderDaysBefore: true,
      },
    }),
    db.subscription.count({
      where: {
        userId: user.id,
      },
    }),
    db.subscription.count({
      where: {
        userId: user.id,
        isActive: true,
      },
    }),
  ]);

  return (
    <SettingsClient
      activeSubscriptions={activeSubscriptions}
      initialDefaultCurrency={settings?.defaultCurrency ?? "USD"}
      initialReminderDaysBefore={settings?.reminderDaysBefore ?? 3}
      initialRemindersEnabled={settings?.remindersEnabled ?? true}
      resultMessage={resultMessage}
      saveAction={saveUserSettingsAction}
      totalSubscriptions={totalSubscriptions}
      userEmail={user.email}
    />
  );
}
