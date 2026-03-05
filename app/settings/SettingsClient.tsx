"use client";

import { useEffect, useMemo, useState } from "react";
import type { DisplayMode } from "@prisma/client";
import { PendingFieldset, PendingSubmitButton } from "@/app/components/PendingFormControls";

type ResultMessage = {
  type: "error" | "success";
  text: string;
};

type SettingsClientProps = {
  userEmail: string;
  initialDefaultCurrency: string;
  initialDisplayMode: DisplayMode;
  initialRemindersEnabled: boolean;
  initialReminderDaysBefore: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  resultMessage: ResultMessage | null;
  saveAction: (formData: FormData) => Promise<void>;
};

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];
const DISPLAY_MODE_OPTIONS: Array<{ value: DisplayMode; label: string }> = [
  { value: "DEVICE", label: "Device" },
  { value: "LIGHT", label: "Light" },
  { value: "DARK", label: "Dark" },
];
const REMINDER_DAY_PRESETS = [1, 3, 7, 14];

export default function SettingsClient({
  userEmail,
  initialDefaultCurrency,
  initialDisplayMode,
  initialRemindersEnabled,
  initialReminderDaysBefore,
  totalSubscriptions,
  activeSubscriptions,
  resultMessage,
  saveAction,
}: SettingsClientProps) {
  const [defaultCurrency, setDefaultCurrency] = useState(initialDefaultCurrency);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialDisplayMode);
  const [remindersEnabled, setRemindersEnabled] = useState(initialRemindersEnabled);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(initialReminderDaysBefore);
  const currencyOptions = useMemo(() => {
    if (CURRENCY_OPTIONS.includes(initialDefaultCurrency)) {
      return CURRENCY_OPTIONS;
    }

    return [initialDefaultCurrency, ...CURRENCY_OPTIONS];
  }, [initialDefaultCurrency]);

  const setReminderDays = (rawValue: string | number): void => {
    const parsed = Number(rawValue);

    if (!Number.isFinite(parsed)) {
      setReminderDaysBefore(0);
      return;
    }

    const rounded = Math.round(parsed);
    const bounded = Math.max(0, Math.min(30, rounded));
    setReminderDaysBefore(bounded);
  };

  const reminderSummary = useMemo(() => {
    if (!remindersEnabled) {
      return "Email reminders are currently disabled.";
    }

    if (reminderDaysBefore === 0) {
      return "Email reminders are sent on billing day.";
    }

    return `Email reminders are sent ${reminderDaysBefore} day(s) before billing.`;
  }, [remindersEnabled, reminderDaysBefore]);

  const displayModeSummary = useMemo(() => {
    if (displayMode === "LIGHT") {
      return "Always use light mode.";
    }

    if (displayMode === "DARK") {
      return "Always use dark mode.";
    }

    return "Follow your device color scheme.";
  }, [displayMode]);

  useEffect(() => {
    const root = document.documentElement;

    if (displayMode === "DEVICE") {
      delete root.dataset.theme;
      return;
    }

    root.dataset.theme = displayMode.toLowerCase();
  }, [displayMode]);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Settings</p>
          <h1>Preferences and reminders</h1>
          <p className="page-lead">Tune account-level defaults and reminder behavior for {userEmail}.</p>
        </div>
      </header>

      {resultMessage ? (
        <p className={resultMessage.type === "error" ? "status-error" : "status-help"}>{resultMessage.text}</p>
      ) : null}

      <section className="metric-grid">
        <article className="metric-card">
          <span className="metric-label">Default Currency</span>
          <strong className="metric-value">{defaultCurrency}</strong>
          <span className="metric-note">Used for new subscriptions</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Reminders</span>
          <strong className="metric-value">{remindersEnabled ? "Enabled" : "Disabled"}</strong>
          <span className="metric-note">{remindersEnabled ? `${reminderDaysBefore} day lead` : "No email reminders"}</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Subscriptions</span>
          <strong className="metric-value">
            {activeSubscriptions}/{totalSubscriptions}
          </strong>
          <span className="metric-note">Active / total tracked</span>
        </article>
        <article className="metric-card">
          <span className="metric-label">Display</span>
          <strong className="metric-value">{displayMode}</strong>
          <span className="metric-note">{displayModeSummary}</span>
        </article>
      </section>

      <div className="split-grid">
        <article className="surface surface-soft">
          <h2>Account</h2>
          <p className="text-muted">Email</p>
          <p>{userEmail}</p>
          <p className="text-muted mt-md">
            This account controls subscription data, maintenance tools, and reminder preferences.
          </p>
        </article>

        <article className="surface">
          <h2>Reminder profile</h2>
          <p className="text-muted">{reminderSummary}</p>
          <p className="text-muted mt-md">Current currency preference: {defaultCurrency}.</p>
          <p className="text-muted">Display mode: {displayModeSummary}</p>
        </article>
      </div>

      <article className="surface">
        <h2>Update Preferences</h2>
        <form action={saveAction} className="form-grid">
          <PendingFieldset className="form-grid form-pending-group">
            <div className="settings-grid">
              <label className="form-field">
                Display mode
                <select
                  name="displayMode"
                  onChange={(event) => setDisplayMode(event.target.value as DisplayMode)}
                  value={displayMode}
                >
                  {DISPLAY_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                Default currency
                <select
                  name="defaultCurrency"
                  onChange={(event) => setDefaultCurrency(event.target.value)}
                  value={defaultCurrency}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                Reminder lead time (days)
                <input
                  max={30}
                  min={0}
                  name="reminderDaysBefore"
                  onChange={(event) => setReminderDays(event.target.value)}
                  step={1}
                  type="number"
                  value={reminderDaysBefore}
                />
              </label>
            </div>

            <label className="form-checkbox settings-checkbox">
              <input
                checked={remindersEnabled}
                name="remindersEnabled"
                onChange={(event) => setRemindersEnabled(event.target.checked)}
                type="checkbox"
              />
              Enable reminder emails
            </label>

            <div className="settings-range">
              <label className="form-field">
                Reminder timing preview
                <input
                  max={30}
                  min={0}
                  onChange={(event) => setReminderDays(event.target.value)}
                  step={1}
                  type="range"
                  value={reminderDaysBefore}
                />
              </label>
              <div className="inline-actions">
                {REMINDER_DAY_PRESETS.map((preset) => (
                  <button
                    className="button button-secondary button-small"
                    key={preset}
                    onClick={() => setReminderDays(preset)}
                    type="button"
                  >
                    {preset} day{preset === 1 ? "" : "s"}
                  </button>
                ))}
              </div>
            </div>

            <div className="inline-actions">
              <PendingSubmitButton idleLabel="Save Settings" pendingLabel="Saving..." />
            </div>
          </PendingFieldset>
        </form>
      </article>
    </section>
  );
}
