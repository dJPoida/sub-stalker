"use client";

import { usePathname } from "next/navigation";
import CurrencyFlag from "react-currency-flags";

import { CURRENCY_OPTIONS } from "@/lib/currencies";

type DashboardCurrencyFormProps = {
  defaultCurrency: string;
  updateCurrencyAction: (formData: FormData) => Promise<void>;
};

export default function DashboardCurrencyForm({
  defaultCurrency,
  updateCurrencyAction,
}: DashboardCurrencyFormProps) {
  const pathname = usePathname();
  const currencyOptions = CURRENCY_OPTIONS.includes(defaultCurrency as (typeof CURRENCY_OPTIONS)[number])
    ? CURRENCY_OPTIONS
    : [defaultCurrency, ...CURRENCY_OPTIONS];

  return (
    <form action={updateCurrencyAction} className="dashboard-currency-form">
      <input name="returnTo" type="hidden" value={pathname || "/"} />
      <label className="form-field dashboard-currency-field">
        <span className="visually-hidden">Site currency</span>
        <span className="dashboard-currency-control">
          <CurrencyFlag currency={defaultCurrency} width={22} />
          <select
            aria-label="Site currency"
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
        </span>
      </label>
    </form>
  );
}
