import "server-only";
import countries from "i18n-iso-countries";
import { Prisma } from "@/generated/prisma/client";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { smartLinkUrl } from "@/lib/domains";
import { pageUrl } from "@/lib/link-targets";
import { PLAN_LIMITS, type PlanName } from "@/lib/plan-rules";
import { platformCounts } from "./platform";
import { dayWindow, type Analytics, type Totals } from "./queries";
import { referrerLabel } from "./referrer";
import { bucketKeys, previousPeriod, type ResolvedRange } from "./ranges";

// The global dashboard counts a "view" as either a bio-page view or a smart-link
// visit (SmartLinkEvent kind "hit"). Bots are excluded everywhere.

/**
 * url: the public address without https://, e.g. "mariarosie.com" or "tendril.app/maria".
 * deleted: the page or link was deleted; its stats are kept and still count (see DeletedSource).
 */
export type Source = { id: string; kind: "page" | "link"; label: string; path: string; url: string; deleted?: boolean };

export type GlobalStats = {
  totals: { views: number; visitors: number; activeSources: number; totalSources: number; avgPerSource: number; previousViews: number; growth: number | null };
  series: { key: string; views: number }[];
  top: (Source & { views: number })[];
  /** null when the plan has no geographic breakdowns */
  countries: null | { code: string; numeric: string | null; name: string; views: number }[];
};

export type LiveStats = {
  now: string;
  recent: { id: string; ts: string; country: string | null; countryName: string | null; device: string; label: string; path: string; url: string }[];
  perMinute: { minute: string; views: number }[];
  views: number;
  users: number;
  previousUsers: number;
  topLocations: null | { code: string; name: string; views: number }[];
  activeLinks: { label: string; path: string; url: string; views: number }[];
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
export function countryName(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "Unknown";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
const pageSelect = { id: true, username: true, displayName: true, atRoot: true, domain: { select: { hostname: true } } } as const;
const linkSelect = { id: true, slug: true, label: true, atRoot: true, domain: { select: { hostname: true } } } as const;
type PageRow = { id: string; username: string; displayName: string | null; atRoot: boolean; domain: { hostname: string } | null };
type LinkRow = { id: string; slug: string; label: string; atRoot: boolean; domain: { hostname: string } | null };

const pageSource = (p: PageRow): Source => ({ id: p.id, kind: "page", label: `${p.displayName || p.username} (bio page)`, path: `/${p.username}`, url: bare(pageUrl(p, p.domain, appUrl)) });
const linkSource = (l: LinkRow): Source => ({ id: l.id, kind: "link", label: l.label || l.slug, path: `/${l.slug}`, url: bare(smartLinkUrl(l.slug, l.domain, appUrl, l.atRoot)) });

/**
 * Everything that can get views: each of the account's bio pages and smart links, then the ones it
 * deleted (their stats are kept), labelled "(deleted)".
 */
export async function getSources(userId: string): Promise<Source[]> {
  const [pages, links, deleted] = await Promise.all([
    db.page.findMany({ where: { userId }, select: pageSelect, orderBy: { createdAt: "asc" } }),
    db.smartLink.findMany({ where: { userId }, select: linkSelect, orderBy: { createdAt: "asc" } }),
    db.deletedSource.findMany({ where: { userId }, orderBy: { deletedAt: "desc" } }),
  ]);
  return [
    ...pages.map(pageSource),
    ...links.map(linkSource),
    ...deleted.map((d) => ({ id: d.id, kind: d.kind === "page" ? ("page" as const) : ("link" as const), label: `${d.label} (deleted)`, path: d.path, url: d.url, deleted: true })),
  ];
}

/**
 * Call right before deleting a bio page or smart link: remembers its name and address so its
 * analytics (which are kept) stay labelled in the dashboard and the analytics filter.
 */
export async function rememberDeletedSource(kind: "page" | "link", id: string, userId: string): Promise<void> {
  const source =
    kind === "page"
      ? await db.page.findUnique({ where: { id }, select: pageSelect }).then((p) => (p ? pageSource(p) : null))
      : await db.smartLink.findUnique({ where: { id }, select: linkSelect }).then((l) => (l ? linkSource(l) : null));
  if (!source) return;
  const data = { userId, kind, label: source.label, path: source.path, url: source.url, deletedAt: new Date() };
  await db.deletedSource.upsert({ where: { id }, create: { id, ...data }, update: data });
}

/** Ids of an owner's bio pages or smart links, live and deleted, for the raw SQL below. */
function ownedIds(userId: string, kind: "page" | "link") {
  return kind === "page"
    ? Prisma.sql`SELECT id FROM "Page" WHERE "userId" = ${userId} UNION ALL SELECT id FROM "DeletedSource" WHERE "userId" = ${userId} AND kind = 'page'`
    : Prisma.sql`SELECT id FROM "SmartLink" WHERE "userId" = ${userId} UNION ALL SELECT id FROM "DeletedSource" WHERE "userId" = ${userId} AND kind = 'link'`;
}

/** Unified view rows for one owner (all their pages and smart links, deleted ones included) between two instants. */
function viewRows(userId: string, from: Date, to: Date) {
  return Prisma.sql`
    SELECT 'p' || pv.id::text AS id, pv.ts, pv.country, pv.device, pv.os, pv.browser, pv."visitorHash" AS vh, pv."pageId" AS src
    FROM "PageView" pv
    WHERE pv."pageId" IN (${ownedIds(userId, "page")}) AND pv."isBot" = false AND pv.ts >= ${from} AND pv.ts < ${to}
    UNION ALL
    SELECT 'l' || e.id::text, e.ts, e.country, e.device, e.os, e.browser, e."visitorHash", e."linkId"
    FROM "SmartLinkEvent" e
    WHERE e."linkId" IN (${ownedIds(userId, "link")}) AND e.kind = 'hit' AND e."isBot" = false AND e.ts >= ${from} AND e.ts < ${to}`;
}

/** Unified "clicks" for one owner: bio-page link clicks, deep links sending visitors on, and taps on Two-Steps pages' links. */
function clickRows(userId: string, from: Date, to: Date) {
  return Prisma.sql`
    SELECT c.ts, c."pageId" AS src
    FROM "ClickEvent" c
    WHERE c."pageId" IN (${ownedIds(userId, "page")}) AND c."isBot" = false AND c.ts >= ${from} AND c.ts < ${to}
    UNION ALL
    SELECT e.ts, e."linkId"
    FROM "SmartLinkEvent" e
    WHERE e."linkId" IN (${ownedIds(userId, "link")}) AND e.kind IN ('redirect', 'tap') AND e."isBot" = false AND e.ts >= ${from} AND e.ts < ${to}`;
}

const n = (x: bigint | number | null | undefined) => Number(x ?? 0);

export async function getGlobalStats(
  owner: { userId: string },
  sources: Source[],
  range: ResolvedRange,
  tz: string,
  withGeo: boolean,
): Promise<GlobalStats> {
  const { userId } = owner;
  const prev = previousPeriod(range);
  const rows = viewRows(userId, range.from, range.to);
  const fmt = range.bucket === "hour" ? 'YYYY-MM-DD"T"HH24' : "YYYY-MM-DD";

  const [totalRow, prevRow, bySource, byBucket, byCountry] = await Promise.all([
    db.$queryRaw<{ views: bigint; visitors: bigint }[]>`
      WITH v AS (${rows}) SELECT COUNT(*)::bigint AS views, COUNT(DISTINCT vh)::bigint AS visitors FROM v`,
    db.$queryRaw<{ views: bigint }[]>`
      WITH v AS (${viewRows(userId, prev.from, prev.to)}) SELECT COUNT(*)::bigint AS views FROM v`,
    db.$queryRaw<{ src: string; views: bigint }[]>`
      WITH v AS (${rows}) SELECT src, COUNT(*)::bigint AS views FROM v GROUP BY src`,
    db.$queryRaw<{ k: string; views: bigint }[]>`
      WITH v AS (${rows})
      SELECT to_char(date_trunc(${range.bucket}, (ts AT TIME ZONE 'UTC') AT TIME ZONE ${tz}), ${fmt}) AS k, COUNT(*)::bigint AS views
      FROM v GROUP BY 1`,
    withGeo
      ? db.$queryRaw<{ country: string | null; views: bigint }[]>`
          WITH v AS (${rows}) SELECT country, COUNT(*)::bigint AS views FROM v GROUP BY country ORDER BY views DESC`
      : Promise.resolve(null),
  ]);

  const views = n(totalRow[0]?.views);
  const previousViews = n(prevRow[0]?.views);
  const sourceViews = new Map(bySource.map((r) => [r.src, n(r.views)]));
  const activeSources = sourceViews.size;
  const bucketViews = new Map(byBucket.map((r) => [r.k, n(r.views)]));

  return {
    totals: {
      views,
      visitors: n(totalRow[0]?.visitors),
      activeSources,
      totalSources: sources.filter((s) => !s.deleted).length,
      avgPerSource: activeSources ? views / activeSources : 0,
      previousViews,
      growth: previousViews ? (views - previousViews) / previousViews : views ? null : 0,
    },
    series: bucketKeys(range.from, range.to, tz, range.bucket).map((key) => ({ key, views: bucketViews.get(key) ?? 0 })),
    top: sources
      .map((s) => ({ ...s, views: sourceViews.get(s.id) ?? 0 }))
      .filter((s) => s.views > 0)
      .sort((a, b) => b.views - a.views),
    countries: byCountry
      ? byCountry.map((r) => {
          const code = r.country && /^[A-Z]{2}$/.test(r.country) ? r.country : "??";
          return { code, numeric: code === "??" ? null : (countries.alpha2ToNumeric(code) ?? null), name: countryName(code), views: n(r.views) };
        })
      : null,
  };
}

const MINUTE = 60_000;

export async function getLiveStats(owner: { userId: string }, sources: Source[], withGeo: boolean, now = new Date()): Promise<LiveStats> {
  const { userId } = owner;
  const end = new Date(Math.ceil((now.getTime() + 1) / MINUTE) * MINUTE); // end of the current minute
  const start = new Date(end.getTime() - 30 * MINUTE);
  const prevStart = new Date(start.getTime() - 30 * MINUTE);
  const window = viewRows(userId, start, end);

  const [recent, perMinute, users, prevUsers, locations, links] = await Promise.all([
    db.$queryRaw<{ id: string; ts: Date; country: string | null; device: string; src: string }[]>`
      WITH v AS (${viewRows(userId, new Date(now.getTime() - 7 * 86_400_000), end)})
      SELECT id, ts, country, device, src FROM v ORDER BY ts DESC LIMIT 10`,
    db.$queryRaw<{ minute: Date; views: bigint }[]>`
      WITH v AS (${window}) SELECT date_trunc('minute', ts) AS minute, COUNT(*)::bigint AS views FROM v GROUP BY 1`,
    db.$queryRaw<{ n: bigint }[]>`WITH v AS (${window}) SELECT COUNT(DISTINCT vh)::bigint AS n FROM v`,
    db.$queryRaw<{ n: bigint }[]>`WITH v AS (${viewRows(userId, prevStart, start)}) SELECT COUNT(DISTINCT vh)::bigint AS n FROM v`,
    withGeo
      ? db.$queryRaw<{ country: string | null; views: bigint }[]>`
          WITH v AS (${window}) SELECT country, COUNT(*)::bigint AS views FROM v GROUP BY country ORDER BY views DESC LIMIT 5`
      : Promise.resolve(null),
    db.$queryRaw<{ src: string; views: bigint }[]>`
      WITH v AS (${window}) SELECT src, COUNT(*)::bigint AS views FROM v GROUP BY src ORDER BY views DESC`,
  ]);

  const byId = new Map(sources.map((s) => [s.id, s]));
  const minuteMap = new Map(perMinute.map((r) => [new Date(r.minute).getTime(), n(r.views)]));
  const minutes = Array.from({ length: 30 }, (_, i) => start.getTime() + i * MINUTE);

  return {
    now: now.toISOString(),
    recent: recent.map((r) => {
      const s = byId.get(r.src);
      return {
        id: r.id,
        ts: new Date(r.ts).toISOString(),
        country: withGeo ? r.country : null,
        countryName: withGeo ? countryName(r.country) : null,
        device: r.device,
        label: s?.label ?? "Deleted link",
        path: s?.path ?? "",
        url: s?.url ?? "",
      };
    }),
    perMinute: minutes.map((t) => ({ minute: new Date(t).toISOString(), views: minuteMap.get(t) ?? 0 })),
    views: perMinute.reduce((sum, r) => sum + n(r.views), 0),
    users: n(users[0]?.n),
    previousUsers: n(prevUsers[0]?.n),
    topLocations: locations ? locations.map((r) => ({ code: r.country ?? "??", name: countryName(r.country), views: n(r.views) })) : null,
    activeLinks: links.map((r) => ({ label: byId.get(r.src)?.label ?? "Deleted link", path: byId.get(r.src)?.path ?? "", url: byId.get(r.src)?.url ?? "", views: n(r.views) })),
  };
}

export type Overview = Omit<Analytics, "topLinks"> & { top: (Source & { views: number; clicks: number; ctr: number })[] };

/** The analytics page's "All" view: every bio page and smart link combined, by UTC day. */
export async function getOverview(userId: string, sources: Source[], days: number, plan: PlanName): Promise<Overview> {
  const { from, to, prevFrom } = dayWindow(days);
  const rows = viewRows(userId, from, to);
  const clicks = clickRows(userId, from, to);
  const day = Prisma.sql`to_char(ts, 'YYYY-MM-DD')`;
  const totalsBetween = async (a: Date, b: Date): Promise<Totals> => {
    // Visitor hashes rotate daily, so "visitors" = sum of daily unique visitors (as on a single page).
    const [v, c] = await Promise.all([
      db.$queryRaw<{ views: bigint; visitors: bigint }[]>`
        WITH v AS (${viewRows(userId, a, b)}), d AS (SELECT COUNT(*) AS c, COUNT(DISTINCT vh) AS u FROM v GROUP BY ${day})
        SELECT COALESCE(SUM(c), 0)::bigint AS views, COALESCE(SUM(u), 0)::bigint AS visitors FROM d`,
      db.$queryRaw<{ n: bigint }[]>`WITH c AS (${clickRows(userId, a, b)}) SELECT COUNT(*)::bigint AS n FROM c`,
    ]);
    const views = n(v[0]?.views);
    const clickCount = n(c[0]?.n);
    return { views, visitors: n(v[0]?.visitors), clicks: clickCount, ctr: views ? clickCount / views : 0 };
  };

  const [totals, previous, viewDays, clickDays, viewsBySource, clicksBySource] = await Promise.all([
    totalsBetween(from, to),
    totalsBetween(prevFrom, from),
    db.$queryRaw<{ day: string; n: bigint }[]>`WITH v AS (${rows}) SELECT ${day} AS day, COUNT(*)::bigint AS n FROM v GROUP BY 1`,
    db.$queryRaw<{ day: string; n: bigint }[]>`WITH c AS (${clicks}) SELECT ${day} AS day, COUNT(*)::bigint AS n FROM c GROUP BY 1`,
    db.$queryRaw<{ src: string; n: bigint }[]>`WITH v AS (${rows}) SELECT src, COUNT(*)::bigint AS n FROM v GROUP BY src`,
    db.$queryRaw<{ src: string; n: bigint }[]>`WITH c AS (${clicks}) SELECT src, COUNT(*)::bigint AS n FROM c GROUP BY src`,
  ]);

  // Days are UTC dates ("YYYY-MM-DD"), whatever the database session time zone.
  const key = (d: Date | string) => (typeof d === "string" ? d : new Date(d).toISOString().slice(0, 10));
  const vMap = new Map(viewDays.map((r) => [key(r.day), n(r.n)]));
  const cMap = new Map(clickDays.map((r) => [key(r.day), n(r.n)]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = key(new Date(from.getTime() + i * 86_400_000));
    return { day: d, views: vMap.get(d) ?? 0, clicks: cMap.get(d) ?? 0 };
  });

  const srcViews = new Map(viewsBySource.map((r) => [r.src, n(r.n)]));
  const srcClicks = new Map(clicksBySource.map((r) => [r.src, n(r.n)]));
  const top = sources
    .map((s) => {
      const views = srcViews.get(s.id) ?? 0;
      const sent = srcClicks.get(s.id) ?? 0;
      return { ...s, views, clicks: sent, ctr: views ? sent / views : 0 };
    })
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks);

  let breakdowns: Analytics["breakdowns"] = null;
  if (PLAN_LIMITS[plan].breakdowns) {
    const group = (col: "country" | "device" | "os" | "browser") =>
      db.$queryRaw<{ k: string | null; n: bigint }[]>`WITH v AS (${rows}) SELECT ${Prisma.raw(col)} AS k, COUNT(*)::bigint AS n FROM v GROUP BY 1`;
    // Traffic sources and referrers are only recorded for bio-page views.
    const pageViews = { pageId: { in: sources.filter((s) => s.kind === "page").map((s) => s.id) }, isBot: false, ts: { gte: from, lt: to } };
    const [ctry, dev, os, browser, src, ref] = await Promise.all([
      group("country"),
      group("device"),
      group("os"),
      group("browser"),
      db.pageView.groupBy({ by: ["source"], where: pageViews, _count: { _all: true } }),
      db.pageView.groupBy({ by: ["referrerHost"], where: pageViews, _count: { _all: true } }),
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
      countries: desc(ctry.map((r) => ({ code: r.k ?? "??", count: n(r.n) }))).slice(0, 12),
      devices: desc(dev.map((r) => ({ key: r.k ?? "unknown", count: n(r.n) }))),
      os: desc(os.map((r) => ({ key: r.k ?? "unknown", count: n(r.n) }))),
      platforms: platformCounts(browser.map((r) => ({ browser: r.k, count: n(r.n) }))),
    };
  }

  return { days, totals, previous, series, top, breakdowns };
}
