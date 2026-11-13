import "server-only";
import { apiUserId } from "@/lib/session";
import { PLAN_LIMITS, type PlanName } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";

/**
 * Signed-in owner for dashboard API routes (null when signed out). Accounts may have only deep
 * links and no bio page, like the dashboard itself allows.
 */
export async function dashboardOwner(): Promise<null | { userId: string; plan: PlanName; withGeo: boolean; maxDays: number }> {
  const viewerId = await apiUserId();
  const userId = viewerId;
  if (!userId) return null;
  const plan = await getPlan(userId);
  return { userId, plan, withGeo: PLAN_LIMITS[plan].breakdowns, maxDays: PLAN_LIMITS[plan].analyticsDays };
}
