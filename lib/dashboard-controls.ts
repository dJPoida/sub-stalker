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

const DASHBOARD_CATEGORY_COLOR_PALETTE = [
  "#0EA5E9",
  "#F97316",
  "#22C55E",
  "#A855F7",
  "#EAB308",
  "#EF4444",
  "#14B8A6",
  "#6366F1",
  "#EC4899",
  "#84CC16",
] as const;

type DashboardUpcomingRenewalRecord = {
  name: string;
  currency: string;
  paymentMethod: string;
  renewalDate: string;
};

type DashboardSpendBreakdownCategoryRecord = {
  category: string;
  subscriptionCount: number;
  totalsByCurrency: Array<{
    currency: string;
    monthlyEquivalentSpendCents: number;
  }>;
};

export type DashboardSpendBreakdownRow = {
  category: string;
  monthlyEquivalentSpendCents: number;
  subscriptionCount: number;
  color: string;
};

function normalizeCurrencyCode(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function resolveInitialDashboardCurrency(defaultCurrency: string | null | undefined): string {
  if (String(defaultCurrency ?? "").trim().toLowerCase() === DASHBOARD_ALL_CURRENCIES) {
    return DASHBOARD_ALL_CURRENCIES;
  }

  return normalizeCurrencyCode(defaultCurrency) ?? DASHBOARD_ALL_CURRENCIES;
}

export function buildDashboardCurrencyOptions(availableCurrencies: string[], selectedCurrency: string): string[] {
  const normalizedCurrencies = [
    ...new Set(availableCurrencies.map((value) => normalizeCurrencyCode(value)).filter((value): value is string => value !== null)),
  ].sort((first, second) => first.localeCompare(second));
  const normalizedSelectedCurrency = normalizeCurrencyCode(selectedCurrency);

  if (normalizedSelectedCurrency && !normalizedCurrencies.includes(normalizedSelectedCurrency)) {
    normalizedCurrencies.push(normalizedSelectedCurrency);
    normalizedCurrencies.sort((first, second) => first.localeCompare(second));
  }

  if (!normalizedCurrencies.includes("USD")) {
    return normalizedCurrencies;
  }

  return ["USD", ...normalizedCurrencies.filter((value) => value !== "USD")];
}

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

function hashString(value: string): number {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

export function getDashboardCategoryColor(category: string): string {
  const normalized = category.trim().toLowerCase();

  if (!normalized) {
    return DASHBOARD_CATEGORY_COLOR_PALETTE[0];
  }

  const index = hashString(normalized) % DASHBOARD_CATEGORY_COLOR_PALETTE.length;
  return DASHBOARD_CATEGORY_COLOR_PALETTE[index];
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

export function mapDashboardSpendBreakdownByCurrency<T extends DashboardSpendBreakdownCategoryRecord>(
  records: T[],
  currency: string,
  searchQuery: string,
): DashboardSpendBreakdownRow[] {
  const normalizedQuery = toNormalizedSearchQuery(searchQuery);

  return records
    .map((record) => {
      const amount = record.totalsByCurrency.find(
        (entry) => entry.currency.toUpperCase() === currency.toUpperCase(),
      )?.monthlyEquivalentSpendCents;

      if (amount === undefined || amount <= 0) {
        return null;
      }

      return {
        category: record.category,
        monthlyEquivalentSpendCents: amount,
        subscriptionCount: record.subscriptionCount,
        color: getDashboardCategoryColor(record.category),
      };
    })
    .filter((record): record is DashboardSpendBreakdownRow => record !== null)
    .filter((record) => matchesSearchFilter([record.category], normalizedQuery))
    .sort((first, second) => {
      return (
        second.monthlyEquivalentSpendCents - first.monthlyEquivalentSpendCents ||
        second.subscriptionCount - first.subscriptionCount ||
        first.category.localeCompare(second.category)
      );
    });
}
