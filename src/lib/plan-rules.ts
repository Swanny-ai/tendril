// Pure plan rules (no DB), shared by server enforcement and client UI hints.
// Server code must always enforce through lib/plans.ts.

export type PlanName = "FREE" | "PRO";

export const PLAN_LIMITS = {
  FREE: {
    maxBlocks: 12,
    maxSmartLinks: 3,
    analyticsDays: 30,
    breakdowns: false,
    customTheme: false,
    removeBadge: false,
    customWarningText: false,
  },
  PRO: {
    maxBlocks: 200,
    maxSmartLinks: 100,
    analyticsDays: 365,
    breakdowns: true,
    customTheme: true,
    removeBadge: true,
    customWarningText: true,
  },
} as const satisfies Record<PlanName, Record<string, number | boolean>>;

export type Capability = "customTheme" | "removeBadge" | "customWarningText" | "breakdowns";

export const PRICES_USD = { monthly: 6, yearly: 60 } as const;

export function planFromSubscription(sub: { plan: PlanName; status: string } | null | undefined): PlanName {
  if (!sub) return "FREE";
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  return sub.plan === "PRO" && activeStatuses.has(sub.status) ? "PRO" : "FREE";
}

export function clampAnalyticsDays(plan: PlanName, requestedDays: number): number {
  return Math.max(1, Math.min(requestedDays, PLAN_LIMITS[plan].analyticsDays));
}

/** Which blocks are visible on the public page under the plan's block limit. */
export function visibleBlockIds<T extends { id: string; enabled: boolean; position: number }>(plan: PlanName, blocks: T[]): Set<string> {
  const max = PLAN_LIMITS[plan].maxBlocks;
  return new Set(
    [...blocks].sort((a, b) => a.position - b.position).slice(0, max).filter((b) => b.enabled).map((b) => b.id),
  );
}
