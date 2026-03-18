"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { PendingSubmitButton } from "@/app/components/PendingFormControls";
import type {
  SubscriptionDetailsActionCapability,
  SubscriptionDetailsChip,
  SubscriptionDetailsChipTone,
  SubscriptionDetailsContract,
  SubscriptionModalCloseReason,
  SubscriptionModalOpenSource,
} from "@/lib/subscription-details";

type SubscriptionDetailsModalProps = {
  isOpen: boolean;
  loadState: "idle" | "loading" | "ready" | "empty" | "error";
  details: SubscriptionDetailsContract | null;
  source: SubscriptionModalOpenSource | null;
  errorMessage: string | null;
  onClose: (reason: SubscriptionModalCloseReason) => void;
  onViewFullHistoryClick: () => void;
  onEditSubscription?: ((subscriptionId: string) => void) | null;
  deactivateAction?: ((formData: FormData) => Promise<void>) | null;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function formatMoney(amountCents: number | null, currency: string): string {
  if (amountCents === null) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitials(value: string): string {
  const parts = value
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return "SS";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function sourceLabel(value: SubscriptionModalOpenSource | null): string {
  switch (value) {
    case "upcoming_charges":
      return "Opened from upcoming charges";
    case "subscriptions_list":
      return "Opened from subscriptions list";
    default:
      return "Subscription details";
  }
}

function getNotesPreview(notesMarkdown: string | null): { preview: string | null; truncated: boolean } {
  const normalized = notesMarkdown?.trim() ?? "";

  if (!normalized) {
    return { preview: null, truncated: false };
  }

  const condensed = normalized.replace(/\n{3,}/g, "\n\n");

  if (condensed.length <= 220) {
    return { preview: condensed, truncated: false };
  }

  return {
    preview: `${condensed.slice(0, 217).trimEnd()}...`,
    truncated: true,
  };
}

function chipClassName(tone: SubscriptionDetailsChipTone): string {
  switch (tone) {
    case "success":
      return "pill pill-ok";
    case "warning":
      return "pill details-chip-warning";
    case "danger":
      return "pill pill-fail";
    default:
      return "pill";
  }
}

function renderHeaderChip(chip: SubscriptionDetailsChip): JSX.Element {
  return (
    <span className={chipClassName(chip.tone)} key={chip.key}>
      {chip.label}
    </span>
  );
}

function formatMonthlyEquivalent(amountCents: number | null, currency: string): string {
  if (amountCents === null) {
    return "Monthly equivalent unavailable";
  }

  return `${formatMoney(amountCents, currency)}/mo equivalent`;
}

function formatAnnualizedSpend(amountCents: number | null, currency: string): string {
  if (amountCents === null) {
    return "Annualized spend unavailable";
  }

  return `Annualized spend ${formatMoney(amountCents, currency)}/yr`;
}

function formatPaymentMethodSummary(signedUpBy: string | null): string {
  return signedUpBy ? `Signed up by ${signedUpBy}` : "Signed up by not captured";
}

function getActionByKey(
  actions: SubscriptionDetailsActionCapability[],
  key: SubscriptionDetailsActionCapability["key"],
): SubscriptionDetailsActionCapability | null {
  return actions.find((action) => action.key === key) ?? null;
}

function resolveActionState(
  action: SubscriptionDetailsActionCapability | null,
  fallbackLabel: string,
  fallbackUnavailableReason: string,
): {
  label: string;
  disabled: boolean;
  unavailableReason: string | null;
} {
  if (!action) {
    return {
      label: fallbackLabel,
      disabled: true,
      unavailableReason: fallbackUnavailableReason,
    };
  }

  if (action.availability === "disabled") {
    return {
      label: action.label,
      disabled: true,
      unavailableReason: action.unavailableReason,
    };
  }

  return {
    label: action.label,
    disabled: false,
    unavailableReason: null,
  };
}

function ModalDeactivateButton({
  subscriptionId,
  label,
  unavailableReason,
  deactivateAction,
}: {
  subscriptionId: string;
  label: string;
  unavailableReason: string | null;
  deactivateAction: ((formData: FormData) => Promise<void>) | null;
}): JSX.Element {
  if (!deactivateAction) {
    return (
      <button
        className="button-danger button-small"
        disabled
        title={unavailableReason ?? "Cancellation controls are unavailable from this view."}
        type="button"
      >
        {label}
      </button>
    );
  }

  return (
    <form
      action={deactivateAction}
      className="details-action-form"
      onSubmit={(event) => {
        const confirmed = window.confirm("Mark this subscription as cancelled?");

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input name="subscriptionId" type="hidden" value={subscriptionId} />
      <PendingSubmitButton
        className="button-danger button-small"
        disabled={Boolean(unavailableReason)}
        idleLabel={label}
        pendingLabel="Marking..."
      />
    </form>
  );
}

export default function SubscriptionDetailsModal({
  isOpen,
  loadState,
  details,
  source,
  errorMessage,
  onClose,
  onViewFullHistoryClick,
  onEditSubscription = null,
  deactivateAction = null,
}: SubscriptionDetailsModalProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousActiveElement = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose("escape_key");
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const panelElement = panelRef.current;

      if (!panelElement) {
        return;
      }

      const focusableElements = Array.from(panelElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute("disabled"),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (activeElement === firstElement || !panelElement.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }

        return;
      }

      if (activeElement === lastElement || !panelElement.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousActiveElement?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setCopyMessage(null);
  }, [details?.id, isOpen]);

  const historyAction = details ? getActionByKey(details.v2.actionBar.footer, "view_billing_history") : null;
  const historyHref = useMemo(() => {
    if (!historyAction?.href) {
      return "/subscriptions";
    }

    return historyAction.href;
  }, [historyAction]);

  const historyIsExternal = historyHref.startsWith("http://") || historyHref.startsWith("https://");
  const notesPreview = getNotesPreview(details?.notesMarkdown ?? null);
  const headerChips = details ? details.v2.header.chips.filter((chip) => chip.key !== "category") : [];
  const editAction = details ? getActionByKey(details.v2.actionBar.header, "edit_subscription") : null;
  const markCancelledAction = details ? getActionByKey(details.v2.actionBar.header, "mark_cancelled") : null;
  const editActionState = resolveActionState(editAction, "Edit", "Edit controls are unavailable from this view.");
  const markCancelledActionState = resolveActionState(
    markCancelledAction,
    "Mark Cancelled",
    "Cancellation controls are unavailable from this view.",
  );
  const editUnavailableReason =
    editActionState.unavailableReason ??
    (onEditSubscription ? null : "Open this subscription from the subscriptions page to edit it.");
  const markCancelledUnavailableReason =
    markCancelledActionState.unavailableReason ??
    (deactivateAction ? null : "Open this subscription from the subscriptions page to update cancellation state.");
  const lifecycleActionHint =
    details && !onEditSubscription && !deactivateAction
      ? "Manage edit and cancellation actions from the subscriptions page."
      : null;

  async function handleCopySubscriptionId(): Promise<void> {
    if (!details) {
      return;
    }

    try {
      await navigator.clipboard.writeText(details.id);
      setCopyMessage("Subscription ID copied.");
    } catch {
      setCopyMessage("Could not copy subscription ID.");
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="modal-backdrop"
      onMouseDown={() => onClose("backdrop")}
      role="dialog"
    >
      <article className="modal-panel details-modal-panel" onMouseDown={(event) => event.stopPropagation()} ref={panelRef}>
        <header className="modal-header details-modal-header">
          <div className="stack">
            <p className="eyebrow">{sourceLabel(source)}</p>
            <h2 id="subscription-details-title">Subscription Details</h2>
          </div>
          <button
            className="button button-secondary button-small details-modal-close"
            onClick={() => onClose("close_button")}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </header>

        {loadState === "loading" ? (
          <div className="details-skeleton" aria-live="polite">
            <div className="details-skeleton-line details-skeleton-line-lg" />
            <div className="details-skeleton-line" />
            <div className="details-skeleton-line" />
            <div className="details-skeleton-line details-skeleton-line-sm" />
          </div>
        ) : null}

        {loadState === "error" ? (
          <p className="status-error" aria-live="polite">
            {errorMessage ?? "Could not load subscription details."}
          </p>
        ) : null}

        {loadState === "empty" ? (
          <p className="status-help" aria-live="polite">
            Subscription details are unavailable for this record.
          </p>
        ) : null}

        {loadState === "ready" && details ? (
          <div className="details-grid">
            <article className="surface surface-soft details-section details-hero">
              <div className="details-hero-row">
                <div className="details-hero-main">
                  <div className="details-title-row details-hero-identity">
                    <div className="details-logo details-hero-logo">{getInitials(details.v2.header.title)}</div>
                    <div className="details-title-copy">
                      <h3>{details.v2.header.title}</h3>
                      <p className="text-muted details-hero-subtitle">{details.v2.header.subtitle}</p>
                      <p className="text-muted details-hero-updated">Last updated: {formatDateTime(details.lastUpdatedAt)}</p>
                    </div>
                  </div>
                  <div className="inline-actions details-hero-badges" aria-label="Subscription status and category">
                    <span className="pill">{details.v2.header.categoryLabel}</span>
                    {headerChips.map((chip) => renderHeaderChip(chip))}
                  </div>
                </div>

                <div className="details-hero-actions">
                  <div className="details-hero-action-row">
                    <button
                      className="button button-secondary button-small"
                      disabled={editActionState.disabled || !onEditSubscription}
                      onClick={() => {
                        if (onEditSubscription) {
                          onEditSubscription(details.id);
                        }
                      }}
                      title={editUnavailableReason ?? undefined}
                      type="button"
                    >
                      {editActionState.label}
                    </button>

                    <ModalDeactivateButton
                      deactivateAction={deactivateAction}
                      label={markCancelledActionState.label}
                      subscriptionId={details.id}
                      unavailableReason={markCancelledUnavailableReason}
                    />
                  </div>

                  {lifecycleActionHint ? <p className="text-muted details-hero-actions-hint">{lifecycleActionHint}</p> : null}
                </div>
              </div>

              <div className="details-summary-grid" aria-label="Subscription summary">
                <article className="details-summary-card">
                  <span className="details-summary-label">Current price</span>
                  <strong className="details-summary-value">
                    {formatMoney(details.v2.summaryStrip.currentPrice.amountCents, details.v2.summaryStrip.currentPrice.currency)}
                  </strong>
                  <p className="text-muted details-summary-meta">
                    {details.v2.summaryStrip.currentPrice.intervalLabel} billing ·{" "}
                    {formatMonthlyEquivalent(
                      details.v2.summaryStrip.currentPrice.monthlyEquivalentAmountCents,
                      details.v2.summaryStrip.currentPrice.currency,
                    )}
                  </p>
                </article>

                <article className="details-summary-card">
                  <span className="details-summary-label">Renewal</span>
                  <strong className="details-summary-value">{formatDate(details.v2.summaryStrip.renewal.date)}</strong>
                  <p className="text-muted details-summary-meta">
                    {formatAnnualizedSpend(
                      details.v2.summaryStrip.renewal.annualizedSpendCents,
                      details.v2.summaryStrip.renewal.currency,
                    )}
                  </p>
                </article>

                <article className="details-summary-card">
                  <span className="details-summary-label">Payment method</span>
                  <strong className="details-summary-value">{details.v2.summaryStrip.paymentMethod.masked}</strong>
                  <p className="text-muted details-summary-meta">
                    {formatPaymentMethodSummary(details.v2.summaryStrip.paymentMethod.signedUpBy)}
                  </p>
                </article>

                <article className="details-summary-card">
                  <span className="details-summary-label">Reminder</span>
                  <strong className="details-summary-value">{details.v2.summaryStrip.reminders.statusLabel}</strong>
                  <p className="text-muted details-summary-meta">
                    {details.v2.summaryStrip.reminders.enabled ? "Reminder emails enabled" : "Reminder emails disabled"}
                  </p>
                </article>
              </div>
            </article>

            <div className="details-card-grid">
              <article className="surface details-section">
                <h3>Billing Details</h3>
                <dl className="details-definition-list">
                  <div>
                    <dt>Billing date</dt>
                    <dd>
                      {details.status === "CANCELED"
                        ? formatDate(details.cancellationEffectiveDate)
                        : formatDate(details.nextBillingDate)}
                    </dd>
                  </div>
                  <div>
                    <dt>Billing cadence</dt>
                    <dd>{details.billingIntervalLabel}</dd>
                  </div>
                  <div>
                    <dt>Payment method</dt>
                    <dd>{details.paymentMethodMasked}</dd>
                  </div>
                  <div>
                    <dt>{details.spendSummary.label}</dt>
                    <dd>{formatMoney(details.spendSummary.amountCents, details.spendSummary.currency)}</dd>
                  </div>
                  <div>
                    <dt>Current status</dt>
                    <dd>
                      <span className={details.status === "ACTIVE" ? "pill pill-ok" : "pill pill-fail"}>{details.status}</span>
                    </dd>
                  </div>
                </dl>
              </article>

              <article className="surface details-section">
                <div className="details-section-heading">
                  <h3>Notes & Category</h3>
                  <span className="pill">{details.inferredCategory}</span>
                </div>
                <p className="text-muted details-card-caption">
                  Signed up by: {details.signedUpBy ?? "Not captured"}
                </p>
                {notesPreview.preview ? (
                  <>
                    <pre className="details-notes details-notes-preview">{notesPreview.preview}</pre>
                    {notesPreview.truncated ? (
                      <p className="text-muted details-card-caption">Showing a preview of the saved notes.</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted details-card-empty">No notes saved for this subscription.</p>
                )}
              </article>
            </div>

            <div className="details-card-grid">
              <article className="surface details-section">
                <h3>Plan and Lifecycle</h3>
                <dl className="details-definition-list">
                  <div>
                    <dt>Plan / tier</dt>
                    <dd>{details.planName ?? "Not captured"}</dd>
                  </div>
                  <div>
                    <dt>Start date</dt>
                    <dd>{formatDate(details.startDate)}</dd>
                  </div>
                  <div>
                    <dt>Renewal date</dt>
                    <dd>{formatDate(details.renewalDate)}</dd>
                  </div>
                  <div>
                    <dt>Auto-renew</dt>
                    <dd>{details.autoRenew ? "On" : "Off"}</dd>
                  </div>
                  <div>
                    <dt>Cancellation details</dt>
                    <dd>{details.cancellationReason ?? (details.status === "CANCELED" ? "Cancellation recorded" : "None")}</dd>
                  </div>
                </dl>
              </article>

              <article className="surface details-section">
                <div className="details-section-heading">
                  <h3>Account References</h3>
                  <div className="inline-actions details-tag-list" aria-label="Subscription metadata tags">
                    {details.metadataTags.map((tag) => (
                      <span className="pill" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <dl className="details-definition-list">
                  <div>
                    <dt>Subscription ID</dt>
                    <dd>{details.internalIdentifiers.subscriptionId}</dd>
                  </div>
                  <div>
                    <dt>Provider reference</dt>
                    <dd>{details.internalIdentifiers.providerReference ?? "Not captured"}</dd>
                  </div>
                  <div>
                    <dt>Billing console URL</dt>
                    <dd>{details.links.billingConsoleUrl ?? "Not captured"}</dd>
                  </div>
                  <div>
                    <dt>Cancel URL</dt>
                    <dd>{details.links.cancelSubscriptionUrl ?? "Not captured"}</dd>
                  </div>
                </dl>
              </article>
            </div>

            <article className="surface details-section">
              <h3>Recent Activity Timeline</h3>
              {details.timeline.length === 0 ? (
                <p className="text-muted">No recent timeline events available.</p>
              ) : (
                <ol className="details-timeline">
                  {details.timeline.map((event) => (
                    <li key={event.id}>
                      <div>
                        <strong>{event.label}</strong>
                        <p className="text-muted">{event.description}</p>
                      </div>
                      <div className="details-timeline-meta">
                        <span>{formatDateTime(event.timestamp)}</span>
                        {event.amountCents !== null && event.currency ? (
                          <span>{formatMoney(event.amountCents, event.currency)}</span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </article>

            <footer className="inline-actions details-action-row">
              {historyAction?.availability === "enabled" ? (
                historyIsExternal ? (
                  <a
                    className="button button-secondary"
                    href={historyHref}
                    onClick={onViewFullHistoryClick}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    {historyAction.label}
                  </a>
                ) : (
                  <Link className="button button-secondary" href={historyHref} onClick={onViewFullHistoryClick}>
                    {historyAction.label}
                  </Link>
                )
              ) : (
                <button
                  className="button button-secondary"
                  disabled
                  title={historyAction?.unavailableReason ?? "Billing history is unavailable for this subscription."}
                  type="button"
                >
                  {historyAction?.label ?? "View billing history"}
                </button>
              )}

              <button className="button button-secondary" onClick={() => void handleCopySubscriptionId()} type="button">
                Copy Subscription ID
              </button>
              <button className="button" onClick={() => onClose("close_button")} type="button">
                Close
              </button>
            </footer>
            {copyMessage ? <p className="status-help">{copyMessage}</p> : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}
