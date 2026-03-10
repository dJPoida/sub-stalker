import { pruneStaleSignInAttempts } from "./auth";
import { expirePendingInvites } from "./invites";
import { pruneEmailDeliveryLogs } from "./mail";

export type DailyMaintenanceResult = {
  staleSignInAttemptsDeleted: number;
  expiredPendingInvitesMarked: number;
  emailDeliveryLogsDeleted: number;
  ranAt: string;
};

export async function runDailyMaintenanceJobs(): Promise<DailyMaintenanceResult> {
  const [staleSignInAttemptsDeleted, expiredPendingInvitesMarked, emailDeliveryLogsDeleted] =
    await Promise.all([
    pruneStaleSignInAttempts(),
    expirePendingInvites(),
    pruneEmailDeliveryLogs(),
  ]);

  return {
    staleSignInAttemptsDeleted,
    expiredPendingInvitesMarked,
    emailDeliveryLogsDeleted,
    ranAt: new Date().toISOString(),
  };
}
