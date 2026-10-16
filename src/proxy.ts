import { NextResponse, type NextRequest } from "next/server";
import { appHost, appUrl } from "@/config/brand";
import { apexOfWww, isAppHost } from "@/lib/domain-names";

// 1. Custom domains: links.example.com/vip serves the creator's smart link "vip", and the
//    domain's home page shows their "Root" smart link if they set one, else their bio page.
// 2. Warning pages render per request and stream, so a missing link would otherwise be sent
//    as a 200 "not found" page; checking here returns a real 404 status first.
// Lookups go through small API routes because some hosts (Netlify) run the proxy as an edge
// function, where the Postgres driver can't load.

function notFound(message = "It may have been removed or turned off.") {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Link not available</title>` +
      `<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#fbf8f2;color:#1c1a24">` +
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

type DomainInfo = { rootSlug?: string | null; username?: string | null; redirectTo?: string };

async function domainInfo(request: NextRequest, host: string): Promise<DomainInfo | null> {
  const res = await fetch(new URL(`/api/domain-status?host=${encodeURIComponent(host)}`, apiBase(request)));
  return res.ok ? ((await res.json()) as DomainInfo) : null;
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
      if (data?.rootSlug) {
        url.pathname = `/l/${data.rootSlug}`; // the domain itself is a smart link ("Root")
        return NextResponse.rewrite(url);
      }
      if (!data?.username) return notFound("This domain isn't connected to a page yet.");
      url.pathname = `/${data.username}`;
      return NextResponse.rewrite(url);
    } catch {
      return notFound("This domain isn't connected to a page yet.");
    }
  }
  if (PASSTHROUGH.has(parts[0])) return NextResponse.next();
  if (parts[0] === "l") return smartLinkPages(request, parts) ?? NextResponse.next();

  // /<slug> and /<slug>/(warning|open|left) are the creator's smart links.
  if (parts.length === 1 || (parts.length === 2 && ["warning", "open", "left"].includes(parts[1]))) {
    if (parts.length === 2 && !(await exists(request, "smart", parts[0], parts[1]))) return notFound();
    url.pathname = `/l/${parts.join("/")}`;
    return NextResponse.rewrite(url);
  }
  return notFound();
}

function smartLinkPages(request: NextRequest, parts: string[]) {
  if (parts[0] === "l" && parts.length === 3) {
    return exists(request, "smart", parts[1], parts[2]).then((ok) => (ok ? NextResponse.next() : notFound()));
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  if (!isAppHost(host, appHost)) return customDomain(request, host!.toLowerCase().replace(/:\d+$/, ""));

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
