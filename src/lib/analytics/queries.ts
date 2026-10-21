import "server-only";
import { db } from "@/lib/db";
import { clampAnalyticsDays, PLAN_LIMITS, type PlanName } from "@/lib/plan-rules";
import { platformCounts } from "./platform";
import { referrerLabel } from "./referrer";

export const RANGES = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 } as const;
export type RangeKey = keyof typeof RANGES;

export function parseRange(value: unknown, plan: PlanName): { key: RangeKey; days: number; clamped: boolean } {
  const key = (typeof value === "string" && value in RANGES ? value : "7d") as RangeKey;
  const days = clampAnalyticsDays(plan, RANGES[key]);
  return { key: days === RANGES[key] ? key : "30d", days, clamped: days !== RANGES[key] };
}

export type Totals = { views: number; visitors: number; clicks: number; ctr: number };
export type Analytics = {
  days: number;
  totals: Totals;
  previous: Totals;
  series: { day: string; views: number; clicks: number }[];
  topLinks: { blockId: string; title: string; clicks: number; ctr: number; warning: boolean; warningViews: number; passRate: number | null }[];
  breakdowns: null | {
    sources: { key: string; count: number }[];
    referrers: { label: string; count: number }[];
    countries: { code: string; count: number }[];
    devices: { key: string; count: number }[];
    os: { key: string; count: number }[];
    /** the app or browser people viewed from (Instagram, TikTok, Safari, ...) */
    platforms: { label: string; count: number }[];
  };
};

const ctr = (clicks: number, views: number) => (views ? clicks / views : 0);

function dayStart(daysAgo: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

/** The current window (whole UTC days, ending now) and the start of the equally long one before it. */
export function dayWindow(days: number) {
  return { from: dayStart(days - 1), to: new Date(Date.now() + 60_000), prevFrom: dayStart(2 * days - 1) };
}

async function totalsBetween(pageId: string, from: Date, to: Date): Promise<Totals> {
  const [views, clicks, visitorRows] = await Promise.all([
    db.pageView.count({ where: { pageId, ts: { gte: from, lt: to } } }),
    db.clickEvent.count({ where: { pageId, isBot: false, ts: { gte: from, lt: to } } }),
    // Visitor hashes rotate daily, so "visitors" = sum of daily unique visitors.
    db.$queryRaw<{ n: bigint }[]>`
      SELECT COALESCE(SUM(c), 0)::bigint AS n FROM (
        SELECT COUNT(DISTINCT "visitorHash") AS c FROM "PageView"
        WHERE "pageId" = ${pageId} AND ts >= ${from} AND ts < ${to}
        GROUP BY date_trunc('day', ts AT TIME ZONE 'UTC')
      ) t`,
  ]);
  const visitors = Number(visitorRows[0]?.n ?? 0);
  return { views, visitors, clicks, ctr: ctr(clicks, views) };
}

export async function getAnalytics(pageId: string, days: number, plan: PlanName): Promise<Analytics> {
  const { from, to, prevFrom } = dayWindow(days);
  const where = { pageId, ts: { gte: from, lt: to } };

  const [totals, previous, viewDays, clickDays, clicksByBlock, warnByBlock, blocks] = await Promise.all([
    totalsBetween(pageId, from, to),
    totalsBetween(pageId, prevFrom, from),
    db.$queryRaw<{ day: Date; n: bigint }[]>`
      SELECT date_trunc('day', ts AT TIME ZONE 'UTC') AS day, COUNT(*)::bigint AS n
      FROM "PageView" WHERE "pageId" = ${pageId} AND ts >= ${from} AND ts < ${to} GROUP BY 1`,
    db.$queryRaw<{ day: Date; n: bigint }[]>`
      SELECT date_trunc('day', ts AT TIME ZONE 'UTC') AS day, COUNT(*)::bigint AS n
      FROM "ClickEvent" WHERE "pageId" = ${pageId} AND "isBot" = false AND ts >= ${from} AND ts < ${to} GROUP BY 1`,
    db.clickEvent.groupBy({ by: ["blockId"], where: { ...where, isBot: false }, _count: { _all: true } }),
    db.warningView.groupBy({ by: ["blockId"], where, _count: { _all: true } }),
    db.block.findMany({ where: { pageId, type: "LINK" }, select: { id: true, title: true, url: true, contentWarning: true, position: true } }),
  ]);

  const key = (d: Date) => d.toISOString().slice(0, 10);
  const vMap = new Map(viewDays.map((r) => [key(r.day), Number(r.n)]));
  const cMap = new Map(clickDays.map((r) => [key(r.day), Number(r.n)]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = key(dayStart(days - 1 - i));
    return { day: d, views: vMap.get(d) ?? 0, clicks: cMap.get(d) ?? 0 };
  });

  const clickCount = new Map(clicksByBlock.map((r) => [r.blockId, r._count._all]));
  const warnCount = new Map(warnByBlock.map((r) => [r.blockId, r._count._all]));
  const topLinks = blocks
    .map((b) => {
      const clicks = clickCount.get(b.id) ?? 0;
      const warningViews = warnCount.get(b.id) ?? 0;
      return {
        blockId: b.id,
        title: b.title || b.url || "Untitled link",
        clicks,
        ctr: ctr(clicks, totals.views),
        warning: b.contentWarning,
        warningViews,
        passRate: b.contentWarning && warningViews ? Math.min(1, clicks / warningViews) : null,
      };
    })
    .sort((a, b) => b.clicks - a.clicks);

  let breakdowns: Analytics["breakdowns"] = null;
  if (PLAN_LIMITS[plan].breakdowns) {
    const [src, ref, ctry, dev, os, browser] = await Promise.all([
      db.pageView.groupBy({ by: ["source"], where, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["referrerHost"], where, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["country"], where, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["device"], where, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["os"], where, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["browser"], where, _count: { _all: true } }),
    ]);
    const labelCounts = new Map<string, number>();
    for (const r of ref) {
      const label = referrerLabel(r.referrerHost);
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + r._count._all);
    }
    const desc = <T extends { count: number }>(xs: T[]) => xs.sort((a, b) => b.count - a.count);
    breakdowns = {
      sources: desc(src.map((r) => ({ key: r.source, count: r._count._all }))),
      referrers: desc([...labelCounts].map(([label, count]) => ({ label, count }))).slice(0, 10),
      countries: desc(ctry.map((r) => ({ code: r.country ?? "??", count: r._count._all }))).slice(0, 12),
      devices: desc(dev.map((r) => ({ key: r.device, count: r._count._all }))),
      os: desc(os.map((r) => ({ key: r.os ?? "unknown", count: r._count._all }))),
      platforms: platformCounts(browser.map((r) => ({ browser: r.browser, count: r._count._all }))),
    };
  }

  return { days, totals, previous, series, topLinks, breakdowns };
}

export type LinkAnalytics = {
  days: number;
  totals: { visits: number; visitors: number; warningViews: number; confirms: number; redirects: number; leaves: number };
  previousVisits: number;
  /** views = visits, clicks = visitors sent on to the destination */
  series: { day: string; views: number; clicks: number }[];
  breakdowns: null | { countries: { code: string; count: number }[]; devices: { key: string; count: number }[]; os: { key: string; count: number }[]; platforms: { label: string; count: number }[] };
};

/** One deep link's numbers: visits ("hit"), 18+ page views, confirmations, redirects, leaves. Bots excluded. */
export async function getLinkAnalytics(linkId: string, days: number, plan: PlanName): Promise<LinkAnalytics> {
  const { from, to, prevFrom } = dayWindow(days);
  const where = { linkId, isBot: false, ts: { gte: from, lt: to } };
  const [kinds, previousVisits, visitors, perDay] = await Promise.all([
    db.smartLinkEvent.groupBy({ by: ["kind"], where, _count: { _all: true } }),
    db.smartLinkEvent.count({ where: { linkId, isBot: false, kind: "hit", ts: { gte: prevFrom, lt: from } } }),
    db.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT "visitorHash")::bigint AS n FROM "SmartLinkEvent"
      WHERE "linkId" = ${linkId} AND "isBot" = false AND kind = 'hit' AND ts >= ${from} AND ts < ${to}`,
    db.$queryRaw<{ day: Date; kind: string; n: bigint }[]>`
      SELECT date_trunc('day', ts AT TIME ZONE 'UTC') AS day, kind, COUNT(*)::bigint AS n FROM "SmartLinkEvent"
      WHERE "linkId" = ${linkId} AND "isBot" = false AND kind IN ('hit', 'redirect') AND ts >= ${from} AND ts < ${to} GROUP BY 1, 2`,
  ]);
  const count = (k: string) => kinds.find((r) => r.kind === k)?._count._all ?? 0;
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const byDay = new Map(perDay.map((r) => [`${key(r.day)}|${r.kind}`, Number(r.n)]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = key(dayStart(days - 1 - i));
    return { day: d, views: byDay.get(`${d}|hit`) ?? 0, clicks: byDay.get(`${d}|redirect`) ?? 0 };
  });

  let breakdowns: LinkAnalytics["breakdowns"] = null;
  if (PLAN_LIMITS[plan].breakdowns) {
    const hits = { ...where, kind: "hit" };
    const [countries, devices, os, browser] = await Promise.all([
      db.smartLinkEvent.groupBy({ by: ["country"], where: hits, _count: { _all: true }, orderBy: { _count: { country: "desc" } }, take: 10 }),
      db.smartLinkEvent.groupBy({ by: ["device"], where: hits, _count: { _all: true } }),
      db.smartLinkEvent.groupBy({ by: ["os"], where: hits, _count: { _all: true } }),
      db.smartLinkEvent.groupBy({ by: ["browser"], where: hits, _count: { _all: true } }),
    ]);
    breakdowns = {
      countries: countries.map((c) => ({ code: c.country ?? "??", count: c._count._all })),
      devices: devices.map((d) => ({ key: d.device, count: d._count._all })).sort((a, b) => b.count - a.count),
      os: os.map((o) => ({ key: o.os ?? "unknown", count: o._count._all })).sort((a, b) => b.count - a.count),
      platforms: platformCounts(browser.map((b) => ({ browser: b.browser, count: b._count._all }))),
    };
  }
  return {
    days,
    totals: { visits: count("hit"), visitors: Number(visitors[0]?.n ?? 0), warningViews: count("view"), confirms: count("confirm"), redirects: count("redirect"), leaves: count("leave") },
    previousVisits,
    series,
    breakdowns,
  };
}
