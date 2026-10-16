import "server-only";
import dns from "node:dns/promises";
import { appHost } from "@/config/brand";
import { db } from "@/lib/db";
import { domainStage, isApex, NETLIFY_APEX_IP, wwwOf, type DomainStage } from "@/lib/domain-names";

export type DnsRecord = { type: string; name: string; value: string };
export type DnsOption = { key: "a" | "cname"; label: string; records: DnsRecord[]; note?: string };

/**
 * Ways a creator can point their domain here. A subdomain uses a CNAME. An apex domain
 * (example.com) can use an A record (works everywhere) or a CNAME at the root, which some
 * providers allow (CNAME flattening / ALIAS / ANAME). Both also get a www record, so
 * www.example.com works too and redirects to it.
 */
export function dnsOptionsFor(hostname: string): DnsOption[] {
  if (!isApex(hostname)) {
    return [{ key: "cname", label: "CNAME", records: [{ type: "CNAME", name: hostname.split(".").slice(0, -2).join("."), value: appHost }] }];
  }
  const www = { type: "CNAME", name: "www", value: appHost };
  return [
    { key: "a", label: "A record", records: [{ type: "A", name: "@", value: NETLIFY_APEX_IP }, www] },
    {
      key: "cname",
      label: "CNAME",
      records: [{ type: "CNAME", name: "@", value: appHost }, www],
      note: "Only if your provider allows a CNAME on the root (@): Cloudflare, Spaceship and Namecheap do (it may be called CNAME flattening, ALIAS or ANAME). Otherwise use the A record.",
    },
  ];
}

// The app host's own IP addresses: a root CNAME that the provider flattens shows up as these.
let appIps: { ips: string[]; at: number } | null = null;
async function appHostIps(): Promise<string[]> {
  if (appIps && Date.now() - appIps.at < 10 * 60_000) return appIps.ips;
  try {
    appIps = { ips: await dns.resolve4(appHost), at: Date.now() };
  } catch {
    appIps = { ips: [], at: Date.now() };
  }
  return appIps.ips;
}

/** Checks whether the domain already points at Tendril. */
export async function checkDns(hostname: string): Promise<{ ok: boolean; found: string[] }> {
  const found: string[] = [];
  try {
    const cnames = await dns.resolveCname(hostname);
    found.push(...cnames.map((c) => `CNAME ${c}`));
    if (cnames.some((c) => c.replace(/\.$/, "").toLowerCase() === appHost.toLowerCase())) return { ok: true, found };
  } catch {
    /* no CNAME */
  }
  try {
    const ips = await dns.resolve4(hostname);
    found.push(...ips.map((ip) => `A ${ip}`));
    if (ips.includes(NETLIFY_APEX_IP)) return { ok: true, found };
    // A flattened root CNAME resolves to the app host's addresses.
    const app = await appHostIps();
    if (ips.length && ips.every((ip) => app.includes(ip))) return { ok: true, found };
  } catch {
    /* no A record */
  }
  return { ok: false, found };
}

/** True when `scheme://hostname` really loads this app (and, for https, has a valid certificate). */
export async function answers(scheme: "http" | "https", hostname: string): Promise<boolean> {
  try {
    const res = await fetch(`${scheme}://${hostname}/api/ping`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    return ((await res.json()) as { app?: string }).app === "tendril";
  } catch {
    return false; // includes certificate errors while HTTPS is still being issued
  }
}

/**
 * True when the host already serves the domain over plain HTTP. Once the site has HTTPS, Netlify
 * answers http:// with a redirect to https://, which counts too (the certificate may not be ready).
 */
async function servesHttp(hostname: string): Promise<boolean> {
  try {
    const res = await fetch(`http://${hostname}/api/ping`, { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(4000) });
    if (res.status >= 300 && res.status < 400) return (res.headers.get("location") ?? "").startsWith(`https://${hostname}/`);
    if (!res.ok) return false;
    return ((await res.json()) as { app?: string }).app === "tendril";
  } catch {
    return false;
  }
}

// ---------- Netlify ----------
// With NETLIFY_API_TOKEN set, Tendril adds and removes creators' domains on the Netlify site
// itself, and Netlify issues their HTTPS certificates. Nobody has to open the Netlify dashboard.

export function netlifyConfigured() {
  return Boolean(process.env.NETLIFY_API_TOKEN);
}

async function netlifySite(): Promise<{ api: string; headers: Record<string, string> } | null> {
  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) return null;
  // Netlify's API accepts the site's own hostname in place of its id.
  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID || appHost;
  return { api: `https://api.netlify.com/api/v1/sites/${siteId}`, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
}

async function updateNetlifyAliases(change: (aliases: Set<string>) => boolean): Promise<"ok" | "manual" | "taken" | "error"> {
  const site = await netlifySite();
  if (!site) return "manual";
  try {
    const res = await fetch(site.api, { headers: site.headers, cache: "no-store" });
    if (!res.ok) {
      console.error(`[domains] Netlify site lookup failed: ${res.status}`);
      return "error";
    }
    const current = (await res.json()) as { domain_aliases?: string[] };
    const aliases = new Set(current.domain_aliases ?? []);
    if (!change(aliases)) return "ok";
    const patch = await fetch(site.api, { method: "PATCH", headers: site.headers, body: JSON.stringify({ domain_aliases: [...aliases] }) });
    if (patch.ok) return "ok";
    const body = (await patch.text()).slice(0, 300);
    console.error(`[domains] Netlify alias update failed: ${patch.status} ${body}`);
    // Netlify refuses a domain that another Netlify site already uses.
    return patch.status === 422 && /already|taken|in use/i.test(body) ? "taken" : "error";
  } catch (e) {
    console.error("[domains] Netlify request failed", e);
    return "error";
  }
}

/** Hostnames Netlify must serve for a domain: an apex domain brings its www form along. */
function servedHosts(hostname: string) {
  const www = wwwOf(hostname);
  return www ? [hostname, www] : [hostname];
}

/** Adds the domain (and www for an apex domain) to the Netlify site so Netlify serves it and issues HTTPS. */
export function addNetlifyDomainAlias(hostname: string) {
  return updateNetlifyAliases((aliases) => {
    const missing = servedHosts(hostname).filter((h) => !aliases.has(h));
    for (const h of missing) aliases.add(h);
    return missing.length > 0;
  });
}

// Let's Encrypt limits failed attempts, so ask at most every 15 minutes per server instance.
const certRequests = new Map<string, number>();

/**
 * Asks Netlify to (re)issue the site's Let's Encrypt certificate so it covers newly added domains.
 * Netlify does this on its own eventually; asking makes a new domain secure within minutes.
 */
async function requestNetlifyCertificate(hostname: string) {
  const last = certRequests.get(hostname) ?? 0;
  if (Date.now() - last < 15 * 60_000) return;
  certRequests.set(hostname, Date.now());
  const site = await netlifySite();
  if (!site) return;
  try {
    const res = await fetch(`${site.api}/ssl`, { method: "POST", headers: site.headers });
    if (!res.ok) console.error(`[domains] Netlify certificate request failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  } catch (e) {
    console.error("[domains] Netlify certificate request failed", e);
  }
}

/** Removes the domain (and its www form, unless kept) from the Netlify site. */
export function removeNetlifyDomainAlias(hostname: string, keep: string[] = []) {
  return updateNetlifyAliases((aliases) => {
    let changed = false;
    for (const h of servedHosts(hostname)) if (!keep.includes(h) && aliases.delete(h)) changed = true;
    return changed;
  });
}

// ---------- Status ----------

export type DomainStatus = { stage: DomainStage; found: string[]; problem?: "taken" | "setup" };

/**
 * Moves a domain forward as far as it can: DNS → added on Netlify → HTTPS ready → connected.
 * Marks it verified (usable for links) only once it loads over HTTPS. Safe to call repeatedly.
 */
export async function refreshDomain(domain: { id: string; hostname: string; verifiedAt: Date | null }): Promise<DomainStatus> {
  if (domain.verifiedAt) return { stage: "connected", found: [] };
  const dnsCheck = await checkDns(domain.hostname);
  if (!dnsCheck.ok) return { stage: domainStage({ dns: false, http: false, https: false }), found: dnsCheck.found };

  let http = await servesHttp(domain.hostname);
  let problem: DomainStatus["problem"];
  if (!http) {
    // DNS is right but the host doesn't serve the domain yet: (re)add it on Netlify.
    const added = await addNetlifyDomainAlias(domain.hostname);
    if (added === "taken") problem = "taken";
    else if (added !== "ok") problem = "setup";
    http = await servesHttp(domain.hostname);
  }
  const https = http && (await answers("https", domain.hostname));
  // Served but no valid certificate yet: have Netlify issue one that includes this domain.
  if (http && !https) await requestNetlifyCertificate(domain.hostname);
  if (https) await db.domain.update({ where: { id: domain.id }, data: { verifiedAt: new Date() } });
  return { stage: domainStage({ dns: true, http, https }), found: dnsCheck.found, problem: https ? undefined : problem };
}

/** A verified custom domain by hostname (for serving requests on it). */
export function getVerifiedDomain(hostname: string) {
  return db.domain.findFirst({ where: { hostname: hostname.toLowerCase(), verifiedAt: { not: null } }, select: { id: true, userId: true, hostname: true } });
}

/** Public URL of a smart link: on its custom domain (at its root or a path), else the Tendril domain. */
export function smartLinkUrl(slug: string, domain: { hostname: string } | null | undefined, appUrl: string, atRoot = false) {
  if (!domain) return `${appUrl}/l/${slug}`;
  return atRoot ? `https://${domain.hostname}/` : `https://${domain.hostname}/${slug}`;
}
