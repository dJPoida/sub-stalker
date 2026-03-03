import { requireAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

import { saveUserSettingsAction } from "./actions";

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
  const settings = await db.userSettings.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      defaultCurrency: true,
      remindersEnabled: true,
      reminderDaysBefore: true,
    },
  });

  return (
    <section className="card">
      <h1>Settings</h1>
      <p>Manage account preferences for {user.email}.</p>
      {resultMessage ? (
        <p className={resultMessage.type === "error" ? "status-error" : "status-help"}>{resultMessage.text}</p>
      ) : null}
      <form className="form" action={saveUserSettingsAction}>
        <label className="form-field">
          Default currency (3-letter ISO)
          <input
            name="defaultCurrency"
            type="text"
            minLength={3}
            maxLength={3}
            defaultValue={settings?.defaultCurrency ?? "USD"}
            required
          />
        </label>
        <label className="form-field">
          <span>Reminder preferences</span>
          <span className="form-checkbox">
            <input
              name="remindersEnabled"
              type="checkbox"
              defaultChecked={settings?.remindersEnabled ?? true}
            />
            Enable reminder emails
          </span>
        </label>
        <label className="form-field">
          Reminder lead time (days)
          <input
            name="reminderDaysBefore"
            type="number"
            min={0}
            max={30}
            step={1}
            defaultValue={settings?.reminderDaysBefore ?? 3}
            required
          />
        </label>
        <button type="submit">Save Settings</button>
      </form>
    </section>
  );
}
