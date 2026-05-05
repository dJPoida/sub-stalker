"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import CurrencyFlag from "react-currency-flags";

import { CURRENCY_OPTIONS } from "@/lib/currencies";

type CurrencySelectControlProps = {
  name: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};

export default function CurrencySelectControl({
  name,
  ariaLabel,
  ariaDescribedBy,
  className = "dashboard-currency-control",
  defaultValue = "USD",
  value,
  onChange,
}: CurrencySelectControlProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const selectedCurrency = value ?? uncontrolledValue;
  const currencyOptions = useMemo(
    () =>
      CURRENCY_OPTIONS.includes(selectedCurrency as (typeof CURRENCY_OPTIONS)[number])
        ? CURRENCY_OPTIONS
        : [selectedCurrency, ...CURRENCY_OPTIONS],
    [selectedCurrency],
  );

  return (
    <span className={className}>
      <CurrencyFlag currency={selectedCurrency} width={22} />
      <select
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        name={name}
        onChange={(event) => {
          setUncontrolledValue(event.target.value);
          onChange?.(event);
        }}
        value={selectedCurrency}
      >
        {currencyOptions.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </span>
  );
}
