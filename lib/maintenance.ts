import { pruneStaleSignInAttempts } from "./auth";

export type DailyMaintenanceResult = {
  staleSignInAttemptsDeleted: number;
  ranAt: string;
};

export async function runDailyMaintenanceJobs(): Promise<DailyMaintenanceResult> {
  const staleSignInAttemptsDeleted = await pruneStaleSignInAttempts();

  return {
    staleSignInAttemptsDeleted,
    ranAt: new Date().toISOString(),
  };
}
