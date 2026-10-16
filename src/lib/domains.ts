import "server-only";
import dns from "node:dns/promises";
import { appHost } from "@/config/brand";
import { db } from "@/lib/db";
import { isApex, NETLIFY_APEX_IP } from "@/lib/domain-names";

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

/**
 * Adds the domain to the Netlify site so Netlify serves it (and issues HTTPS).
 * Needs NETLIFY_API_TOKEN (a personal access token) in the site's environment; without it
 * the creator gets instructions to add the domain in Netlify themselves.
 */
export async function addNetlifyDomainAlias(hostname: string): Promise<"added" | "manual" | "error"> {
  const token = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  if (!token || !siteId) return "manual";
  const api = `https://api.netlify.com/api/v1/sites/${siteId}`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  try {
    const site = (await (await fetch(api, { headers })).json()) as { domain_aliases?: string[] };
    const aliases = new Set(site.domain_aliases ?? []);
    if (aliases.has(hostname)) return "added";
    aliases.add(hostname);
    const res = await fetch(api, { method: "PATCH", headers, body: JSON.stringify({ domain_aliases: [...aliases] }) });
    return res.ok ? "added" : "error";
  } catch {
    return "error";
  }
}

/** A verified custom domain by hostname (for serving requests on it). */
export function getVerifiedDomain(hostname: string) {
  return db.domain.findFirst({ where: { hostname: hostname.toLowerCase(), verifiedAt: { not: null } }, select: { id: true, userId: true, hostname: true } });
}

/** Public URL of a smart link: on its custom domain if it has one, else the Tendril domain. */
export function smartLinkUrl(slug: string, domain: { hostname: string } | null | undefined, appUrl: string) {
  return domain ? `https://${domain.hostname}/${slug}` : `${appUrl}/l/${slug}`;
}
