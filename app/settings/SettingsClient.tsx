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
  initialDisplayName: string | null;
  initialDefaultCurrency: string;
  initialDisplayMode: DisplayMode;
  initialRemindersEnabled: boolean;
  initialReminderDaysBefore: number;
  resultMessage: ResultMessage | null;
  updateDisplayModeAction: (formData: FormData) => Promise<void>;
  updateDefaultCurrencyAction: (formData: FormData) => Promise<void>;
  updateRemindersEnabledAction: (formData: FormData) => Promise<void>;
  updateReminderLeadTimeAction: (formData: FormData) => Promise<void>;
  updateAccountDetailsAction: (formData: FormData) => Promise<void>;
};

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];
const DISPLAY_MODE_OPTIONS: Array<{ value: DisplayMode; label: string }> = [
  { value: "DEVICE", label: "Device" },
  { value: "LIGHT", label: "Light" },
  { value: "DARK", label: "Dark" },
];
const REMINDER_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index);

export default function SettingsClient({
  userEmail,
  initialDisplayName,
  initialDefaultCurrency,
  initialDisplayMode,
  initialRemindersEnabled,
  initialReminderDaysBefore,
  resultMessage,
  updateDisplayModeAction,
  updateDefaultCurrencyAction,
  updateRemindersEnabledAction,
  updateReminderLeadTimeAction,
  updateAccountDetailsAction,
}: SettingsClientProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [defaultCurrency, setDefaultCurrency] = useState(initialDefaultCurrency);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initialDisplayMode);
  const [remindersEnabled, setRemindersEnabled] = useState(initialRemindersEnabled);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(initialReminderDaysBefore);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
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

  useEffect(() => {
    if (!isAccountModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      setIsAccountModalOpen(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isAccountModalOpen]);

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

      <section className="settings-list">
        <article className="surface setting-item">
          <div className="setting-main">
            <h2>Display mode</h2>
            <p className="text-muted">{displayModeSummary}</p>
          </div>
          <form action={updateDisplayModeAction} className="setting-control-form">
            <PendingFieldset className="form-pending-group">
              <label className="form-field setting-field">
                Theme
                <select
                  name="displayMode"
                  onChange={(event) => {
                    setDisplayMode(event.target.value as DisplayMode);
                    event.currentTarget.form?.requestSubmit();
                  }}
                  value={displayMode}
                >
                  {DISPLAY_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </PendingFieldset>
          </form>
        </article>

        <article className="surface setting-item">
          <div className="setting-main">
            <h2>Default currency</h2>
            <p className="text-muted">Used for newly created subscriptions.</p>
          </div>
          <form action={updateDefaultCurrencyAction} className="setting-control-form">
            <PendingFieldset className="form-pending-group">
              <label className="form-field setting-field">
                Currency
                <select
                  name="defaultCurrency"
                  onChange={(event) => {
                    setDefaultCurrency(event.target.value);
                    event.currentTarget.form?.requestSubmit();
                  }}
                  value={defaultCurrency}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
            </PendingFieldset>
          </form>
        </article>

        <article className="surface setting-item">
          <div className="setting-main">
            <h2>Reminder notifications</h2>
            <p className="text-muted">{reminderSummary}</p>
          </div>
          <form action={updateRemindersEnabledAction} className="setting-control-form">
            <PendingFieldset className="form-pending-group">
              <label className="form-checkbox">
                <input
                  checked={remindersEnabled}
                  name="remindersEnabled"
                  onChange={(event) => {
                    setRemindersEnabled(event.target.checked);
                    event.currentTarget.form?.requestSubmit();
                  }}
                  type="checkbox"
                />
                Enable reminder emails
              </label>
            </PendingFieldset>
          </form>
        </article>

        <article className="surface setting-item">
          <div className="setting-main">
            <h2>Reminder lead time</h2>
            <p className="text-muted">Choose when reminders are sent before billing day.</p>
          </div>
          <form action={updateReminderLeadTimeAction} className="setting-control-form">
            <PendingFieldset className="form-pending-group">
              <label className="form-field setting-field">
                Days before billing
                <select
                  disabled={!remindersEnabled}
                  name="reminderDaysBefore"
                  onChange={(event) => {
                    setReminderDays(event.target.value);
                    event.currentTarget.form?.requestSubmit();
                  }}
                  value={reminderDaysBefore}
                >
                  {REMINDER_DAY_OPTIONS.map((dayCount) => (
                    <option key={dayCount} value={dayCount}>
                      {dayCount} day{dayCount === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </label>
            </PendingFieldset>
          </form>
        </article>

        <article className="surface setting-item">
          <div className="setting-main">
            <h2>Account details</h2>
            <p className="text-muted">
              Name: {displayName.trim() || "Not set"}.
              <br />
              Email: {userEmail}
            </p>
          </div>
          <div className="inline-actions">
            <button className="button button-secondary" onClick={() => setIsAccountModalOpen(true)} type="button">
              Edit Account
            </button>
          </div>
        </article>
      </section>

      {isAccountModalOpen ? (
        <div
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setIsAccountModalOpen(false)}
          role="dialog"
        >
          <article className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <p className="eyebrow">Account</p>
                <h2>Update account details</h2>
              </div>
              <button
                className="button button-secondary button-small"
                onClick={() => setIsAccountModalOpen(false)}
                type="button"
              >
                Close
              </button>
            </header>
            <form action={updateAccountDetailsAction} className="form-grid">
              <PendingFieldset className="form-grid form-pending-group">
                <label className="form-field">
                  Display name
                  <input
                    maxLength={120}
                    name="displayName"
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                    type="text"
                    value={displayName}
                  />
                </label>
                <label className="form-field">
                  Email
                  <input readOnly type="email" value={userEmail} />
                </label>
                <p className="text-muted">More account fields can be added here without changing page-level settings UX.</p>
                <div className="inline-actions">
                  <PendingSubmitButton idleLabel="Save Account Details" pendingLabel="Saving..." />
                  <button className="button button-secondary" onClick={() => setIsAccountModalOpen(false)} type="button">
                    Cancel
                  </button>
                </div>
              </PendingFieldset>
            </form>
          </article>
        </div>
      ) : null}
    </section>
  );
}
