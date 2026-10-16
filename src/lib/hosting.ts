import "server-only";
import { appHost } from "@/config/brand";
import { NETLIFY_APEX_IP, wwwOf } from "@/lib/domain-names";

// Where the app is hosted decides how creators' custom domains are added, which DNS records
// they use, and who issues HTTPS. Vercel sets VERCEL=1 on its builds and functions.
//  - Vercel: needs VERCEL_API_TOKEN (and VERCEL_TEAM_ID for team projects). Each domain gets
//    its own certificate; www.example.com is added as a redirect to example.com.
//  - Netlify: needs NETLIFY_API_TOKEN. Domains become aliases sharing one certificate.

export type HostResult = "ok" | "manual" | "taken" | "error";
export type DnsRecord = { type: string; name: string; value: string };

export const host = process.env.VERCEL ? ("vercel" as const) : ("netlify" as const);

/** DNS targets creators point at (apexIps: the one shown first, then older ones that still work). */
export const dnsTargets =
  host === "vercel"
    ? { apexIp: "216.198.79.1", apexIps: ["216.198.79.1", "76.76.21.21"], cname: "cname.vercel-dns.com" }
    : { apexIp: NETLIFY_APEX_IP, apexIps: [NETLIFY_APEX_IP], cname: appHost };

/** True when a CNAME target belongs to the current host. */
export function isOurCname(target: string) {
  const t = target.replace(/\.$/, "").toLowerCase();
  if (t === appHost.toLowerCase() || t === dnsTargets.cname) return true;
  // Vercel also hands out project-specific targets like abc123.vercel-dns-017.com.
  return host === "vercel" && /\.vercel-dns(-\d+)?\.com$/.test(t);
}

export function hostingConfigured() {
  return host === "vercel" ? Boolean(process.env.VERCEL_API_TOKEN) : Boolean(process.env.NETLIFY_API_TOKEN);
}

/** Hostnames to serve for a domain: an apex domain brings its www form along. */
function servedHosts(hostname: string) {
  const www = wwwOf(hostname);
  return www ? [hostname, www] : [hostname];
}

// ---------- Vercel ----------

function vercelApi(path: string) {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) return null;
  const project = process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_NAME || "tendril";
  const url = new URL(`https://api.vercel.com${path.replace("{project}", encodeURIComponent(project))}`);
  if (process.env.VERCEL_TEAM_ID) url.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  return { url, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
}

type VercelDomain = { name: string; verified: boolean; verification?: { type: string; domain: string; value: string }[] };

async function vercelAdd(name: string, redirect?: string): Promise<HostResult> {
  const api = vercelApi("/v10/projects/{project}/domains");
  if (!api) return "manual";
  try {
    const res = await fetch(api.url, {
      method: "POST",
      headers: api.headers,
      body: JSON.stringify(redirect ? { name, redirect, redirectStatusCode: 308 } : { name }),
    });
    if (res.ok) return "ok";
    const body = (await res.text()).slice(0, 300);
    if (res.status === 409 && /already.*(this project|assigned to this)|domain_already_exists/i.test(body)) return "ok";
    console.error(`[domains] Vercel add ${name} failed: ${res.status} ${body}`);
    return res.status === 409 ? "taken" : "error";
  } catch (e) {
    console.error("[domains] Vercel request failed", e);
    return "error";
  }
}

async function vercelRemove(name: string) {
  const api = vercelApi(`/v9/projects/{project}/domains/${encodeURIComponent(name)}`);
  if (!api) return;
  try {
    const res = await fetch(api.url, { method: "DELETE", headers: api.headers });
    if (!res.ok && res.status !== 404) console.error(`[domains] Vercel remove ${name} failed: ${res.status}`);
  } catch (e) {
    console.error("[domains] Vercel request failed", e);
  }
}

/** The domain as Vercel sees it, or null if it isn't on the project (or Vercel isn't set up). */
async function vercelGet(name: string): Promise<VercelDomain | null> {
  const api = vercelApi(`/v9/projects/{project}/domains/${encodeURIComponent(name)}`);
  if (!api) return null;
  try {
    const res = await fetch(api.url, { headers: api.headers, cache: "no-store" });
    return res.ok ? ((await res.json()) as VercelDomain) : null;
  } catch {
    return null;
  }
}

/** Vercel's own view of the DNS: false when the domain points at Vercel correctly. */
export async function vercelMisconfigured(name: string): Promise<boolean | null> {
  const api = vercelApi(`/v6/domains/${encodeURIComponent(name)}/config`);
  if (!api) return null;
  try {
    const res = await fetch(api.url, { headers: api.headers, cache: "no-store" });
    if (!res.ok) return null;
    return Boolean(((await res.json()) as { misconfigured?: boolean }).misconfigured);
  } catch {
    return null;
  }
}

/**
 * When a domain is already used by another Vercel account, Vercel asks for a TXT record to prove
 * ownership. Returns those records (empty when none are needed) and re-checks them.
 */
export async function ownershipRecords(hostname: string): Promise<DnsRecord[]> {
  if (host !== "vercel") return [];
  const d = await vercelGet(hostname);
  if (!d || d.verified) return [];
  const api = vercelApi(`/v9/projects/{project}/domains/${encodeURIComponent(hostname)}/verify`);
  if (api) {
    try {
      const res = await fetch(api.url, { method: "POST", headers: api.headers });
      if (res.ok && ((await res.json()) as VercelDomain).verified) return [];
    } catch {
      /* show the records below */
    }
  }
  return (d.verification ?? []).map((v) => ({ type: v.type, name: v.domain, value: v.value }));
}

// ---------- Netlify ----------

function netlifySite(): { api: string; headers: Record<string, string> } | null {
  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) return null;
  // Netlify's API accepts the site's own hostname in place of its id.
  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID || appHost;
  return { api: `https://api.netlify.com/api/v1/sites/${siteId}`, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } };
}

async function updateNetlifyAliases(change: (aliases: Set<string>) => boolean): Promise<HostResult> {
  const site = netlifySite();
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

// ---------- Common ----------

/** Adds the domain (and www for an apex domain) to the host so it serves it and issues HTTPS. */
export async function addHostedDomain(hostname: string): Promise<HostResult> {
  if (host === "vercel") {
    const main = await vercelAdd(hostname);
    const www = wwwOf(hostname);
    if (www && main === "ok") await vercelAdd(www, hostname); // www.example.com → example.com
    return main;
  }
  return updateNetlifyAliases((aliases) => {
    const missing = servedHosts(hostname).filter((h) => !aliases.has(h));
    for (const h of missing) aliases.add(h);
    return missing.length > 0;
  });
}

/** Removes the domain (and its www form, unless kept) from the host. */
export async function removeHostedDomain(hostname: string, keep: string[] = []) {
  const names = servedHosts(hostname).filter((h) => !keep.includes(h));
  if (host === "vercel") {
    // www first: Vercel won't remove a domain that another one redirects to.
    for (const h of names.reverse()) await vercelRemove(h);
    return;
  }
  await updateNetlifyAliases((aliases) => {
    let changed = false;
    for (const h of names) if (aliases.delete(h)) changed = true;
    return changed;
  });
}

// Let's Encrypt limits failed attempts, so ask at most every 15 minutes per server instance.
const certRequests = new Map<string, number>();

/**
 * Netlify only: asks it to reissue the site's shared certificate so it covers newly added
 * domains (Vercel issues a certificate per domain on its own).
 */
export async function requestCertificate(hostname: string) {
  if (host !== "netlify") return;
  const last = certRequests.get(hostname) ?? 0;
  if (Date.now() - last < 15 * 60_000) return;
  certRequests.set(hostname, Date.now());
  const site = netlifySite();
  if (!site) return;
  try {
    const res = await fetch(`${site.api}/ssl`, { method: "POST", headers: site.headers });
    if (!res.ok) console.error(`[domains] Netlify certificate request failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  } catch (e) {
    console.error("[domains] Netlify certificate request failed", e);
  }
}
