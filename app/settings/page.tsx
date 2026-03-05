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
    <section className="page-stack">
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Settings</p>
          <h1>Preferences and reminders</h1>
          <p className="page-lead">Manage account-level defaults for {user.email}.</p>
        </div>
      </header>

      {resultMessage ? (
        <p className={resultMessage.type === "error" ? "status-error" : "status-help"}>{resultMessage.text}</p>
      ) : null}

      <div className="split-grid">
        <article className="surface surface-soft">
          <h2>Account</h2>
          <p className="text-muted">Email</p>
          <p>{user.email}</p>
          <p className="text-muted mt-md">
            This account controls subscription data, maintenance tools, and notification preferences.
          </p>
        </article>

        <article className="surface">
          <h2>Current reminder profile</h2>
          <p className="text-muted">
            {settings?.remindersEnabled ?? true
              ? `Email reminders enabled ${settings?.reminderDaysBefore ?? 3} day(s) before billing.`
              : "Email reminders currently disabled."}
          </p>
          <p className="text-muted">Default currency: {settings?.defaultCurrency ?? "USD"}.</p>
        </article>
      </div>

      <article className="surface">
        <h2>Update Preferences</h2>
        <form className="form-grid" action={saveUserSettingsAction}>
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
              <input name="remindersEnabled" type="checkbox" defaultChecked={settings?.remindersEnabled ?? true} />
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
          <div>
            <button type="submit">Save Settings</button>
          </div>
        </form>
      </article>
    </section>
  );
}
