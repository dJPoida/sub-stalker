import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  DASHBOARD_ALL_CURRENCIES,
  DEFAULT_DASHBOARD_DATE_RANGE,
  filterDashboardRecentActivity,
  filterDashboardUpcomingRenewals,
  getDashboardCategoryColor,
  mapDashboardSpendBreakdownByCurrency,
} from "../../lib/dashboard-controls";

describe("dashboard controls filtering", () => {
  test("uses last 30 days as the default date range", () => {
    assert.equal(DEFAULT_DASHBOARD_DATE_RANGE, "30d");
  });

  test("filters upcoming renewals by currency, search, and upcoming date window", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");
    const records = [
      {
        name: "GitHub Team",
        currency: "USD",
        paymentMethod: "Visa 1234",
        renewalDate: "2026-03-20T00:00:00.000Z",
      },
      {
        name: "Canva Pro",
        currency: "AUD",
        paymentMethod: "Mastercard 9876",
        renewalDate: "2026-03-18T00:00:00.000Z",
      },
      {
        name: "Legacy Service",
        currency: "USD",
        paymentMethod: "Visa 1234",
        renewalDate: "2026-04-20T00:00:00.000Z",
      },
      {
        name: "Past Renewal",
        currency: "USD",
        paymentMethod: "Visa 1234",
        renewalDate: "2026-03-01T00:00:00.000Z",
      },
    ];

    const allResults = filterDashboardUpcomingRenewals(
      records,
      {
        currency: DASHBOARD_ALL_CURRENCIES,
        dateRange: DEFAULT_DASHBOARD_DATE_RANGE,
        searchQuery: "",
      },
      now,
    );
    const filteredUsdVisa = filterDashboardUpcomingRenewals(
      records,
      {
        currency: "usd",
        dateRange: DEFAULT_DASHBOARD_DATE_RANGE,
        searchQuery: "visa",
      },
      now,
    );

    assert.deepEqual(
      allResults.map((record) => record.name),
      ["GitHub Team", "Canva Pro"],
    );
    assert.deepEqual(
      filteredUsdVisa.map((record) => record.name),
      ["GitHub Team"],
    );
  });

  test("filters recent activity by date window, currency, and search", () => {
    const now = new Date("2026-03-11T00:00:00.000Z");
    const records = [
      {
        name: "Notion",
        currency: "USD",
        createdAt: "2026-03-09T00:00:00.000Z",
      },
      {
        name: "Spotify",
        currency: "AUD",
        createdAt: "2026-02-25T00:00:00.000Z",
      },
      {
        name: "Old Service",
        currency: "USD",
        createdAt: "2026-01-15T00:00:00.000Z",
      },
      {
        name: "Future Service",
        currency: "USD",
        createdAt: "2026-04-01T00:00:00.000Z",
      },
    ];

    const allResults = filterDashboardRecentActivity(
      records,
      {
        currency: DASHBOARD_ALL_CURRENCIES,
        dateRange: DEFAULT_DASHBOARD_DATE_RANGE,
        searchQuery: "",
      },
      now,
    );
    const filteredAud = filterDashboardRecentActivity(
      records,
      {
        currency: "AUD",
        dateRange: DEFAULT_DASHBOARD_DATE_RANGE,
        searchQuery: "spot",
      },
      now,
    );

    assert.deepEqual(
      allResults.map((record) => record.name),
      ["Notion", "Spotify"],
    );
    assert.deepEqual(
      filteredAud.map((record) => record.name),
      ["Spotify"],
    );
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
