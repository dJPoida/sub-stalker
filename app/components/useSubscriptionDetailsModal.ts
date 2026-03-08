"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { trackTelemetryEvent } from "@/app/components/telemetry";
import type {
  SubscriptionDetailsContract,
  SubscriptionModalCloseReason,
  SubscriptionModalOpenSource,
} from "@/lib/subscription-details";

type DetailsResponsePayload = {
  data?: SubscriptionDetailsContract;
};

type ModalFetchState = "idle" | "loading" | "ready" | "empty" | "error";

type OpenModalArgs = {
  subscriptionId: string;
  source: SubscriptionModalOpenSource;
};

export function useSubscriptionDetailsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [source, setSource] = useState<SubscriptionModalOpenSource | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<ModalFetchState>("idle");
  const [details, setDetails] = useState<SubscriptionDetailsContract | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        return;
      }

      if (!response.ok) {
        setFetchState("error");
        setErrorMessage("Could not load subscription details.");
        return;
      }

      const payload = (await response.json()) as DetailsResponsePayload;

      if (!payload.data) {
        setFetchState("empty");
        return;
      }

      setDetails(payload.data);
      setFetchState("ready");
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      setFetchState("error");
      setErrorMessage(error instanceof Error ? error.message : "Could not load subscription details.");
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
    isOpen,
    source,
    fetchState,
    details,
    errorMessage,
    openModal,
    closeModal,
    trackViewFullHistory,
  };
}
