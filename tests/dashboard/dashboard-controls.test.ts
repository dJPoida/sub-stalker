import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  getDashboardCategoryColor,
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
          category: "Streaming",
          subscriptionCount: 3,
          totalsByCurrency: [
            { currency: "USD", monthlyEquivalentSpendCents: 4500 },
            { currency: "AUD", monthlyEquivalentSpendCents: 1200 },
          ],
        },
        {
          category: "Cloud & Hosting",
          subscriptionCount: 2,
          totalsByCurrency: [{ currency: "USD", monthlyEquivalentSpendCents: 9000 }],
        },
        {
          category: "Productivity",
          subscriptionCount: 1,
          totalsByCurrency: [{ currency: "AUD", monthlyEquivalentSpendCents: 2200 }],
        },
      ],
      "USD",
      "cloud",
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.category, "Cloud & Hosting");
    assert.equal(rows[0]?.monthlyEquivalentSpendCents, 9000);
    assert.equal(rows[0]?.subscriptionCount, 2);
  });

  test("assigns deterministic category colors", () => {
    const streamingColor = getDashboardCategoryColor("Streaming");
    const streamingColorAgain = getDashboardCategoryColor("Streaming");
    const trimmedCaseVariantColor = getDashboardCategoryColor(" streaming ");
    const otherColor = getDashboardCategoryColor("Cloud & Hosting");

    assert.equal(streamingColor, streamingColorAgain);
    assert.equal(streamingColor, trimmedCaseVariantColor);
    assert.notEqual(streamingColor.length, 0);
    assert.notEqual(otherColor.length, 0);
  });
});
