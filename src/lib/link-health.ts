import "server-only";
import { lookup } from "node:dns/promises";
import { appUrl } from "@/config/brand";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { smartLinkUrl } from "@/lib/domains";
import { parseAccess } from "@/lib/link-access";
import { pageUrl } from "@/lib/link-targets";
import { getPlan } from "@/lib/plans";
import { loadSmartLink } from "@/lib/smart-links";
import {
  CLIENTS,
  destinationOutcome,
  escapesInApp,
  HEALTH_CHECKS_PER_DAY,
  HEALTH_UA_TAG,
  isPrivateAddress,
  overallStatus,
  REPORT_COUNTRIES,
  type ClientResult,
  type DestinationResult,
  type HealthResult,
  type HealthStatus,
} from "@/lib/link-health-rules";

const TIMEOUT_MS = 8000;
const MAX_HOPS = 5;
const MAX_DESTINATIONS = 10;
const ownHost = new URL(appUrl).hostname;

const startOfDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/** Checks used today (UTC) and the account's allowance. */
export async function healthQuota(userId: string) {
  const [plan, used] = await Promise.all([getPlan(userId), db.linkHealthCheck.count({ where: { userId, createdAt: { gte: startOfDay() } } })]);
  const limit = HEALTH_CHECKS_PER_DAY[plan];
  return { used, limit, left: Math.max(0, limit - used) };
}

/** Refuses addresses inside private networks, so a check can't be pointed at our own infrastructure. */
async function safeToFetch(url: URL): Promise<boolean> {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.hostname === ownHost) return true;
  if (url.username || url.password) return false;
  try {
    const addrs = await lookup(url.hostname.replace(/^\[|\]$/g, ""), { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

type Fetched = { status: number; ms: number; body: string; location: string | null; leftSite: boolean; error?: string };

/**
 * Loads a URL the way a visitor's browser would, following redirects by hand (each hop is checked).
 * With `stayOn`, stops as soon as a redirect leaves that host (the link sent the visitor on).
 */
async function load(start: string, ua: string, { stayOn, readBody }: { stayOn?: string; readBody: boolean }): Promise<Fetched> {
  const t0 = Date.now();
  let url = new URL(start);
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!(await safeToFetch(url))) return { status: 0, ms: Date.now() - t0, body: "", location: null, leftSite: false, error: "Address can't be checked" };
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": `${ua} ${HEALTH_UA_TAG}`, accept: "text/html,application/xhtml+xml,*/*;q=0.8", "accept-language": "en-US,en;q=0.9" },
      });
    } catch (e) {
      const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
      return { status: 0, ms: Date.now() - t0, body: "", location: null, leftSite: false, error: timeout ? "Took too long to answer" : "Couldn't connect" };
    }
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      await res.body?.cancel();
      // An app link (intent://, instagram://…) or another site: the link did its job.
      if (!/^https?:|^\//i.test(loc)) return { status: res.status, ms: Date.now() - t0, body: "", location: loc, leftSite: true };
      const next = new URL(loc, url);
      if (stayOn && next.hostname !== stayOn) return { status: res.status, ms: Date.now() - t0, body: "", location: next.href, leftSite: true };
      url = next;
      continue;
    }
    const body = readBody ? (await res.text()).slice(0, 400_000) : "";
    if (!readBody) await res.body?.cancel();
    return { status: res.status, ms: Date.now() - t0, body, location: null, leftSite: false };
  }
  return { status: 0, ms: Date.now() - t0, body: "", location: null, leftSite: false, error: "Too many redirects" };
}

async function checkClients(url: string, expectEscape: boolean): Promise<ClientResult[]> {
  const host = new URL(url).hostname;
  return Promise.all(
    CLIENTS.map(async (c): Promise<ClientResult> => {
      const r = await load(url, c.ua, { stayOn: host, readBody: true });
      const loaded = r.leftSite || (r.status >= 200 && r.status < 400);
      if (!loaded) {
        const note = r.error ?? (r.status === 404 ? "Shows “not available”" : `Error ${r.status}`);
        return { key: c.key, outcome: "fail", status: r.status, ms: r.ms, note };
      }
      // Browsers, and TikTok (links work fine inside it): loading is all that matters.
      if (!c.escape) return { key: c.key, outcome: "ok", status: r.status, ms: r.ms };
      const escapes = escapesInApp(r.body, r.location);
      return { key: c.key, outcome: expectEscape && !escapes ? "warn" : "ok", status: r.status, ms: r.ms, escapes, note: escapes ? undefined : "Stays inside the app" };
    }),
  );
}

async function checkDestination(raw: string): Promise<DestinationResult> {
  let host = raw;
  try {
    host = new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return { url: raw, host: raw, outcome: "fail", status: 0, ms: 0, note: "Not a valid web address" };
  }
  // A normal phone browser, like the visitor who lands there.
  const r = await load(raw, CLIENTS.find((c) => c.key === "safari")!.ua, { readBody: false });
  if (r.leftSite) return { url: raw, host, outcome: "ok", status: r.status, ms: r.ms, note: "Opens an app" };
  const v = destinationOutcome(r.status);
  return { url: raw, host, outcome: v.outcome, status: r.status, ms: r.ms, note: r.error ?? v.note };
}

export type HealthTarget = { kind: "link" | "page"; id: string; url: string };

/** Runs every check for one of the account's links or pages, saves it and returns it. */
export async function runHealthCheck(userId: string, kind: "link" | "page", id: string) {
  let url: string;
  let live: HealthResult["live"];
  let destinations: string[];
  let access = parseAccess(null);
  let expectEscape: boolean;

  if (kind === "link") {
    const link = await db.smartLink.findFirst({ where: { id, userId }, include: { domain: { select: { hostname: true } } } });
    if (!link) return null;
    url = smartLinkUrl(link.slug, link.domain, appUrl, link.atRoot);
    access = parseAccess(link.access);
    destinations = [link.destinationUrl];
    expectEscape = link.openInBrowser;
    const resolves = link.enabled && !!(await loadSmartLink(link.slug));
    live = !link.enabled
      ? { outcome: "fail", note: "The link is switched off" }
      : resolves
        ? { outcome: "ok", note: "The link is on" }
        : { outcome: "fail", note: "Over your plan's link limit, so it's paused" };
  } else {
    const page = await db.page.findFirst({
      where: { id, userId },
      include: { domain: { select: { hostname: true } }, blocks: { where: { enabled: true, type: "LINK" }, orderBy: { position: "asc" }, select: { url: true } } },
    });
    if (!page) return null;
    url = pageUrl(page, page.domain, appUrl);
    destinations = [...new Set(page.blocks.map((b) => b.url).filter((u): u is string => !!u && /^https?:\/\//i.test(u)))].slice(0, MAX_DESTINATIONS);
    expectEscape = false;
    live = page.published ? { outcome: "ok", note: "The page is live" } : { outcome: "fail", note: "The page is offline" };
  }

  const [clients, dests] = await Promise.all([checkClients(url, expectEscape), Promise.all(destinations.map(checkDestination))]);

  const inAppClients = clients.filter((c) => CLIENTS.find((x) => x.key === c.key)!.escape && c.outcome !== "fail");
  const escaping = inAppClients.filter((c) => c.escapes).length;
  const inApp: HealthResult["inApp"] =
    kind === "page"
      ? { outcome: "ok", note: "Bio pages open inside the app. Use a Deeplink or Two-Steps link to send visitors to their browser." }
      : !expectEscape
        ? { outcome: "warn", note: "“Open in browser” is off, so visitors stay inside the app" }
        : !inAppClients.length
          ? { outcome: "fail", note: "Couldn't load the link inside the apps" }
          : escaping === inAppClients.length
            ? { outcome: "ok", note: "Sends visitors to their real browser" }
            : { outcome: "warn", note: `Sends visitors to their browser from ${escaping} of ${inAppClients.length} apps` };

  const rules: string[] = [];
  if (access.devices !== "all") rules.push(access.devices === "mobile" ? "Phones and tablets only" : "Computers only");
  if (access.startsAt && Date.now() < Date.parse(access.startsAt)) rules.push(`Opens on ${access.startsAt.slice(0, 10)}`);
  if (access.endsAt) rules.push(Date.now() >= Date.parse(access.endsAt) ? `Ended on ${access.endsAt.slice(0, 10)}` : `Ends on ${access.endsAt.slice(0, 10)}`);

  const browserLoads = clients.filter((c) => !CLIENTS.find((x) => x.key === c.key)!.inApp && c.outcome === "ok").map((c) => c.ms);
  const result: HealthResult = {
    kind,
    live,
    clients,
    inApp,
    countries: REPORT_COUNTRIES.map((code) => ({ code, ok: !access.blockedCountries.includes(code) })),
    otherBlocked: access.blockedCountries.filter((c) => !(REPORT_COUNTRIES as readonly string[]).includes(c)).length,
    rules,
    destinations: dests,
    speedMs: browserLoads.length ? Math.min(...browserLoads) : null,
  };
  const status: HealthStatus = overallStatus(result);
  const saved = await db.linkHealthCheck.create({ data: { userId, sourceKind: kind, sourceId: id, url, status, result: result as unknown as Prisma.InputJsonValue } });
  return { status, result, url, checkedAt: saved.createdAt.toISOString() };
}

/** The latest check of each of these links/pages. */
export async function latestHealthChecks(userId: string, ids: string[]) {
  if (!ids.length) return new Map<string, { status: HealthStatus; result: HealthResult; checkedAt: string }>();
  const rows = await db.linkHealthCheck.findMany({
    where: { userId, sourceId: { in: ids } },
    orderBy: { createdAt: "desc" },
    distinct: ["sourceId"],
    select: { sourceId: true, status: true, result: true, createdAt: true },
  });
  return new Map(rows.map((r) => [r.sourceId, { status: r.status as HealthStatus, result: r.result as unknown as HealthResult, checkedAt: r.createdAt.toISOString() }]));
}
