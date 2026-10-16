import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLAN_LIMITS, type PlanName } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";

/** Signed-in owner for dashboard API routes (null when signed out or without a page). */
export async function dashboardOwner(): Promise<null | { userId: string; plan: PlanName; withGeo: boolean; maxDays: number }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const page = await db.page.findFirst({ where: { userId }, select: { id: true } });
  if (!page) return null;
  const plan = await getPlan(userId);
  return { userId, plan, withGeo: PLAN_LIMITS[plan].breakdowns, maxDays: PLAN_LIMITS[plan].analyticsDays };
}
