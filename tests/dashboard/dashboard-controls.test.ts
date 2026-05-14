import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getDashboardSpendBreakdownColor,
  mapDashboardSpendBreakdownByCurrency,
} from "../../lib/dashboard-controls";
import { normalizeCurrencyCode, resolvePreferredCurrency } from "../../lib/currencies";

describe("dashboard controls", () => {
  test("resolves preferred currency from user default", () => {
    assert.equal(normalizeCurrencyCode("aud"), "AUD");
    assert.equal(resolvePreferredCurrency("gbp"), "GBP");
    assert.equal(resolvePreferredCurrency(""), "USD");
    assert.equal(resolvePreferredCurrency("invalid"), "USD");
  });

  test("maps spend breakdown rows by currency and search query", () => {
    const rows = mapDashboardSpendBreakdownByCurrency(
      [
        {
          label: "Alex",
          subscriptionCount: 3,
          totalsByCurrency: [
            { currency: "USD", monthlyEquivalentSpendCents: 4500 },
            { currency: "AUD", monthlyEquivalentSpendCents: 1200 },
          ],
        },
        {
          label: "Jamie",
          subscriptionCount: 2,
          totalsByCurrency: [{ currency: "USD", monthlyEquivalentSpendCents: 9000 }],
        },
        {
          label: "Not specified",
          subscriptionCount: 1,
          totalsByCurrency: [{ currency: "AUD", monthlyEquivalentSpendCents: 2200 }],
        },
      ],
      "USD",
      "jam",
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.label, "Jamie");
    assert.equal(rows[0]?.monthlyEquivalentSpendCents, 9000);
    assert.equal(rows[0]?.subscriptionCount, 2);
  });

  test("assigns deterministic spend breakdown colors", () => {
    const alexColor = getDashboardSpendBreakdownColor("Alex");
    const alexColorAgain = getDashboardSpendBreakdownColor("Alex");
    const trimmedCaseVariantColor = getDashboardSpendBreakdownColor(" alex ");
    const otherColor = getDashboardSpendBreakdownColor("Jamie");

    assert.equal(alexColor, alexColorAgain);
    assert.equal(alexColor, trimmedCaseVariantColor);
    assert.notEqual(alexColor.length, 0);
    assert.notEqual(otherColor.length, 0);
  });
});
