import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildSubscriptionReminderBatches,
  runSubscriptionReminderDispatchJob,
  type SubscriptionReminderCandidate,
  type SubscriptionReminderBatch,
} from "../../lib/subscription-reminders";

function makeCandidate(
  overrides: Partial<SubscriptionReminderCandidate> & Pick<SubscriptionReminderCandidate, "subscriptionId" | "userId">,
): SubscriptionReminderCandidate {
  const { subscriptionId, userId, ...rest } = overrides;

  return {
    subscriptionId,
    subscriptionName: `Subscription ${subscriptionId}`,
    amountCents: 1500,
    currency: "USD",
    nextBillingDate: new Date("2026-03-15T12:00:00.000Z"),
    userId,
    userEmail: `${userId}@example.com`,
    remindersEnabled: true,
    reminderDaysBefore: 3,
    ...rest,
  };
}

describe("buildSubscriptionReminderBatches", () => {
  test("selects due subscriptions using user reminder settings and groups by user + billing date", () => {
    const now = new Date("2026-03-12T08:00:00.000Z");
    const batches = buildSubscriptionReminderBatches(
      [
        makeCandidate({ subscriptionId: "sub-1", userId: "user-a", subscriptionName: "One" }),
        makeCandidate({ subscriptionId: "sub-2", userId: "user-a", subscriptionName: "Two" }),
        makeCandidate({
          subscriptionId: "sub-3",
          userId: "user-a",
          nextBillingDate: new Date("2026-03-16T12:00:00.000Z"),
        }),
        makeCandidate({
          subscriptionId: "sub-4",
          userId: "user-b",
          remindersEnabled: false,
        }),
        makeCandidate({
          subscriptionId: "sub-5",
          userId: "user-c",
          reminderDaysBefore: 0,
          nextBillingDate: new Date("2026-03-12T12:00:00.000Z"),
        }),
      ],
      now,
    );

    assert.equal(batches.length, 2);
    assert.equal(batches[0].userId, "user-c");
    assert.equal(batches[0].billingDateKey, "2026-03-12");
    assert.equal(batches[0].subscriptions.length, 1);
    assert.equal(batches[1].userId, "user-a");
    assert.equal(batches[1].billingDateKey, "2026-03-15");
    assert.equal(batches[1].subscriptions.length, 2);
    assert.deepEqual(
      batches[1].subscriptions.map((subscription) => subscription.id),
      ["sub-1", "sub-2"],
    );
  });
});

describe("runSubscriptionReminderDispatchJob", () => {
  test("skips duplicate reruns for the same user + billing cycle", async () => {
    const now = new Date("2026-03-12T08:00:00.000Z");
    const candidates = [
      makeCandidate({ subscriptionId: "sub-1", userId: "user-a", userEmail: "one@example.com" }),
    ];
    const reservedKeys = new Set<string>();
    const sentBatches: SubscriptionReminderBatch[] = [];

    const reserveDispatch = async (batch: SubscriptionReminderBatch): Promise<boolean> => {
      const key = `${batch.userId}:${batch.billingDateKey}`;

      if (reservedKeys.has(key)) {
        return false;
      }

      reservedKeys.add(key);
      return true;
    };

    const sendReminder = async (input: {
      to: string;
      userId: string;
      reminderDaysBefore: number;
      subscriptions: Array<{
        name: string;
        amountCents: number;
        currency: string;
        renewalDate: Date;
      }>;
    }) => {
      sentBatches.push({
        userId: input.userId,
        userEmail: input.to,
        reminderDaysBefore: input.reminderDaysBefore,
        billingDateKey: "2026-03-15",
        subscriptions: input.subscriptions.map((subscription, index) => ({
          id: `sent-${index}`,
          ...subscription,
        })),
      });

      return {
        success: true,
      };
    };

    const finalizeDispatches: Array<{ status: "SENT" | "FAILED"; errorMessage: string | null }> = [];

    const runOnce = async () =>
      runSubscriptionReminderDispatchJob({
        now,
        logger: { info: () => undefined, error: () => undefined },
        loadCandidates: async () => candidates,
        reserveDispatch,
        sendReminder,
        finalizeDispatch: async (input) => {
          finalizeDispatches.push({ status: input.status, errorMessage: input.errorMessage });
        },
      });

    const firstRun = await runOnce();
    const secondRun = await runOnce();

    assert.equal(firstRun.dispatchesSent, 1);
    assert.equal(firstRun.dispatchesSkippedDuplicate, 0);
    assert.equal(secondRun.dispatchesSent, 0);
    assert.equal(secondRun.dispatchesSkippedDuplicate, 1);
    assert.equal(sentBatches.length, 1);
    assert.equal(finalizeDispatches.length, 1);
    assert.equal(finalizeDispatches[0]?.status, "SENT");
  });

  test("records failed sends in dispatch metrics and completion state", async () => {
    const now = new Date("2026-03-12T08:00:00.000Z");
    const finalized: Array<{ status: "SENT" | "FAILED"; errorMessage: string | null }> = [];

    const result = await runSubscriptionReminderDispatchJob({
      now,
      logger: { info: () => undefined, error: () => undefined },
      loadCandidates: async () => [
        makeCandidate({ subscriptionId: "sub-1", userId: "user-a", userEmail: "one@example.com" }),
      ],
      reserveDispatch: async () => true,
      sendReminder: async () => ({
        success: false,
        error: "Simulated failure",
      }),
      finalizeDispatch: async (input) => {
        finalized.push({ status: input.status, errorMessage: input.errorMessage });
      },
    });

    assert.equal(result.dispatchesAttempted, 1);
    assert.equal(result.dispatchesSent, 0);
    assert.equal(result.dispatchesFailed, 1);
    assert.equal(finalized.length, 1);
    assert.equal(finalized[0]?.status, "FAILED");
    assert.equal(finalized[0]?.errorMessage, "Simulated failure");
  });
});
