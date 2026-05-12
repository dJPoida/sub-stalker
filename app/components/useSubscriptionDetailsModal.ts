"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { isSessionExpiredRedirectError, redirectOnUnauthorized } from "@/app/components/session-expiry";
import { trackTelemetryEvent } from "@/app/components/telemetry";
import type {
  SubscriptionDetailsActionCapability,
  SubscriptionDetailsContract,
  SubscriptionModalCloseReason,
  SubscriptionModalOpenSource,
} from "@/lib/subscription-details";

type DetailsResponsePayload = {
  data?: SubscriptionDetailsContract;
  error?: string;
};

type ModalFetchState = "idle" | "loading" | "ready" | "empty" | "error";

type OpenModalArgs = {
  subscriptionId: string;
  source: SubscriptionModalOpenSource;
};

type ModalActionMessage = {
  type: "error" | "success";
  text: string;
};

type SubscriptionDetailsMutationAction = Extract<
  SubscriptionDetailsActionCapability["key"],
  "mark_cancelled" | "mark_for_review"
>;

function actionSuccessMessage(actionKey: SubscriptionDetailsMutationAction): string {
  if (actionKey === "mark_cancelled") {
    return "Subscription marked as cancelled.";
  }

  return "Subscription marked for review.";
}

export function useSubscriptionDetailsModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState<SubscriptionModalOpenSource | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<ModalFetchState>("idle");
  const [details, setDetails] = useState<SubscriptionDetailsContract | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingActionKey, setPendingActionKey] = useState<SubscriptionDetailsMutationAction | null>(null);
  const [actionMessage, setActionMessage] = useState<ModalActionMessage | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const openModal = useCallback(async ({ subscriptionId, source: sourceValue }: OpenModalArgs) => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setIsOpen(true);
    setSource(sourceValue);
    setSelectedSubscriptionId(subscriptionId);
    setFetchState("loading");
    setDetails(null);
    setErrorMessage(null);
    setPendingActionKey(null);
    setActionMessage(null);

    trackTelemetryEvent({
      eventName: "subscription_details_modal_open",
      source: sourceValue,
      subscriptionId,
    });

    try {
      const response = await fetch(`/api/subscriptions/${encodeURIComponent(subscriptionId)}/details`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (response.status === 404) {
        setFetchState("empty");
        trackTelemetryEvent({
          eventName: "subscription_details_fetch_empty",
          source: sourceValue,
          subscriptionId,
        });
        return;
      }

      redirectOnUnauthorized(response);

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as DetailsResponsePayload;

        setFetchState("error");
        setErrorMessage(payload.error ?? "Could not load subscription details.");
        trackTelemetryEvent({
          eventName: "subscription_details_fetch_error",
          source: sourceValue,
          subscriptionId,
          outcome: "failure",
        });
        return;
      }

      const payload = (await response.json()) as DetailsResponsePayload;

      if (!payload.data) {
        setFetchState("empty");
        trackTelemetryEvent({
          eventName: "subscription_details_fetch_empty",
          source: sourceValue,
          subscriptionId,
        });
        return;
      }

      setDetails(payload.data);
      setFetchState("ready");
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      if (isSessionExpiredRedirectError(error)) {
        return;
      }

      setFetchState("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not load subscription details.");
      trackTelemetryEvent({
        eventName: "subscription_details_fetch_error",
        source: sourceValue,
        subscriptionId,
        outcome: "failure",
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, []);

  const closeModal = useCallback(
    (reason: SubscriptionModalCloseReason = "unknown") => {
      abortRef.current?.abort();
      abortRef.current = null;
      setIsOpen(false);
      setPendingActionKey(null);
      setActionMessage(null);

      if (source && selectedSubscriptionId) {
        trackTelemetryEvent({
          eventName: "subscription_details_modal_close",
          source,
          subscriptionId: selectedSubscriptionId,
          closeReason: reason,
        });
      }
    },
    [source, selectedSubscriptionId],
  );

  const runMutationAction = useCallback(
    async (actionKey: SubscriptionDetailsMutationAction): Promise<boolean> => {
      if (!selectedSubscriptionId || !source) {
        return false;
      }

      setPendingActionKey(actionKey);
      setActionMessage(null);

      try {
        const response = await fetch(`/api/subscriptions/${encodeURIComponent(selectedSubscriptionId)}/actions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: actionKey,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as DetailsResponsePayload;

        redirectOnUnauthorized(response);

        if (payload.data) {
          setDetails(payload.data);
          setFetchState("ready");
        }

        if (!response.ok) {
          setActionMessage({
            type: "error",
            text: payload.error ?? "Could not update this subscription.",
          });
          trackTelemetryEvent({
            action: actionKey,
            eventName: "subscription_details_mutation_result",
            outcome: "failure",
            source,
            subscriptionId: selectedSubscriptionId,
          });
          return false;
        }

        setActionMessage({
          type: "success",
          text: actionSuccessMessage(actionKey),
        });
        trackTelemetryEvent({
          action: actionKey,
          eventName: "subscription_details_mutation_result",
          outcome: "success",
          source,
          subscriptionId: selectedSubscriptionId,
        });
        router.refresh();
        return true;
      } catch (error) {
        if (isSessionExpiredRedirectError(error)) {
          return false;
        }

        setActionMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Could not update this subscription.",
        });
        trackTelemetryEvent({
          action: actionKey,
          eventName: "subscription_details_mutation_result",
          outcome: "failure",
          source,
          subscriptionId: selectedSubscriptionId,
        });
        return false;
      } finally {
        setPendingActionKey(null);
      }
    },
    [router, selectedSubscriptionId, source],
  );

  const retryLoad = useCallback(() => {
    if (!selectedSubscriptionId || !source) {
      return;
    }

    void openModal({
      subscriptionId: selectedSubscriptionId,
      source,
    });
  }, [openModal, selectedSubscriptionId, source]);

  const trackViewFullHistory = useCallback(() => {
    if (!source || !selectedSubscriptionId) {
      return;
    }

    trackTelemetryEvent({
      eventName: "subscription_details_view_full_history",
      source,
      subscriptionId: selectedSubscriptionId,
    });
  }, [source, selectedSubscriptionId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    actionMessage,
    pendingActionKey,
    isOpen,
    source,
    fetchState,
    details,
    errorMessage,
    openModal,
    closeModal,
    retryLoad,
    runMutationAction,
    trackViewFullHistory,
  };
}
