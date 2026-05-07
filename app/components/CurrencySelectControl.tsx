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
  fullWidth?: boolean;
  required?: boolean;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
};

export default function CurrencySelectControl({
  name,
  ariaLabel,
  ariaDescribedBy,
  className,
  defaultValue = "USD",
  fullWidth = false,
  required = false,
  value,
  onChange,
}: CurrencySelectControlProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue.trim().toUpperCase());
  const selectedCurrency = (value ?? uncontrolledValue).trim().toUpperCase() || "USD";
  const currencyOptions = useMemo(
    () =>
      CURRENCY_OPTIONS.includes(selectedCurrency as (typeof CURRENCY_OPTIONS)[number])
        ? CURRENCY_OPTIONS
        : [selectedCurrency, ...CURRENCY_OPTIONS],
    [selectedCurrency],
  );
  const controlClassName = [
    "currency-select-control",
    fullWidth ? "currency-select-control-full" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={controlClassName}>
      <CurrencyFlag currency={selectedCurrency} width={22} />
      <select
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        name={name}
        onChange={(event) => {
          setUncontrolledValue(event.target.value.trim().toUpperCase());
          onChange?.(event);
        }}
        required={required}
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
