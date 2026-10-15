import "server-only";
import { db } from "@/lib/db";
import { clampAnalyticsDays, PLAN_LIMITS, type PlanName } from "@/lib/plan-rules";
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
  };
};

const ctr = (clicks: number, views: number) => (views ? clicks / views : 0);

function dayStart(daysAgo: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
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
  const from = dayStart(days - 1);
  const to = new Date(Date.now() + 60_000);
  const prevFrom = dayStart(2 * days - 1);
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
    const [src, ref, ctry, dev, os] = await Promise.all([
      db.pageView.groupBy({ by: ["source"], where, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["referrerHost"], where, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["country"], where, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["device"], where, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["os"], where, _count: { _all: true } }),
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
    };
  }

  return { days, totals, previous, series, topLinks, breakdowns };
}
