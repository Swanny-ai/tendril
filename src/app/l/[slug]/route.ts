import { after, type NextRequest } from "next/server";
import { clientIp } from "@/lib/analytics/visitor";
import { appHost } from "@/config/brand";
import { isAppHost } from "@/lib/domain-names";
import { getVerifiedDomain } from "@/lib/domains";
import { detectInAppBrowser } from "@/lib/in-app";
import { isLinkEntry } from "@/lib/link-paths";
import { rateLimit } from "@/lib/rate-limit";
import { accessDenied, landingStep, openStep, warningStep } from "@/lib/smart-link-steps";
import { getSmartLink, recordSmartLinkEvent, type SmartLinkEventKind } from "@/lib/smart-links";

const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "strict-origin-when-cross-origin" };
const SLUG = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

function notFound() {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link not available</title>` +
      `<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#151515;color:#ffffff">` +
      `<div style="text-align:center"><h1>This link isn't available</h1><p>It may have been removed or turned off.</p></div>`,
    { status: 404, headers: { ...NO_STORE, "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest, ctx: RouteContext<"/l/[slug]">) {
  const { slug } = await ctx.params;
  if (!SLUG.test(slug)) return notFound();
  const link = await getSmartLink(slug);
  if (!link) return notFound();
  const host = request.headers.get("host");
  if (!isAppHost(host, appHost)) {
    const domain = host ? await getVerifiedDomain(host) : null;
    if (!domain || domain.userId !== link.userId) return notFound();
  }

  const headers = new Headers(request.headers);
  const denied = accessDenied(headers, link);
  if (denied) return denied;
  const confirmed = request.nextUrl.searchParams.get("ok") === "1";
  // ib=1: the visitor already went through the "open in browser" step (now in the real
  // browser, or chose to stay in the app), so don't show it again or count a second visit.
  const escaped = request.nextUrl.searchParams.get("ib") === "1";
  // lp=1: the visitor tapped the main button on the link's profile page ("Template").
  const pastLanding = request.nextUrl.searchParams.get("lp") === "1";
  const log = (kinds: SmartLinkEventKind[]) => {
    if (!rateLimit(`smart:${clientIp(headers)}:${slug}:${kinds[0]}`, 30, 60_000)) return;
    after(async () => {
      try {
        for (const kind of kinds) await recordSmartLinkEvent(headers, link.id, kind);
      } catch (e) {
        console.error("smart link log failed", e);
      }
    });
  };

  // Custom domains: the proxy sends a visitor's first request here (marked as the entry), and the
  // 18+ or "open in browser" page is rendered at the link's own clean address in this response.
  // Profile page first (rendered here, at the link's own address), then the usual steps.
  if (link.landing && !confirmed && !escaped && !pastLanding) return landingStep(headers, link, slug, request.nextUrl.searchParams.get("step") === "2");

  if (!confirmed && !escaped && isLinkEntry(headers)) {
    if (link.adultWarning) return warningStep(headers, link, slug, !pastLanding);
    if (link.openInBrowser && detectInAppBrowser(headers.get("user-agent") ?? "")) return openStep(headers, link, slug, !pastLanding);
  }

  // Deep link: inside Instagram, TikTok, Facebook... links without an 18+ warning get a page
  // with an "Open in browser" button. Links with a warning show the warning here instead, and
  // its confirm button opens the destination in the default browser (see the warning page).
  if (link.openInBrowser && !link.adultWarning && !confirmed && !escaped && detectInAppBrowser(headers.get("user-agent") ?? "")) {
    if (!pastLanding) log(["hit"]);
    return new Response(null, { status: 302, headers: { ...NO_STORE, Location: `/l/${slug}/open` } });
  }

  if (link.adultWarning && !confirmed) {
    if (!escaped && !pastLanding) log(["hit"]); // a visit; the warning page records its own "view"
    return new Response(null, { status: 302, headers: { ...NO_STORE, Location: `/l/${slug}/warning` } });
  }

  log(link.adultWarning ? ["confirm", "redirect"] : escaped || pastLanding ? ["redirect"] : ["hit", "redirect"]);
  return new Response(null, { status: 302, headers: { ...NO_STORE, Location: link.destinationUrl } });
}
