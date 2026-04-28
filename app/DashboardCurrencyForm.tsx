"use client";

import { CURRENCY_OPTIONS } from "@/lib/currencies";

type DashboardCurrencyFormProps = {
  defaultCurrency: string;
  updateCurrencyAction: (formData: FormData) => Promise<void>;
};

export default function DashboardCurrencyForm({
  defaultCurrency,
  updateCurrencyAction,
}: DashboardCurrencyFormProps) {
  const currencyOptions = CURRENCY_OPTIONS.includes(defaultCurrency as (typeof CURRENCY_OPTIONS)[number])
    ? CURRENCY_OPTIONS
    : [defaultCurrency, ...CURRENCY_OPTIONS];

  return (
    <form action={updateCurrencyAction} className="dashboard-currency-form">
      <label className="form-field dashboard-currency-field">
        Site currency
        <select
          name="defaultCurrency"
          onChange={(event) => {
            event.currentTarget.form?.requestSubmit();
          }}
          value={defaultCurrency}
        >
          {currencyOptions.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
