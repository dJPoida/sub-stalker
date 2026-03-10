import { pruneStaleSignInAttempts } from "./auth";
import { expirePendingInvites } from "./invites";

export type DailyMaintenanceResult = {
  staleSignInAttemptsDeleted: number;
  expiredPendingInvitesMarked: number;
  ranAt: string;
};

export async function runDailyMaintenanceJobs(): Promise<DailyMaintenanceResult> {
  const [staleSignInAttemptsDeleted, expiredPendingInvitesMarked] = await Promise.all([
    pruneStaleSignInAttempts(),
    expirePendingInvites(),
  ]);

  return {
    staleSignInAttemptsDeleted,
    expiredPendingInvitesMarked,
    ranAt: new Date().toISOString(),
  };
}
