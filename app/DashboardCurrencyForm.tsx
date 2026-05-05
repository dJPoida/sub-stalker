"use client";

import { usePathname } from "next/navigation";

import CurrencySelectControl from "@/app/components/CurrencySelectControl";

type DashboardCurrencyFormProps = {
  defaultCurrency: string;
  updateCurrencyAction: (formData: FormData) => Promise<void>;
};

export default function DashboardCurrencyForm({
  defaultCurrency,
  updateCurrencyAction,
}: DashboardCurrencyFormProps) {
  const pathname = usePathname();

  return (
    <form action={updateCurrencyAction} className="dashboard-currency-form">
      <input name="returnTo" type="hidden" value={pathname || "/"} />
      <label className="form-field dashboard-currency-field">
        <span className="visually-hidden">Site currency</span>
        <CurrencySelectControl
          ariaLabel="Site currency"
          name="defaultCurrency"
          onChange={(event) => {
            event.currentTarget.form?.requestSubmit();
          }}
          value={defaultCurrency}
        />
      </label>
    </form>
  );
}
