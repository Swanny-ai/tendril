import "server-only";
import countries from "i18n-iso-countries";
import { Prisma } from "@/generated/prisma/client";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { smartLinkUrl } from "@/lib/domains";
import { pageUrl } from "@/lib/link-targets";
import { bucketKeys, previousPeriod, type ResolvedRange } from "./ranges";

// The global dashboard counts a "view" as either a bio-page view or a smart-link
// visit (SmartLinkEvent kind "hit"). Bots are excluded everywhere.

/** url: the public address without https://, e.g. "mariarosie.com" or "tendril.app/maria". */
export type Source = { id: string; kind: "page" | "link"; label: string; path: string; url: string };

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
  activeLinks: { label: string; path: string; views: number }[];
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

/** Everything that can get views: each of the account's bio pages and its smart links. */
export async function getSources(userId: string): Promise<Source[]> {
  const [pages, links] = await Promise.all([
    db.page.findMany({ where: { userId }, select: { id: true, username: true, displayName: true, atRoot: true, domain: { select: { hostname: true } } }, orderBy: { createdAt: "asc" } }),
    db.smartLink.findMany({ where: { userId }, select: { id: true, slug: true, label: true, atRoot: true, domain: { select: { hostname: true } } }, orderBy: { createdAt: "asc" } }),
  ]);
  const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return [
    ...pages.map((p) => ({ id: p.id, kind: "page" as const, label: `${p.displayName || p.username} (bio page)`, path: `/${p.username}`, url: bare(pageUrl(p, p.domain, appUrl)) })),
    ...links.map((l) => ({ id: l.id, kind: "link" as const, label: l.label || l.slug, path: `/l/${l.slug}`, url: bare(smartLinkUrl(l.slug, l.domain, appUrl, l.atRoot)) })),
  ];
}

/** Unified view rows for one owner (all their pages and smart links) between two instants. */
function viewRows(userId: string, from: Date, to: Date) {
  return Prisma.sql`
    SELECT 'p' || pv.id::text AS id, pv.ts, pv.country, pv.device, pv."visitorHash" AS vh, pv."pageId" AS src
    FROM "PageView" pv
    WHERE pv."pageId" IN (SELECT id FROM "Page" WHERE "userId" = ${userId}) AND pv."isBot" = false AND pv.ts >= ${from} AND pv.ts < ${to}
    UNION ALL
    SELECT 'l' || e.id::text, e.ts, e.country, e.device, e."visitorHash", e."linkId"
    FROM "SmartLinkEvent" e JOIN "SmartLink" l ON l.id = e."linkId"
    WHERE l."userId" = ${userId} AND e.kind = 'hit' AND e."isBot" = false AND e.ts >= ${from} AND e.ts < ${to}`;
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
      totalSources: sources.length,
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
    activeLinks: links.map((r) => ({ label: byId.get(r.src)?.label ?? "Deleted link", path: byId.get(r.src)?.path ?? "", views: n(r.views) })),
  };
}
