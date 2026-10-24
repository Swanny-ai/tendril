// Pure plan rules (no DB), shared by server enforcement and client UI hints.
// Server code must always enforce through lib/plans.ts.

export type PlanName = "FREE" | "PRO";

export const PLAN_LIMITS = {
  FREE: {
    maxBlocks: 12,
    maxSmartLinks: 1,
    maxPages: 1,
    customDomains: 0,
    analyticsDays: 30,
    breakdowns: false,
    customTheme: false,
    verifiedBadge: false,
    removeBadge: false,
    customWarningText: false,
    templatePages: false,
  },
  PRO: {
    maxBlocks: 200,
    maxSmartLinks: 100,
    maxPages: 25,
    customDomains: 5,
    analyticsDays: 365,
    breakdowns: true,
    customTheme: true,
    verifiedBadge: true,
    removeBadge: true,
    customWarningText: true,
    templatePages: true,
  },
} as const satisfies Record<PlanName, Record<string, number | boolean>>;

export type Capability = "customTheme" | "removeBadge" | "customWarningText" | "breakdowns" | "verifiedBadge" | "templatePages";

export const PRICES_USD = { monthly: 6, yearly: 60 } as const;

export function planFromSubscription(
  sub: { plan: PlanName; status: string; currentPeriodEnd?: Date | null } | null | undefined,
  now: Date = new Date(),
): PlanName {
  if (!sub || sub.plan !== "PRO") return "FREE";
  // Paid in crypto: Pro until the prepaid period ends (nothing renews it).
  if (sub.status === "prepaid") return sub.currentPeriodEnd && sub.currentPeriodEnd > now ? "PRO" : "FREE";
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  return activeStatuses.has(sub.status) ? "PRO" : "FREE";
}

/** End of a prepaid period after paying for one more month/year: from today, or from the current end if later. */
export function extendPrepaid(currentEnd: Date | null | undefined, interval: "month" | "year", now: Date = new Date()): Date {
  const from = currentEnd && currentEnd > now ? new Date(currentEnd) : new Date(now);
  if (interval === "year") from.setUTCFullYear(from.getUTCFullYear() + 1);
  else from.setUTCMonth(from.getUTCMonth() + 1);
  return from;
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
