import { pruneStaleSignInAttempts } from "./auth";
import { expirePendingInvites } from "./invites";
import { pruneEmailDeliveryLogs } from "./mail";
import {
  runSubscriptionReminderDispatchJob,
  type SubscriptionReminderDispatchResult,
} from "./subscription-reminders";

export type DailyMaintenanceResult = {
  staleSignInAttemptsDeleted: number;
  expiredPendingInvitesMarked: number;
  emailDeliveryLogsDeleted: number;
  subscriptionReminders: SubscriptionReminderDispatchResult;
  ranAt: string;
};

export async function runDailyMaintenanceJobs(): Promise<DailyMaintenanceResult> {
  const [staleSignInAttemptsDeleted, expiredPendingInvitesMarked, emailDeliveryLogsDeleted, subscriptionReminders] =
    await Promise.all([
    pruneStaleSignInAttempts(),
    expirePendingInvites(),
    pruneEmailDeliveryLogs(),
    runSubscriptionReminderDispatchJob(),
  ]);

  return {
    staleSignInAttemptsDeleted,
    expiredPendingInvitesMarked,
    emailDeliveryLogsDeleted,
    subscriptionReminders,
    ranAt: new Date().toISOString(),
  };
}
