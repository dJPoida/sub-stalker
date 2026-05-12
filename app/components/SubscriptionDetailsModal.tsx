"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  SubscriptionDetailsActionCapability,
  SubscriptionDetailsAlertItem,
  SubscriptionDetailsAlertSeverity,
  SubscriptionDetailsChip,
  SubscriptionDetailsChipTone,
  SubscriptionDetailsContract,
  SubscriptionModalCloseReason,
  SubscriptionModalOpenSource,
} from "@/lib/subscription-details";

type SubscriptionDetailsMutationAction = Extract<
  SubscriptionDetailsActionCapability["key"],
  "mark_cancelled" | "mark_for_review"
>;

type SubscriptionDetailsModalActionMessage = {
  type: "error" | "success";
  text: string;
};

type SubscriptionDetailsModalProps = {
  isOpen: boolean;
  loadState: "idle" | "loading" | "ready" | "empty" | "error";
  details: SubscriptionDetailsContract | null;
  source: SubscriptionModalOpenSource | null;
  errorMessage: string | null;
  actionMessage?: SubscriptionDetailsModalActionMessage | null;
  pendingActionKey?: SubscriptionDetailsMutationAction | null;
  onClose: (reason: SubscriptionModalCloseReason) => void;
  onViewFullHistoryClick: () => void;
  onEditSubscription?: ((subscriptionId: string) => void) | null;
  onRunMutationAction?: ((actionKey: SubscriptionDetailsMutationAction) => Promise<boolean>) | null;
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

function formatAttentionSeverityLabel(severity: SubscriptionDetailsAlertSeverity): string {
  if (severity === "high") {
    return "High";
  }

  if (severity === "medium") {
    return "Medium";
  }

  return "Low";
}

function attentionSeverityClassName(severity: SubscriptionDetailsAlertSeverity): string {
  return `attention-severity attention-severity-${severity}`;
}

function attentionSeverityGlyph(severity: SubscriptionDetailsAlertSeverity): string {
  if (severity === "high") {
    return "!";
  }

  if (severity === "medium") {
    return "~";
  }

  return "i";
}

function formatAlertImpactCopy(item: SubscriptionDetailsAlertItem): string | null {
  if (!item.currency) {
    return null;
  }

  if (item.currentAmountCents !== null && item.projectedAmountCents !== null && item.projectedAmountCents > item.currentAmountCents) {
    const baselineLabel = item.code === "higher_price_renewal" ? "last charge" : "current price";

    return `Projected increase: ${formatMoney(item.projectedAmountCents - item.currentAmountCents, item.currency)} over the ${baselineLabel} (${formatMoney(item.currentAmountCents, item.currency)}).`;
  }

  if (item.projectedAmountCents !== null) {
    return `Projected renewal amount: ${formatMoney(item.projectedAmountCents, item.currency)}.`;
  }

  if (item.currentAmountCents !== null && item.code === "promo_ending_soon") {
    return `Standard rate shown: ${formatMoney(item.currentAmountCents, item.currency)} after the promo window.`;
  }

  return null;
}

function isExternalHref(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function formatExternalHrefLabel(value: string | null): string {
  if (!value) {
    return "Not captured";
  }

  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "Invalid URL";
  }
}

function pendingActionLabel(actionKey: SubscriptionDetailsMutationAction): string {
  if (actionKey === "mark_cancelled") {
    return "Marking...";
  }

  return "Saving...";
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

export default function SubscriptionDetailsModal({
  isOpen,
  loadState,
  details,
  source,
  errorMessage,
  actionMessage = null,
  pendingActionKey = null,
  onClose,
  onViewFullHistoryClick,
  onEditSubscription = null,
  onRunMutationAction = null,
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

  const historyIsExternal = isExternalHref(historyHref);
  const notesPreview = getNotesPreview(details?.notesMarkdown ?? null);
  const headerChips = details ? details.v2.header.chips.filter((chip) => chip.key !== "category") : [];
  const attentionItems = details?.v2.attentionNeeded.items ?? [];
  const quickActions = details?.v2.actionBar.quickActions ?? [];
  const reviewState = details?.v2.lifecycle.reviewState ?? null;
  const editAction = details ? getActionByKey(details.v2.actionBar.header, "edit_subscription") : null;
  const markCancelledAction = details ? getActionByKey(details.v2.actionBar.header, "mark_cancelled") : null;
  const markForReviewAction = details ? getActionByKey(details.v2.actionBar.quickActions, "mark_for_review") : null;
  const openManagementAction = details ? getActionByKey(details.v2.actionBar.quickActions, "open_management_page") : null;
  const cancelSoonAction = details ? getActionByKey(details.v2.actionBar.quickActions, "cancel_soon") : null;
  const editActionState = resolveActionState(editAction, "Edit", "Edit controls are unavailable from this view.");
  const markCancelledActionState = resolveActionState(
    markCancelledAction,
    "Mark Cancelled",
    "Cancellation controls are unavailable from this view.",
  );
  const markForReviewActionState = resolveActionState(
    markForReviewAction,
    "Mark for review",
    "Review controls are unavailable from this view.",
  );
  const openManagementActionState = resolveActionState(
    openManagementAction,
    "Open management page",
    "Management page is unavailable for this subscription.",
  );
  const cancelSoonActionState = resolveActionState(
    cancelSoonAction,
    "Cancel soon",
    "Provider cancellation flow is unavailable for this subscription.",
  );
  const editUnavailableReason =
    editActionState.unavailableReason ??
    (onEditSubscription ? null : "Open this subscription from the subscriptions page to edit it.");
  const markCancelledUnavailableReason =
    markCancelledActionState.unavailableReason ?? (onRunMutationAction ? null : "Cancellation controls are unavailable.");
  const markForReviewUnavailableReason =
    markForReviewActionState.unavailableReason ?? (onRunMutationAction ? null : "Review controls are unavailable.");
  const lifecycleActionHint = details && !onEditSubscription ? "Open this subscription from the subscriptions page to edit it." : null;
  const isMutationPending = pendingActionKey !== null;

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

  async function handleActionClick(action: SubscriptionDetailsActionCapability): Promise<void> {
    if (!details || action.availability === "disabled") {
      return;
    }

    if (action.requiresConfirmation) {
      const confirmed = window.confirm(action.confirmationLabel ?? `Continue with ${action.label.toLowerCase()}?`);

      if (!confirmed) {
        return;
      }
    }

    if (action.kind === "mutate") {
      if (!onRunMutationAction || (action.key !== "mark_cancelled" && action.key !== "mark_for_review")) {
        return;
      }

      await onRunMutationAction(action.key);
      return;
    }

    if (action.kind === "navigate") {
      if (!action.href) {
        return;
      }

      if (isExternalHref(action.href)) {
        window.open(action.href, "_blank", "noopener,noreferrer");
        return;
      }

      onClose("close_button");
      window.location.assign(action.href);
      return;
    }

    if (action.key === "edit_subscription" && onEditSubscription) {
      onEditSubscription(details.id);
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
                  <div aria-busy={isMutationPending} className="details-hero-action-row">
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

                    <button
                      className="button-danger button-small"
                      disabled={markCancelledActionState.disabled || !onRunMutationAction || isMutationPending}
                      onClick={() => {
                        if (markCancelledAction) {
                          void handleActionClick(markCancelledAction);
                        }
                      }}
                      title={markCancelledUnavailableReason ?? undefined}
                      type="button"
                    >
                      {pendingActionKey === "mark_cancelled"
                        ? pendingActionLabel("mark_cancelled")
                        : markCancelledActionState.label}
                    </button>
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

            <article className="surface details-section details-attention-panel">
              <div className="details-section-heading">
                <div className="stack">
                  <h3>Attention Needed</h3>
                  <p className="text-muted details-card-caption">
                    Promo and price-change risks derived from this subscription&apos;s current billing metadata.
                  </p>
                </div>
                {reviewState ? (
                  <span className={reviewState.isMarked ? "pill details-review-pill" : "pill"} role="status">
                    {reviewState.isMarked ? "Marked for review" : "Not marked for review"}
                  </span>
                ) : null}
              </div>

              {reviewState?.isMarked ? (
                <p className="details-attention-review-note">
                  This subscription has been flagged for review before the next billing event.
                </p>
              ) : null}

              {reviewState && !reviewState.canPersist && reviewState.unavailableReason ? (
                <p className="text-muted details-card-caption">{reviewState.unavailableReason}</p>
              ) : null}

              {attentionItems.length === 0 ? (
                <p className="text-muted details-card-empty">No promo or price-change alerts are active for this subscription.</p>
              ) : (
                <div className="details-attention-list">
                  {attentionItems.map((item) => {
                    const impactCopy = formatAlertImpactCopy(item);

                    return (
                      <article className="details-attention-item" key={item.code}>
                        <div className="details-attention-item-header">
                          <span className={attentionSeverityClassName(item.severity)}>
                            <span aria-hidden="true" className="attention-severity-glyph">
                              {attentionSeverityGlyph(item.severity)}
                            </span>
                            {formatAttentionSeverityLabel(item.severity)}
                          </span>
                          {item.effectiveDate ? <span className="metric-note">Effective {formatDate(item.effectiveDate)}</span> : null}
                        </div>
                        <h4>{item.title}</h4>
                        <p className="text-muted">{item.message}</p>
                        {impactCopy ? <p className="details-attention-impact">{impactCopy}</p> : null}
                      </article>
                    );
                  })}
                </div>
              )}

              {details.v2.attentionNeeded.state === "partial" ? (
                <p className="text-muted details-card-caption">
                  Some pricing signals are still missing, so additional review items may appear when more billing history is captured.
                </p>
              ) : null}
            </article>

            <article className="surface details-section details-quick-actions-panel">
              <div className="details-section-heading">
                <div className="stack">
                  <h3>Quick Actions</h3>
                  <p className="text-muted details-card-caption">
                    Open provider pages, tune reminder settings, or flag the subscription without leaving this modal.
                  </p>
                </div>
              </div>

              <div aria-busy={isMutationPending} className="details-quick-actions-grid" role="group" aria-label="Subscription quick actions">
                {quickActions.map((action) => {
                  const isMutationAction = action.key === "mark_cancelled" || action.key === "mark_for_review";
                  const isPending = isMutationAction && pendingActionKey === action.key;
                  const isDisabled =
                    action.availability === "disabled" || (action.kind === "mutate" && (!onRunMutationAction || isMutationPending));
                  const label =
                    isPending && action.key === "mark_cancelled"
                      ? pendingActionLabel("mark_cancelled")
                      : isPending && action.key === "mark_for_review"
                        ? pendingActionLabel("mark_for_review")
                        : action.label;

                  return (
                    <button
                      className="button button-secondary details-quick-action-button"
                      disabled={isDisabled}
                      key={action.key}
                      onClick={() => void handleActionClick(action)}
                      title={action.availability === "disabled" ? action.unavailableReason ?? undefined : undefined}
                      type="button"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {actionMessage ? (
                <p
                  aria-live="polite"
                  className={actionMessage.type === "error" ? "status-error details-quick-actions-status" : "status-help details-quick-actions-status"}
                >
                  {actionMessage.text}
                </p>
              ) : null}
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
              <article className="surface details-section details-lifecycle-panel">
                <div className="details-section-heading">
                  <div className="stack">
                    <h3>Lifecycle Controls</h3>
                    <p className="text-muted details-card-caption">
                      Review billing state, mark follow-up work, or record a completed cancellation.
                    </p>
                  </div>
                  <div className="inline-actions details-tag-list" aria-label="Lifecycle state">
                    {details.v2.lifecycle.chips.map((chip) => renderHeaderChip(chip))}
                  </div>
                </div>
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
                    <dt>Review state</dt>
                    <dd>{reviewState?.isMarked ? "Marked for review" : "Not marked for review"}</dd>
                  </div>
                  <div>
                    <dt>Cancellation details</dt>
                    <dd>{details.cancellationReason ?? (details.status === "CANCELED" ? "Cancellation recorded" : "None")}</dd>
                  </div>
                </dl>

                {reviewState && !reviewState.canPersist && reviewState.unavailableReason ? (
                  <p className="text-muted details-card-caption">{reviewState.unavailableReason}</p>
                ) : null}

                <div aria-busy={isMutationPending} className="details-lifecycle-actions">
                  <button
                    className="button button-secondary button-small"
                    disabled={markForReviewActionState.disabled || !onRunMutationAction || isMutationPending}
                    onClick={() => {
                      if (markForReviewAction) {
                        void handleActionClick(markForReviewAction);
                      }
                    }}
                    title={markForReviewUnavailableReason ?? undefined}
                    type="button"
                  >
                    {pendingActionKey === "mark_for_review"
                      ? pendingActionLabel("mark_for_review")
                      : markForReviewActionState.label}
                  </button>
                  <button
                    className="button-danger button-small"
                    disabled={markCancelledActionState.disabled || !onRunMutationAction || isMutationPending}
                    onClick={() => {
                      if (markCancelledAction) {
                        void handleActionClick(markCancelledAction);
                      }
                    }}
                    title={markCancelledUnavailableReason ?? undefined}
                    type="button"
                  >
                    {pendingActionKey === "mark_cancelled"
                      ? pendingActionLabel("mark_cancelled")
                      : markCancelledActionState.label}
                  </button>
                </div>
              </article>

              <article className="surface details-section details-management-panel">
                <div className="details-section-heading">
                  <div className="stack">
                    <h3>Management</h3>
                    <p className="text-muted details-card-caption">
                      Provider links are shown only when they resolve to a valid http or https URL.
                    </p>
                  </div>
                  <span className="pill">{details.v2.management.providerDisplayName}</span>
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
                    <dd>{formatExternalHrefLabel(details.links.billingConsoleUrl)}</dd>
                  </div>
                  <div>
                    <dt>Cancel URL</dt>
                    <dd>{formatExternalHrefLabel(details.links.cancelSubscriptionUrl)}</dd>
                  </div>
                </dl>

                <div className="details-management-actions" role="group" aria-label="Provider management actions">
                  <button
                    className="button button-secondary button-small"
                    disabled={openManagementActionState.disabled}
                    onClick={() => {
                      if (openManagementAction) {
                        void handleActionClick(openManagementAction);
                      }
                    }}
                    title={openManagementActionState.unavailableReason ?? undefined}
                    type="button"
                  >
                    {openManagementActionState.label}
                  </button>
                  <button
                    className="button button-secondary button-small"
                    disabled={cancelSoonActionState.disabled}
                    onClick={() => {
                      if (cancelSoonAction) {
                        void handleActionClick(cancelSoonAction);
                      }
                    }}
                    title={cancelSoonActionState.unavailableReason ?? undefined}
                    type="button"
                  >
                    {cancelSoonActionState.label}
                  </button>
                  <button
                    className="button button-secondary button-small"
                    disabled={historyAction?.availability !== "enabled"}
                    onClick={() => {
                      if (historyAction) {
                        void handleActionClick(historyAction);
                      }
                    }}
                    title={historyAction?.availability === "disabled" ? historyAction.unavailableReason ?? undefined : undefined}
                    type="button"
                  >
                    {historyAction?.label ?? "View billing history"}
                  </button>
                </div>
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
