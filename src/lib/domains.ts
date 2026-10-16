import "server-only";
import dns from "node:dns/promises";
import { appHost } from "@/config/brand";
import { db } from "@/lib/db";
import { domainStage, isApex, NETLIFY_APEX_IP, type DomainStage } from "@/lib/domain-names";

/** The DNS record a creator adds at their registrar for `hostname`. */
export function dnsRecordFor(hostname: string) {
  return isApex(hostname)
    ? { type: "A", name: "@", value: NETLIFY_APEX_IP }
    : { type: "CNAME", name: hostname.split(".").slice(0, -2).join("."), value: appHost };
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
  } catch {
    /* no A record */
  }
  return { ok: false, found };
}

/** True when `scheme://hostname` really loads this app (and, for https, has a valid certificate). */
async function answers(scheme: "http" | "https", hostname: string): Promise<boolean> {
  try {
    const res = await fetch(`${scheme}://${hostname}/api/ping`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    return ((await res.json()) as { app?: string }).app === "tendril";
  } catch {
    return false; // includes certificate errors while HTTPS is still being issued
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

/** Adds the domain to the Netlify site so Netlify serves it and issues HTTPS. */
export function addNetlifyDomainAlias(hostname: string) {
  return updateNetlifyAliases((aliases) => {
    if (aliases.has(hostname)) return false;
    aliases.add(hostname);
    return true;
  });
}

/** Removes the domain from the Netlify site (used when a creator removes it). */
export function removeNetlifyDomainAlias(hostname: string) {
  return updateNetlifyAliases((aliases) => aliases.delete(hostname));
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

  let http = await answers("http", domain.hostname);
  let problem: DomainStatus["problem"];
  if (!http) {
    // DNS is right but the host doesn't serve the domain yet: (re)add it on Netlify.
    const added = await addNetlifyDomainAlias(domain.hostname);
    if (added === "taken") problem = "taken";
    else if (added !== "ok") problem = "setup";
    http = await answers("http", domain.hostname);
  }
  const https = http && (await answers("https", domain.hostname));
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
