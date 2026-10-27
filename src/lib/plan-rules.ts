// Pure plan rules (no DB), shared by server enforcement and client UI hints.
// Server code must always enforce through lib/plans.ts.

export type PlanName = "FREE" | "PRO" | "BUSINESS";
/** The plans people pay for. */
export type PaidPlan = Exclude<PlanName, "FREE">;

export const PAID_PLANS: PaidPlan[] = ["PRO", "BUSINESS"];
export const isPaid = (plan: PlanName): plan is PaidPlan => plan !== "FREE";
export const PLAN_LABEL: Record<PlanName, string> = { FREE: "Free", PRO: "Pro", BUSINESS: "Business" };

// Deep links come in two kinds: classic Deeplinks and Two-Steps (a deep link with its own page).
// maxSmartLinks caps both together; maxLinksPerKind caps each kind.
export const PLAN_LIMITS = {
  FREE: {
    maxBlocks: 12,
    maxSmartLinks: 1,
    maxLinksPerKind: 1,
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
    maxSmartLinks: 3,
    maxLinksPerKind: 3,
    maxPages: 3,
    customDomains: 1,
    analyticsDays: 365,
    breakdowns: true,
    customTheme: true,
    verifiedBadge: true,
    removeBadge: true,
    customWarningText: true,
    templatePages: true,
  },
  BUSINESS: {
    maxBlocks: 200,
    maxSmartLinks: 20,
    maxLinksPerKind: 10,
    maxPages: 10,
    customDomains: 10,
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

/** US dollars. Yearly = 10 months (2 months free). */
export const PLAN_PRICES_USD: Record<PaidPlan, { monthly: number; yearly: number }> = {
  PRO: { monthly: 8, yearly: 80 },
  BUSINESS: { monthly: 25, yearly: 250 },
};
/** Pro's prices (kept for the places that only talk about Pro). */
export const PRICES_USD = PLAN_PRICES_USD.PRO;

/** "The first paid plan that allows more of `key` than `plan`", for "Upgrade to …" hints. */
export function upgradeFor(plan: PlanName, key: "maxSmartLinks" | "maxLinksPerKind" | "maxPages" | "customDomains"): PaidPlan | null {
  return PAID_PLANS.find((p) => PLAN_LIMITS[p][key] > PLAN_LIMITS[plan][key]) ?? null;
}

export function planFromSubscription(
  sub: { plan: PlanName; status: string; currentPeriodEnd?: Date | null } | null | undefined,
  now: Date = new Date(),
): PlanName {
  if (!sub || sub.plan === "FREE") return "FREE";
  // Prepaid (crypto) and the free trial both last until their end date, then fall back to Free.
  if (sub.status === "prepaid" || sub.status === "trial") return sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.plan : "FREE";
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  return activeStatuses.has(sub.status) ? sub.plan : "FREE";
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

/**
 * Which deep links still work under a plan's limits, oldest first: at most maxLinksPerKind of each
 * kind and maxSmartLinks in total. Links beyond that (e.g. after a downgrade) stop resolving.
 */
export function allowedLinkIds<T extends { id: string; twoSteps: boolean }>(plan: PlanName, linksOldestFirst: T[]): Set<string> {
  const { maxSmartLinks, maxLinksPerKind } = PLAN_LIMITS[plan];
  const out = new Set<string>();
  let two = 0;
  let classic = 0;
  for (const l of linksOldestFirst) {
    if (out.size >= maxSmartLinks) break;
    if (l.twoSteps ? two >= maxLinksPerKind : classic >= maxLinksPerKind) continue;
    out.add(l.id);
    if (l.twoSteps) two++;
    else classic++;
  }
  return out;
}

/** Why another bio page (key "maxPages") or custom domain ("customDomains") can't be added, or null when it can. */
export function countLimitError(plan: PlanName, key: "maxPages" | "customDomains", count: number): string | null {
  const max = PLAN_LIMITS[plan][key];
  if (count < max) return null;
  const next = upgradeFor(plan, key);
  const what = key === "maxPages" ? `bio page${max === 1 ? "" : "s"}` : `custom domain${max === 1 ? "" : "s"}`;
  const upsell = next ? ` Upgrade to ${PLAN_LABEL[next]} for up to ${PLAN_LIMITS[next][key]}.` : "";
  return max === 0 ? `Custom domains are part of Pro and Business.${upsell}` : `Your ${PLAN_LABEL[plan]} plan includes ${max} ${what}.${upsell}`;
}

/** Why a new link of this kind can't be added under the plan, or null when it can. */
export function linkLimitError(plan: PlanName, counts: { twoSteps: number; classic: number }, twoSteps: boolean): string | null {
  const { maxSmartLinks, maxLinksPerKind } = PLAN_LIMITS[plan];
  const kind = twoSteps ? "Two-Steps" : "Deeplink";
  const next = upgradeFor(plan, counts.twoSteps + counts.classic >= maxSmartLinks ? "maxSmartLinks" : "maxLinksPerKind");
  const upsell = next ? ` Upgrade to ${PLAN_LABEL[next]} for more.` : "";
  if (counts.twoSteps + counts.classic >= maxSmartLinks) {
    return `Your ${PLAN_LABEL[plan]} plan includes ${maxSmartLinks} link${maxSmartLinks === 1 ? "" : "s"} in total.${upsell}`;
  }
  if ((twoSteps ? counts.twoSteps : counts.classic) >= maxLinksPerKind) {
    return `Your ${PLAN_LABEL[plan]} plan includes ${maxLinksPerKind} ${kind} link${maxLinksPerKind === 1 ? "" : "s"}.${upsell}`;
  }
  return null;
}
