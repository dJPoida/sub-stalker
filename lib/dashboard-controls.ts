import { normalizeCurrencyCode } from "@/lib/currencies";


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

function toNormalizedSearchQuery(value: string): string {
  return value.trim().toLowerCase();
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
