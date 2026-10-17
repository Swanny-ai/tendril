// Hostname rules for custom domains. Pure and edge-safe (used by the proxy too).

/** Netlify's load balancer, for apex domains that can't use a CNAME (docs.netlify.com). */
export const NETLIFY_APEX_IP = "75.2.60.5";

/** Turns "https://Links.Example.com/path" into "links.example.com", or null if it isn't a usable domain. */
export function normalizeHostname(input: string): string | null {
  let h = input.trim().toLowerCase();
  h = h.replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");
  if (h.length > 253 || !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(h)) return null;
  return h;
}

/** Hosts that serve the ViewLink app itself (never treated as a creator's custom domain). */
export function isAppHost(host: string | null | undefined, appHost: string): boolean {
  if (!host) return true;
  const h = host.toLowerCase().replace(/:\d+$/, "");
  const app = appHost.toLowerCase().replace(/:\d+$/, "");
  return (
    h === app ||
    h === `www.${app}` ||
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "[::1]" ||
    h.endsWith(".localhost") ||
    h.endsWith(".netlify.app") ||
    h.endsWith(".vercel.app") ||
    h.endsWith(".netlify.live")
  );
}

/** Domains a creator may not claim: the app's own, hosting providers and IP addresses. */
export function isClaimable(hostname: string, appHost: string): boolean {
  return !isAppHost(hostname, appHost) && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname);
}

/** An apex domain (example.com) needs an A record; a subdomain (links.example.com) uses a CNAME. */
export function isApex(hostname: string): boolean {
  const parts = hostname.split(".");
  // Treat common two-part public suffixes (co.uk, com.au...) as part of the apex.
  const twoPartSuffix = parts.length >= 3 && /^(co|com|net|org|gov|ac|edu)$/.test(parts[parts.length - 2]) && parts[parts.length - 1].length === 2;
  return parts.length === (twoPartSuffix ? 3 : 2);
}

/** Where a custom domain is in its setup, from the checks that have passed. */
export type DomainStage = "dns" | "connecting" | "https" | "connected";

export function domainStage(checks: { dns: boolean; http: boolean; https: boolean }): DomainStage {
  if (!checks.dns) return "dns";
  if (!checks.http) return "connecting";
  return checks.https ? "connected" : "https";
}

/** "www.example.com" for an apex domain, so visitors who type www reach it too; else null. */
export function wwwOf(hostname: string): string | null {
  return isApex(hostname) ? `www.${hostname}` : null;
}

/** "example.com" when `host` is the www form of an apex domain, else null. */
export function apexOfWww(host: string): string | null {
  if (!host.startsWith("www.")) return null;
  const rest = host.slice(4);
  return isApex(rest) ? rest : null;
}

/** The registrable domain a hostname belongs to: "links.shop.co.uk" → "shop.co.uk". */
export function apexOf(hostname: string): string {
  const parts = hostname.split(".");
  for (let n = Math.min(3, parts.length); n >= 2; n--) {
    const candidate = parts.slice(-n).join(".");
    if (isApex(candidate)) return candidate;
  }
  return hostname;
}
