import "server-only";
import dns from "node:dns/promises";
import { appHost } from "@/config/brand";
import { db } from "@/lib/db";
import { domainStage, isApex, type DomainStage } from "@/lib/domain-names";
import { addHostedDomain, dnsTargets, host, isOurCname, ownershipRecords, requestCertificate, vercelMisconfigured, type DnsRecord } from "@/lib/hosting";

export type { DnsRecord } from "@/lib/hosting";
export { addHostedDomain, hostingConfigured, removeHostedDomain } from "@/lib/hosting";
export type DnsOption = { key: "a" | "cname"; label: string; records: DnsRecord[]; note?: string };

/**
 * Ways a creator can point their domain here. A subdomain uses a CNAME. An apex domain
 * (example.com) can use an A record (works everywhere) or a CNAME at the root, which some
 * providers allow (CNAME flattening / ALIAS / ANAME). Both also get a www record, so
 * www.example.com works too and redirects to it.
 */
export function dnsOptionsFor(hostname: string): DnsOption[] {
  const { apexIp, cname } = dnsTargets;
  if (!isApex(hostname)) {
    return [{ key: "cname", label: "CNAME", records: [{ type: "CNAME", name: hostname.split(".").slice(0, -2).join("."), value: cname }] }];
  }
  const www = { type: "CNAME", name: "www", value: cname };
  return [
    { key: "a", label: "A record", records: [{ type: "A", name: "@", value: apexIp }, www] },
    {
      key: "cname",
      label: "CNAME",
      records: [{ type: "CNAME", name: "@", value: cname }, www],
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
  let ok = false;
  try {
    const cnames = await dns.resolveCname(hostname);
    found.push(...cnames.map((c) => `CNAME ${c}`));
    if (cnames.some(isOurCname)) ok = true;
  } catch {
    /* no CNAME */
  }
  if (!ok) {
    try {
      const ips = await dns.resolve4(hostname);
      found.push(...ips.map((ip) => `A ${ip}`));
      // A flattened root CNAME resolves to the app host's addresses.
      const app = await appHostIps();
      if (ips.includes(dnsTargets.apexIp) || (ips.length && ips.every((ip) => app.includes(ip)))) ok = true;
    } catch {
      /* no A record */
    }
  }
  // Vercel knows best whether a domain points at it (it accepts several IPs and targets).
  if (!ok && host === "vercel" && (await vercelMisconfigured(hostname)) === false) ok = true;
  return { ok, found };
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
 * True when the host already serves the domain over plain HTTP. Hosts answer http:// with a
 * redirect to https:// once HTTPS is on, which counts too (the certificate may not be ready).
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

// ---------- Status ----------

export type DomainStatus = {
  stage: DomainStage;
  found: string[];
  problem?: "taken" | "setup";
  /** TXT records proving ownership, when the host asks for them (domain used elsewhere before). */
  ownership?: DnsRecord[];
};

/**
 * Moves a domain forward as far as it can: DNS → added on the host → HTTPS ready → connected.
 * Marks it verified (usable for links) only once it loads over HTTPS. Safe to call repeatedly.
 */
export async function refreshDomain(domain: { id: string; hostname: string; verifiedAt: Date | null }): Promise<DomainStatus> {
  if (domain.verifiedAt) return { stage: "connected", found: [] };
  const dnsCheck = await checkDns(domain.hostname);
  if (!dnsCheck.ok) return { stage: domainStage({ dns: false, http: false, https: false }), found: dnsCheck.found };

  let http = await servesHttp(domain.hostname);
  let problem: DomainStatus["problem"];
  let ownership: DnsRecord[] | undefined;
  if (!http) {
    // DNS is right but the host doesn't serve the domain yet: (re)add it.
    const added = await addHostedDomain(domain.hostname);
    if (added === "taken") problem = "taken";
    else if (added !== "ok") problem = "setup";
    const txt = await ownershipRecords(domain.hostname);
    if (txt.length) ownership = txt;
    http = await servesHttp(domain.hostname);
  }
  const https = http && (await answers("https", domain.hostname));
  // Served but no valid certificate yet: have the host issue one that includes this domain.
  if (http && !https) await requestCertificate(domain.hostname);
  if (https) await db.domain.update({ where: { id: domain.id }, data: { verifiedAt: new Date() } });
  return https
    ? { stage: "connected", found: dnsCheck.found }
    : { stage: domainStage({ dns: true, http, https }), found: dnsCheck.found, problem, ownership };
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
