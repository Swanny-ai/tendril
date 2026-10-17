import { NextResponse, type NextRequest } from "next/server";
import { appHost, appUrl } from "@/config/brand";
import { apexOfWww, isAppHost } from "@/lib/domain-names";
import { detectInAppBrowser } from "@/lib/in-app";
import { LINK_BASE_HEADER, LINK_ENTRY_HEADER } from "@/lib/link-paths";

// 1. Custom domains: links.example.com/vip serves the creator's smart link "vip", and the
//    domain's home page shows whatever they set as its Root (a deep link or a bio page), and
//    bio pages assigned to the domain live at /<username>. Nothing assigned = nothing shown.
//    Links keep a clean address there: the 18+ page shows at example.com/ or example.com/vip,
//    not at /l/vip/warning.
// 2. Warning pages render per request and stream, so a missing link would otherwise be sent
//    as a 200 "not found" page; checking here returns a real 404 status first.
// Lookups go through small API routes because some hosts (Netlify) run the proxy as an edge
// function, where the Postgres driver can't load.

function notFound(message = "It may have been removed or turned off.") {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Link not available</title>` +
      `<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#151515;color:#ffffff">` +
      `<div style="text-align:center"><h1>This link isn't available</h1><p>${message}</p></div>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

/** Where the proxy reaches the app's own API: this host for the app, the main app URL for custom domains. */
const apiBase = (request: NextRequest) => (isAppHost(request.headers.get("host"), appHost) ? request.nextUrl.origin : appUrl);

async function exists(request: NextRequest, kind: "smart" | "block", id: string, page: string) {
  const url = new URL("/api/link-status", apiBase(request));
  url.search = new URLSearchParams({ kind, id, page }).toString();
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    return res.status !== 404;
  } catch {
    return true; // if the check itself fails, let the page render (it shows its own not-found UI)
  }
}

// Paths that are app plumbing and work the same on every host.
const PASSTHROUGH = new Set(["_next", "api", "media", "flags", "videos", "templates", "favicon.ico", "robots.txt", "go"]);

type DomainInfo = { rootSlug?: string | null; username?: string | null; pageUsername?: string | null; redirectTo?: string };

async function domainInfo(request: NextRequest, host: string, path?: string): Promise<DomainInfo | null> {
  const q = new URLSearchParams({ host, ...(path ? { path } : {}) });
  const res = await fetch(new URL(`/api/domain-status?${q}`, apiBase(request)));
  return res.ok ? ((await res.json()) as DomainInfo) : null;
}

/** Request headers for a custom-domain request, without our internal headers a visitor could fake. */
function cleanHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete(LINK_BASE_HEADER);
  headers.delete(LINK_ENTRY_HEADER);
  return headers;
}

/**
 * A visitor opens a smart link on a custom domain at `base` ("/" for a Root link, "/vip" for a
 * path). The 18+ page or the "open in browser" page is rendered right there (a rewrite, so the
 * address stays clean); otherwise /l/<slug> sends them on to the destination.
 */
async function linkEntry(request: NextRequest, slug: string, base: string) {
  const url = request.nextUrl.clone();
  const headers = cleanHeaders(request);
  headers.set(LINK_BASE_HEADER, base);
  const q = request.nextUrl.searchParams;
  if (q.get("ok") !== "1" && q.get("ib") !== "1") {
    let info: { adultWarning: boolean; openInBrowser: boolean } | null | undefined;
    try {
      const res = await fetch(new URL(`/api/link-status?${new URLSearchParams({ kind: "smart", id: slug, page: "entry" })}`, apiBase(request)));
      info = res.status === 404 ? null : res.ok ? await res.json() : undefined;
    } catch {
      info = undefined; // lookup failed: let /l/<slug> decide
    }
    if (info === null) return notFound();
    const step = info?.adultWarning ? "warning" : info?.openInBrowser && detectInAppBrowser(request.headers.get("user-agent") ?? "") ? "open" : null;
    if (step) {
      headers.set(LINK_ENTRY_HEADER, "1"); // this view is also the visit
      url.pathname = `/l/${slug}/${step}`;
      url.search = "";
      return NextResponse.rewrite(url, { request: { headers } });
    }
  }
  url.pathname = `/l/${slug}`;
  return NextResponse.rewrite(url, { request: { headers } });
}

async function customDomain(request: NextRequest, host: string) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const url = request.nextUrl.clone();

  // www.example.com → example.com (same path), when the creator connected example.com.
  let info: DomainInfo | null | undefined;
  if (apexOfWww(host)) {
    info = await domainInfo(request, host).catch(() => null);
    if (info?.redirectTo) {
      const to = new URL(`https://${info.redirectTo}${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(to, 301);
    }
  }

  if (parts.length === 0) {
    try {
      const data = info !== undefined ? info : await domainInfo(request, host);
      if (data?.rootSlug) return linkEntry(request, data.rootSlug, "/"); // the domain itself is a smart link ("Root")
      if (!data?.username) return notFound("Nothing is published on this domain yet.");
      url.pathname = `/${data.username}`;
      return NextResponse.rewrite(url);
    } catch {
      return notFound("Nothing is published on this domain yet.");
    }
  }
  if (PASSTHROUGH.has(parts[0])) return NextResponse.next({ request: { headers: cleanHeaders(request) } });
  if (parts[0] === "l") return smartLinkPages(request, parts, cleanHeaders(request)) ?? NextResponse.next({ request: { headers: cleanHeaders(request) } });

  // /<slug> is the creator's smart link; /<slug>/(warning|open|left) its steps.
  // /<path>: a bio page assigned to this domain, else a deep link.
  if (parts.length === 1) {
    const page = await domainInfo(request, host, parts[0]).catch(() => null);
    if (page?.pageUsername) {
      url.pathname = `/${page.pageUsername}`;
      return NextResponse.rewrite(url, { request: { headers: cleanHeaders(request) } });
    }
    return linkEntry(request, parts[0], `/${parts[0]}`);
  }
  if (parts.length === 2 && ["warning", "open", "left"].includes(parts[1])) {
    if (!(await exists(request, "smart", parts[0], parts[1]))) return notFound();
    const headers = cleanHeaders(request);
    headers.set(LINK_BASE_HEADER, `/${parts[0]}`);
    url.pathname = `/l/${parts.join("/")}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return notFound();
}

function smartLinkPages(request: NextRequest, parts: string[], headers?: Headers) {
  if (parts[0] === "l" && parts.length === 3) {
    return exists(request, "smart", parts[1], parts[2]).then((ok) => (ok ? NextResponse.next(headers ? { request: { headers } } : undefined) : notFound()));
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  if (!isAppHost(host, appHost)) return customDomain(request, host!.toLowerCase().replace(/:\d+$/, ""));
  // www.<app domain> is the same site: send it to the main address.
  if (host?.toLowerCase() === `www.${appHost}`) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, appUrl), 308);
  }

  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  if (parts[0] === "l" && parts.length === 3 && ["warning", "left", "open"].includes(parts[2])) {
    return (await smartLinkPages(request, parts)) ?? NextResponse.next();
  }
  if (parts[0] === "go" && parts.length === 3 && parts[2] === "warning") {
    if (!(await exists(request, "block", parts[1], "warning"))) return notFound();
  }
  return NextResponse.next();
}

export const config = {
  // Every page request (custom domains can use any path); static files are skipped.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|flags/|videos/|templates/).*)"],
};
