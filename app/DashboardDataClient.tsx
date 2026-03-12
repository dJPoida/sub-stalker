"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardSectionsClient from "@/app/DashboardSectionsClient";
import type { DashboardPayload } from "@/lib/dashboard";
import {
  getDashboardRenderState,
  INITIAL_DASHBOARD_REQUEST_STATE,
  reduceDashboardRequestState,
} from "@/lib/dashboard-view-state";

type DashboardApiResponse = {
  data?: DashboardPayload;
  fetchedAt?: string;
  error?: string;
};

type DashboardDataClientProps = {
  initialCurrency?: string | null;
};

function buildAvailableCurrencies(payload: DashboardPayload): string[] {
  return [
    ...new Set([
      ...payload.kpis.monthlyEquivalentSpend.totalsByCurrency.map((entry) => entry.currency),
      ...payload.spendBreakdownByCategory.flatMap((entry) => entry.totalsByCurrency.map((total) => total.currency)),
      ...payload.attentionNeeded.map((entry) => entry.currency).filter((value): value is string => value !== null),
      ...payload.upcomingRenewals.map((entry) => entry.currency),
      ...payload.topCostDrivers.map((entry) => entry.currency),
      ...payload.potentialSavings.totalsByCurrency.map((entry) => entry.currency),
      ...payload.potentialSavings.opportunities.map((entry) => entry.currency),
      ...payload.recentSubscriptions.map((entry) => entry.currency),
    ]),
  ];
}

async function loadDashboardPayload(signal?: AbortSignal): Promise<DashboardPayload> {
  const response = await fetch("/api/dashboard", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  let parsedResponse: DashboardApiResponse | null = null;

  try {
    parsedResponse = (await response.json()) as DashboardApiResponse;
  } catch {
    parsedResponse = null;
  }

  if (!response.ok) {
    const statusMessage = `Dashboard request failed with status ${response.status}.`;
    throw new Error(parsedResponse?.error || statusMessage);
  }

  if (!parsedResponse?.data) {
    throw new Error("Dashboard payload was missing from the API response.");
  }

  return parsedResponse.data;
}

export default function DashboardDataClient({ initialCurrency }: DashboardDataClientProps) {
  const [requestState, setRequestState] = useState(INITIAL_DASHBOARD_REQUEST_STATE);

  const refreshDashboard = useCallback(async (signal?: AbortSignal) => {
    setRequestState((currentState) => reduceDashboardRequestState(currentState, { type: "fetch_start" }));

    try {
      const payload = await loadDashboardPayload(signal);
      setRequestState((currentState) =>
        reduceDashboardRequestState(currentState, {
          type: "fetch_success",
          data: payload,
        }),
      );
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : "Unable to load dashboard data.";
      setRequestState((currentState) =>
        reduceDashboardRequestState(currentState, {
          type: "fetch_error",
          errorMessage: message,
        }),
      );
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void refreshDashboard(controller.signal);

    return () => {
      controller.abort();
    };
  }, [refreshDashboard]);

  const renderState = getDashboardRenderState(requestState);
  const payload = requestState.data;

  const availableCurrencies = useMemo(() => {
    if (!payload) {
      return [];
    }

    return buildAvailableCurrencies(payload);
  }, [payload]);

  return (
    <DashboardSectionsClient
      attentionNeeded={payload?.attentionNeeded.map((item) => ({
        id: item.id,
        type: item.type,
        severity: item.severity,
        title: item.title,
        message: item.message,
        dueDate: item.dueDate,
        subscriptionIds: item.subscriptionIds,
        estimatedMonthlyImpactCents: item.estimatedMonthlyImpactCents,
        currency: item.currency,
      })) ?? []}
      availableCurrencies={availableCurrencies}
      initialCurrency={initialCurrency}
      kpis={payload?.kpis ?? null}
      loadErrorMessage={requestState.errorMessage}
      monthlySpendTotalsByCurrency={
        payload?.kpis.monthlyEquivalentSpend.totalsByCurrency.map((entry) => ({
          currency: entry.currency,
          monthlyEquivalentSpendCents: entry.monthlyEquivalentSpendCents,
        })) ?? []
      }
      onRetryLoad={() => {
        void refreshDashboard();
      }}
      potentialSavings={{
        estimatedMonthlySavingsCents: payload?.potentialSavings.estimatedMonthlySavingsCents ?? null,
        currency: payload?.potentialSavings.currency ?? null,
        totalsByCurrency:
          payload?.potentialSavings.totalsByCurrency.map((entry) => ({
            currency: entry.currency,
            estimatedMonthlySavingsCents: entry.estimatedMonthlySavingsCents,
          })) ?? [],
        opportunities:
          payload?.potentialSavings.opportunities.map((opportunity) => ({
            id: opportunity.id,
            type: opportunity.type,
            title: opportunity.title,
            description: opportunity.description,
            currency: opportunity.currency,
            estimatedMonthlySavingsCents: opportunity.estimatedMonthlySavingsCents,
            subscriptionIds: opportunity.subscriptionIds,
          })) ?? [],
        assumptions: payload?.potentialSavings.assumptions ?? [],
      }}
      recentSubscriptions={
        payload?.recentSubscriptions.map((subscription) => ({
          id: subscription.id,
          name: subscription.name,
          isActive: subscription.isActive,
          amountCents: subscription.amountCents,
          currency: subscription.currency,
          createdAt: subscription.createdAt,
        })) ?? []
      }
      renderState={renderState}
      spendBreakdownByCategory={
        payload?.spendBreakdownByCategory.map((category) => ({
          category: category.category,
          subscriptionCount: category.subscriptionCount,
          totalsByCurrency: category.totalsByCurrency.map((total) => ({
            currency: total.currency,
            monthlyEquivalentSpendCents: total.monthlyEquivalentSpendCents,
          })),
        })) ?? []
      }
      topCostDrivers={
        payload?.topCostDrivers.map((driver) => ({
          id: driver.id,
          name: driver.name,
          currency: driver.currency,
          billingInterval: driver.billingInterval,
          monthlyEquivalentAmountCents: driver.monthlyEquivalentAmountCents,
          annualProjectionCents: driver.annualProjectionCents,
          nextBillingDate: driver.nextBillingDate,
        })) ?? []
      }
      upcomingCharges={
        payload?.upcomingRenewals.map((subscription) => ({
          id: subscription.id,
          name: subscription.name,
          isActive: subscription.isActive,
          amountCents: subscription.amountCents,
          currency: subscription.currency,
          billingInterval: subscription.billingInterval,
          paymentMethod: subscription.paymentMethod,
          renewalDate: subscription.renewalDate,
          createdAt: subscription.createdAt,
          tag: subscription.tag,
        })) ?? []
      }
    />
  );
}
