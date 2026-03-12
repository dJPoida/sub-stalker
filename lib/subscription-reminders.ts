import { db } from "./db";
import { sendSubscriptionReminderEmail, type EmailResult } from "./mail";

const DAYS_TO_MILLISECONDS = 24 * 60 * 60 * 1000;
const MAX_REMINDER_DAYS_BEFORE = 30;
const DEFAULT_REMINDER_DAYS_BEFORE = 3;

type PrismaKnownRequestLike = {
  code?: unknown;
};

type ReminderLogger = Pick<typeof console, "info" | "error">;

export type SubscriptionReminderCandidate = {
  subscriptionId: string;
  subscriptionName: string;
  amountCents: number;
  currency: string;
  nextBillingDate: Date;
  userId: string;
  userEmail: string;
  remindersEnabled: boolean;
  reminderDaysBefore: number;
};

export type SubscriptionReminderBatch = {
  userId: string;
  userEmail: string;
  reminderDaysBefore: number;
  billingDateKey: string;
  subscriptions: Array<{
    id: string;
    name: string;
    amountCents: number;
    currency: string;
    renewalDate: Date;
  }>;
};

export type SubscriptionReminderDispatchResult = {
  candidateSubscriptionsScanned: number;
  dueSubscriptions: number;
  dueUserBatches: number;
  dispatchesAttempted: number;
  dispatchesSent: number;
  dispatchesFailed: number;
  dispatchesSkippedDuplicate: number;
  ranAt: string;
};

type SubscriptionReminderDispatchDependencies = {
  now?: Date;
  logger?: ReminderLogger;
  loadCandidates?: (now: Date) => Promise<SubscriptionReminderCandidate[]>;
  reserveDispatch?: (batch: SubscriptionReminderBatch) => Promise<boolean>;
  sendReminder?: (input: {
    to: string;
    userId: string;
    reminderDaysBefore: number;
    subscriptions: Array<{
      name: string;
      amountCents: number;
      currency: string;
      renewalDate: Date;
    }>;
  }) => Promise<EmailResult>;
  finalizeDispatch?: (input: {
    batch: SubscriptionReminderBatch;
    status: "SENT" | "FAILED";
    errorMessage: string | null;
  }) => Promise<void>;
};

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown reminder dispatch error.";
}

function asPrismaKnownRequestLike(error: unknown): PrismaKnownRequestLike | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  return error as PrismaKnownRequestLike;
}

function isUniqueConstraintError(error: unknown): boolean {
  const prismaError = asPrismaKnownRequestLike(error);

  if (!prismaError) {
    return false;
  }

  return prismaError.code === "P2002";
}

function utcDayNumber(value: Date): number {
  return Math.floor(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / DAYS_TO_MILLISECONDS);
}

function toUtcDateKey(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}

function addDaysUtc(value: Date, days: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days, 0, 0, 0, 0));
}

function normalizeReminderDaysBefore(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_REMINDER_DAYS_BEFORE;
  }

  const rounded = Math.floor(value);

  if (rounded < 0) {
    return 0;
  }

  if (rounded > MAX_REMINDER_DAYS_BEFORE) {
    return MAX_REMINDER_DAYS_BEFORE;
  }

  return rounded;
}

function isDueForReminder(nextBillingDate: Date, now: Date, reminderDaysBefore: number): boolean {
  const daysUntilBilling = utcDayNumber(nextBillingDate) - utcDayNumber(now);
  return daysUntilBilling >= 0 && daysUntilBilling === reminderDaysBefore;
}

export function buildSubscriptionReminderBatches(
  candidates: SubscriptionReminderCandidate[],
  now: Date = new Date(),
): SubscriptionReminderBatch[] {
  const grouped = new Map<string, SubscriptionReminderBatch>();

  for (const candidate of candidates) {
    if (!candidate.remindersEnabled) {
      continue;
    }

    const reminderDaysBefore = normalizeReminderDaysBefore(candidate.reminderDaysBefore);

    if (!isDueForReminder(candidate.nextBillingDate, now, reminderDaysBefore)) {
      continue;
    }

    const billingDateKey = toUtcDateKey(candidate.nextBillingDate);
    const groupKey = `${candidate.userId}:${billingDateKey}`;
    const existing = grouped.get(groupKey);

    if (existing) {
      existing.subscriptions.push({
        id: candidate.subscriptionId,
        name: candidate.subscriptionName,
        amountCents: candidate.amountCents,
        currency: candidate.currency,
        renewalDate: candidate.nextBillingDate,
      });
      continue;
    }

    grouped.set(groupKey, {
      userId: candidate.userId,
      userEmail: candidate.userEmail,
      reminderDaysBefore,
      billingDateKey,
      subscriptions: [
        {
          id: candidate.subscriptionId,
          name: candidate.subscriptionName,
          amountCents: candidate.amountCents,
          currency: candidate.currency,
          renewalDate: candidate.nextBillingDate,
        },
      ],
    });
  }

  return [...grouped.values()]
    .map((batch) => ({
      ...batch,
      subscriptions: [...batch.subscriptions].sort((first, second) => {
        return (
          first.renewalDate.getTime() - second.renewalDate.getTime() ||
          first.name.localeCompare(second.name) ||
          first.id.localeCompare(second.id)
        );
      }),
    }))
    .sort((first, second) => {
      return (
        first.billingDateKey.localeCompare(second.billingDateKey) ||
        first.userEmail.localeCompare(second.userEmail) ||
        first.userId.localeCompare(second.userId)
      );
    });
}

async function loadReminderCandidates(now: Date): Promise<SubscriptionReminderCandidate[]> {
  const windowStart = startOfUtcDay(now);
  const windowEnd = endOfUtcDay(addDaysUtc(now, MAX_REMINDER_DAYS_BEFORE));
  const records = await db.subscription.findMany({
    where: {
      isActive: true,
      nextBillingDate: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    select: {
      id: true,
      userId: true,
      name: true,
      amountCents: true,
      currency: true,
      nextBillingDate: true,
      user: {
        select: {
          email: true,
          settings: {
            select: {
              remindersEnabled: true,
              reminderDaysBefore: true,
            },
          },
        },
      },
    },
    orderBy: [{ userId: "asc" }, { nextBillingDate: "asc" }, { name: "asc" }],
  });

  return records
    .filter((record): record is typeof record & { nextBillingDate: Date } => record.nextBillingDate !== null)
    .map((record) => ({
      subscriptionId: record.id,
      subscriptionName: record.name,
      amountCents: record.amountCents,
      currency: record.currency,
      nextBillingDate: record.nextBillingDate,
      userId: record.userId,
      userEmail: record.user.email,
      remindersEnabled: record.user.settings?.remindersEnabled ?? true,
      reminderDaysBefore: record.user.settings?.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS_BEFORE,
    }));
}

async function reserveReminderDispatch(batch: SubscriptionReminderBatch): Promise<boolean> {
  try {
    await db.subscriptionReminderDispatch.create({
      data: {
        userId: batch.userId,
        billingDateKey: batch.billingDateKey,
        reminderDaysBefore: batch.reminderDaysBefore,
      },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return false;
    }

    throw error;
  }
}

async function finalizeReminderDispatch(input: {
  batch: SubscriptionReminderBatch;
  status: "SENT" | "FAILED";
  errorMessage: string | null;
}): Promise<void> {
  await db.subscriptionReminderDispatch.update({
    where: {
      userId_billingDateKey: {
        userId: input.batch.userId,
        billingDateKey: input.batch.billingDateKey,
      },
    },
    data: {
      status: input.status,
      errorMessage: input.errorMessage,
    },
  });
}

export async function runSubscriptionReminderDispatchJob(
  dependencies: SubscriptionReminderDispatchDependencies = {},
): Promise<SubscriptionReminderDispatchResult> {
  const now = dependencies.now ?? new Date();
  const logger = dependencies.logger ?? console;
  const loadCandidates = dependencies.loadCandidates ?? loadReminderCandidates;
  const reserveDispatch = dependencies.reserveDispatch ?? reserveReminderDispatch;
  const sendReminder = dependencies.sendReminder ?? sendSubscriptionReminderEmail;
  const finalizeDispatch = dependencies.finalizeDispatch ?? finalizeReminderDispatch;

  const candidates = await loadCandidates(now);
  const batches = buildSubscriptionReminderBatches(candidates, now);
  const result: SubscriptionReminderDispatchResult = {
    candidateSubscriptionsScanned: candidates.length,
    dueSubscriptions: batches.reduce((total, batch) => total + batch.subscriptions.length, 0),
    dueUserBatches: batches.length,
    dispatchesAttempted: 0,
    dispatchesSent: 0,
    dispatchesFailed: 0,
    dispatchesSkippedDuplicate: 0,
    ranAt: now.toISOString(),
  };

  for (const batch of batches) {
    const reserved = await reserveDispatch(batch);

    if (!reserved) {
      result.dispatchesSkippedDuplicate += 1;
      continue;
    }

    result.dispatchesAttempted += 1;

    let emailResult: EmailResult;

    try {
      emailResult = await sendReminder({
        to: batch.userEmail,
        userId: batch.userId,
        reminderDaysBefore: batch.reminderDaysBefore,
        subscriptions: batch.subscriptions.map((subscription) => ({
          name: subscription.name,
          amountCents: subscription.amountCents,
          currency: subscription.currency,
          renewalDate: subscription.renewalDate,
        })),
      });
    } catch (error) {
      emailResult = {
        success: false,
        error: asErrorMessage(error),
      };
    }

    if (emailResult.success) {
      result.dispatchesSent += 1;
      await finalizeDispatch({
        batch,
        status: "SENT",
        errorMessage: null,
      });
      continue;
    }

    result.dispatchesFailed += 1;
    const errorMessage = emailResult.error ?? "Unknown reminder email failure.";
    await finalizeDispatch({
      batch,
      status: "FAILED",
      errorMessage,
    });
    logger.error("[reminders] Reminder email send failed.", {
      userId: batch.userId,
      userEmail: batch.userEmail,
      billingDateKey: batch.billingDateKey,
      error: errorMessage,
    });
  }

  logger.info("[reminders] Reminder dispatch run complete.", {
    candidateSubscriptionsScanned: result.candidateSubscriptionsScanned,
    dueSubscriptions: result.dueSubscriptions,
    dueUserBatches: result.dueUserBatches,
    dispatchesAttempted: result.dispatchesAttempted,
    dispatchesSent: result.dispatchesSent,
    dispatchesFailed: result.dispatchesFailed,
    dispatchesSkippedDuplicate: result.dispatchesSkippedDuplicate,
    ranAt: result.ranAt,
  });

  return result;
}
