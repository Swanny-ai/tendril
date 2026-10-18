import "server-only";
import { cacheLife, cacheTag, revalidateTag, updateTag } from "next/cache";
import { isbot } from "isbot";
import { db } from "@/lib/db";
import { PLAN_LIMITS, planFromSubscription } from "@/lib/plan-rules";
import { parseUserAgent } from "@/lib/ua";
import { clientIp, countryFromHeaders, visitorHash } from "@/lib/analytics/visitor";
import { DEFAULT_WARNING_TEMPLATE } from "@/warning-templates/templates";

export const smartLinkTag = (slug: string) => `smart-link:${slug}`;

export type SmartLinkTarget = {
  id: string;
  slug: string;
  destinationUrl: string;
  adultWarning: boolean;
  warningTemplate: string;
  warningTitle: string | null;
  warningMessage: string | null;
  warningButton: string | null;
  showBadge: boolean;
  openInBrowser: boolean;
  label: string;
  userId: string;
  /** Custom domain the link is shared on, if any. */
  domainHost: string | null;
  /** The creator's bio-page identity, shown on the "open in browser" page. */
  owner: { name: string; username: string; avatarUrl: string | null } | null;
};

/** Uncached loader (used by the proxy, where "use cache" is not available). */
export async function loadSmartLink(slug: string): Promise<SmartLinkTarget | null> {
  const link = await db.smartLink.findUnique({
    where: { slug },
    include: {
      domain: { select: { hostname: true } },
      user: {
        select: {
          subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
          pages: { select: { username: true, displayName: true, avatarUrl: true }, orderBy: { createdAt: "asc" }, take: 1 },
        },
      },
    },
  });
  if (!link || !link.enabled) return null;
  const plan = planFromSubscription(link.user.subscription);
  const limits = PLAN_LIMITS[plan];
  // Links beyond the plan's allowance (e.g. after a downgrade) stop resolving instead of being deleted.
  const allowed = await db.smartLink.findMany({
    where: { userId: link.userId },
    orderBy: { createdAt: "asc" },
    take: limits.maxSmartLinks,
    select: { id: true },
  });
  if (!allowed.some((l) => l.id === link.id)) return null;
  return {
    id: link.id,
    slug: link.slug,
    destinationUrl: link.destinationUrl,
    adultWarning: link.adultWarning,
    warningTemplate: link.warningTemplate || DEFAULT_WARNING_TEMPLATE,
    warningTitle: limits.customWarningText ? link.warningTitle : null,
    warningMessage: limits.customWarningText ? link.warningMessage : null,
    warningButton: limits.customWarningText ? link.warningButton : null,
    showBadge: limits.removeBadge ? link.showBadge : true,
    openInBrowser: link.openInBrowser,
    label: link.label,
    userId: link.userId,
    domainHost: link.domain?.hostname ?? null,
    owner: link.user.pages[0]
      ? { name: link.user.pages[0].displayName || link.user.pages[0].username, username: link.user.pages[0].username, avatarUrl: link.user.pages[0].avatarUrl }
      : null,
  };
}

export async function getSmartLink(slug: string) {
  "use cache";
  cacheTag(smartLinkTag(slug));
  cacheLife("hours");
  return loadSmartLink(slug);
}

export function invalidateSmartLinkFromAction(slug: string) {
  updateTag(smartLinkTag(slug));
}

export async function invalidateUserSmartLinksFromRoute(userId: string) {
  const links = await db.smartLink.findMany({ where: { userId }, select: { slug: true } });
  for (const l of links) revalidateTag(smartLinkTag(l.slug), { expire: 0 });
}

// hit: every visit to /l/<slug> (the link's "view" in dashboards); view: warning page shown
export type SmartLinkEventKind = "hit" | "view" | "confirm" | "redirect" | "leave";

export async function recordSmartLinkEvent(headers: Headers, linkId: string, kind: SmartLinkEventKind) {
  const ua = headers.get("user-agent") ?? "";
  const bot = !ua || isbot(ua);
  if (bot && kind !== "redirect") return; // keep bot redirects (flagged) for abuse review only
  const parsed = parseUserAgent(ua);
  await db.smartLinkEvent.create({
    data: {
      linkId,
      kind,
      visitorHash: await visitorHash(clientIp(headers), ua),
      country: countryFromHeaders(headers),
      device: parsed.device,
      os: parsed.os,
      browser: parsed.browser,
      isBot: bot,
    },
  });
}

/** Last-30-day event counts per link and kind (bots excluded). */
export async function getSmartLinkStats(linkIds: string[]) {
  if (!linkIds.length) return [];
  const since = new Date(Date.now() - 30 * 86_400_000);
  return db.smartLinkEvent.groupBy({
    by: ["linkId", "kind"],
    where: { linkId: { in: linkIds }, ts: { gte: since }, isBot: false },
    _count: { _all: true },
  });
}
