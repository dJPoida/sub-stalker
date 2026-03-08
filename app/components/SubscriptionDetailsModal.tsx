"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
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
    case "recent_activity":
      return "Opened from recent activity";
    case "subscriptions_list":
      return "Opened from subscriptions list";
    default:
      return "Subscription details";
  }
}

export default function SubscriptionDetailsModal({
  isOpen,
  loadState,
  details,
  source,
  errorMessage,
  onClose,
  onViewFullHistoryClick,
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

  const historyHref = useMemo(() => {
    if (!details) {
      return "/subscriptions";
    }

    return details.links.billingHistoryUrl ?? "/subscriptions";
  }, [details]);

  const historyIsExternal = historyHref.startsWith("http://") || historyHref.startsWith("https://");

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
            {details ? <p className="text-muted">Last updated: {formatDateTime(details.lastUpdatedAt)}</p> : null}
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
            <article className="surface surface-soft details-section">
              <div className="details-title-row">
                <div className="details-logo">{getInitials(details.name)}</div>
                <div>
                  <h3>{details.name}</h3>
                  <p className="text-muted">
                    {formatMoney(details.amountCents, details.currency)} every {details.billingIntervalLabel.toLowerCase()}
                  </p>
                </div>
              </div>
              <div className="inline-actions">
                <span className={details.status === "ACTIVE" ? "pill pill-ok" : "pill pill-fail"}>{details.status}</span>
                <span className="pill">
                  Monthly estimate: {formatMoney(details.normalizedMonthlyAmountCents, details.currency)}
                </span>
              </div>
            </article>

            <article className="surface details-section">
              <h3>Billing Snapshot</h3>
              <dl className="details-definition-list">
                <div>
                  <dt>Amount and cadence</dt>
                  <dd>
                    {formatMoney(details.amountCents, details.currency)} / {details.billingIntervalLabel.toLowerCase()}
                  </dd>
                </div>
                <div>
                  <dt>Next charge date</dt>
                  <dd>
                    {details.status === "CANCELED"
                      ? formatDate(details.cancellationEffectiveDate)
                      : formatDate(details.nextBillingDate)}
                  </dd>
                </div>
                <div>
                  <dt>Last charge</dt>
                  <dd>
                    {formatDate(details.lastChargeDate)}{" "}
                    {details.lastChargeAmountCents !== null
                      ? `(${formatMoney(details.lastChargeAmountCents, details.currency)})`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>Payment method</dt>
                  <dd>{details.paymentMethodMasked}</dd>
                </div>
                <div>
                  <dt>Trial end date</dt>
                  <dd>{formatDate(details.trialEndDate)}</dd>
                </div>
              </dl>
            </article>

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

            <article className="surface details-section">
              <h3>Subscription Metadata</h3>
              <p className="text-muted">
                Tags: {details.metadataTags.length > 0 ? details.metadataTags.join(", ") : "No tags available"}
              </p>
              <p className="text-muted">Signed up by: {details.signedUpBy ?? "Not captured"}</p>
              <p className="text-muted">Notes: {details.notesMarkdown?.trim() ? "Available below" : "Not captured"}</p>
              {details.notesMarkdown?.trim() ? <pre className="details-notes">{details.notesMarkdown}</pre> : null}
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

            <footer className="inline-actions details-action-row">
              {historyIsExternal ? (
                <a
                  className="button button-secondary"
                  href={historyHref}
                  onClick={onViewFullHistoryClick}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  View Full History
                </a>
              ) : (
                <Link className="button button-secondary" href={historyHref} onClick={onViewFullHistoryClick}>
                  View Full History
                </Link>
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
