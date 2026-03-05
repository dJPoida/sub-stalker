import { requireAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { DisplayMode } from "@prisma/client";

import {
  updateAccountDetailsAction,
  updateDefaultCurrencyAction,
  updateDisplayModeAction,
  updateReminderLeadTimeAction,
  updateRemindersEnabledAction,
} from "./actions";
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
      text: "Invalid value submitted. Use a 3-letter currency, reminder days between 0 and 30, a valid display mode, and a name under 120 characters.",
    };
  }

  if (searchParams.result === "display_saved") {
    return {
      type: "success",
      text: "Display mode updated.",
    };
  }

  if (searchParams.result === "currency_saved") {
    return {
      type: "success",
      text: "Default currency updated.",
    };
  }

  if (searchParams.result === "reminders_saved") {
    return {
      type: "success",
      text: "Reminder notifications updated.",
    };
  }

  if (searchParams.result === "lead_time_saved") {
    return {
      type: "success",
      text: "Reminder lead time updated.",
    };
  }

  if (searchParams.result === "account_saved") {
    return {
      type: "success",
      text: "Account details updated.",
    };
  }

  return null;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const user = await requireAuthenticatedUser();
  const resultMessage = getResultMessage(searchParams);

  const [settings, userProfile, totalSubscriptions, activeSubscriptions] = await Promise.all([
    db.userSettings.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        defaultCurrency: true,
        remindersEnabled: true,
        reminderDaysBefore: true,
        displayMode: true,
      },
    }),
    db.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        name: true,
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
      initialDisplayName={userProfile?.name ?? null}
      initialDefaultCurrency={settings?.defaultCurrency ?? "USD"}
      initialDisplayMode={(settings?.displayMode ?? "DEVICE") as DisplayMode}
      initialReminderDaysBefore={settings?.reminderDaysBefore ?? 3}
      initialRemindersEnabled={settings?.remindersEnabled ?? true}
      resultMessage={resultMessage}
      updateAccountDetailsAction={updateAccountDetailsAction}
      updateDefaultCurrencyAction={updateDefaultCurrencyAction}
      updateDisplayModeAction={updateDisplayModeAction}
      updateReminderLeadTimeAction={updateReminderLeadTimeAction}
      updateRemindersEnabledAction={updateRemindersEnabledAction}
      totalSubscriptions={totalSubscriptions}
      userEmail={user.email}
    />
  );
}
