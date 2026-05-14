import type { DashboardPayload } from "@/lib/dashboard";

export type DashboardRequestStatus = "loading" | "ready" | "error";

export type DashboardRequestState = {
  status: DashboardRequestStatus;
  data: DashboardPayload | null;
  errorMessage: string | null;
};

export type DashboardRequestEvent =
  | {
      type: "fetch_start";
    }
  | {
      type: "fetch_success";
      data: DashboardPayload;
    }
  | {
      type: "fetch_error";
      errorMessage: string;
    };

export type DashboardRenderState = "loading" | "empty" | "populated" | "error";

export const INITIAL_DASHBOARD_REQUEST_STATE: DashboardRequestState = {
  status: "loading",
  data: null,
  errorMessage: null,
};

export function hasDashboardContent(data: DashboardPayload): boolean {
  if (data.kpis.subscriptions.total > 0) {
    return true;
  }

  if (data.attentionNeeded.length > 0) {
    return true;
  }

  if (data.upcomingRenewals.length > 0) {
    return true;
  }

  if (data.topCostDrivers.length > 0) {
    return true;
  }

  if (data.potentialSavings.opportunities.length > 0) {
    return true;
  }

  if (data.spendBreakdown.some((group) => group.totalsByCurrency.length > 0)) {
    return true;
  }

  return data.kpis.monthlyEquivalentSpend.totalsByCurrency.length > 0;
}

export function getDashboardRenderState(state: DashboardRequestState): DashboardRenderState {
  if (state.status === "error" && state.data === null) {
    return "error";
  }

  if (state.status === "loading" && state.data === null) {
    return "loading";
  }

  if (state.data === null) {
    return "empty";
  }

  return hasDashboardContent(state.data) ? "populated" : "empty";
}

export function reduceDashboardRequestState(
  currentState: DashboardRequestState,
  event: DashboardRequestEvent,
): DashboardRequestState {
  if (event.type === "fetch_start") {
    return {
      status: "loading",
      data: currentState.data,
      errorMessage: null,
    };
  }

  if (event.type === "fetch_success") {
    return {
      status: "ready",
      data: event.data,
      errorMessage: null,
    };
  }

  return {
    status: "error",
    data: currentState.data,
    errorMessage: event.errorMessage,
  };
}
