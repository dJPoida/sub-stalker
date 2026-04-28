export const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"] as const;

export function normalizeCurrencyCode(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function resolvePreferredCurrency(value: string | null | undefined): string {
  return normalizeCurrencyCode(value) ?? "USD";
}
