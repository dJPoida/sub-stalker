export const DASHBOARD_ALL_CURRENCIES = "all";

export const DASHBOARD_DATE_RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
] as const;

export const DEFAULT_DASHBOARD_DATE_RANGE = "30d";

export type DashboardDateRangeValue = (typeof DASHBOARD_DATE_RANGE_OPTIONS)[number]["value"];

export type DashboardControlState = {
  currency: string;
  dateRange: DashboardDateRangeValue;
  searchQuery: string;
};

type DashboardUpcomingRenewalRecord = {
  name: string;
  currency: string;
  paymentMethod: string;
  renewalDate: string;
};

type DashboardRecentActivityRecord = {
  name: string;
  currency: string;
  createdAt: string;
};

function toNormalizedSearchQuery(value: string): string {
  return value.trim().toLowerCase();
}

function matchesCurrencyFilter(recordCurrency: string, selectedCurrency: string): boolean {
  if (selectedCurrency === DASHBOARD_ALL_CURRENCIES) {
    return true;
  }

  return recordCurrency.toUpperCase() === selectedCurrency.toUpperCase();
}

function matchesSearchFilter(parts: string[], normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return parts.some((part) => part.toLowerCase().includes(normalizedQuery));
}

function toDateRangeDays(value: DashboardDateRangeValue): number {
  const option = DASHBOARD_DATE_RANGE_OPTIONS.find((entry) => entry.value === value);
  return option?.days ?? DASHBOARD_DATE_RANGE_OPTIONS[1].days;
}

function isWithinUpcomingWindow(dateValue: string, now: Date, rangeDays: number): boolean {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const deltaMs = parsedDate.getTime() - now.getTime();
  const maxMs = rangeDays * 24 * 60 * 60 * 1000;

  return deltaMs >= 0 && deltaMs <= maxMs;
}

function isWithinRecentWindow(dateValue: string, now: Date, rangeDays: number): boolean {
  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const deltaMs = now.getTime() - parsedDate.getTime();
  const maxMs = rangeDays * 24 * 60 * 60 * 1000;

  return deltaMs >= 0 && deltaMs <= maxMs;
}

export function filterDashboardUpcomingRenewals<T extends DashboardUpcomingRenewalRecord>(
  records: T[],
  controls: DashboardControlState,
  now: Date,
): T[] {
  const rangeDays = toDateRangeDays(controls.dateRange);
  const normalizedQuery = toNormalizedSearchQuery(controls.searchQuery);

  return records.filter((record) => {
    if (!matchesCurrencyFilter(record.currency, controls.currency)) {
      return false;
    }

    if (!isWithinUpcomingWindow(record.renewalDate, now, rangeDays)) {
      return false;
    }

    return matchesSearchFilter([record.name, record.paymentMethod, record.currency], normalizedQuery);
  });
}

export function filterDashboardRecentActivity<T extends DashboardRecentActivityRecord>(
  records: T[],
  controls: DashboardControlState,
  now: Date,
): T[] {
  const rangeDays = toDateRangeDays(controls.dateRange);
  const normalizedQuery = toNormalizedSearchQuery(controls.searchQuery);

  return records.filter((record) => {
    if (!matchesCurrencyFilter(record.currency, controls.currency)) {
      return false;
    }

    if (!isWithinRecentWindow(record.createdAt, now, rangeDays)) {
      return false;
    }

    return matchesSearchFilter([record.name, record.currency], normalizedQuery);
  });
}
