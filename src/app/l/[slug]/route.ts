import { after, type NextRequest } from "next/server";
import { clientIp } from "@/lib/analytics/visitor";
import { rateLimit } from "@/lib/rate-limit";
import { getSmartLink, recordSmartLinkEvent, type SmartLinkEventKind } from "@/lib/smart-links";

const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "strict-origin-when-cross-origin" };
const SLUG = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

function notFound() {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link not available</title>` +
      `<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#fbf8f2;color:#1c1a24">` +
      `<div style="text-align:center"><h1>This link isn't available</h1><p>It may have been removed or turned off.</p></div>`,
    { status: 404, headers: { ...NO_STORE, "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest, ctx: RouteContext<"/l/[slug]">) {
  const { slug } = await ctx.params;
  if (!SLUG.test(slug)) return notFound();
  const link = await getSmartLink(slug);
  if (!link) return notFound();

  const headers = new Headers(request.headers);
  const confirmed = request.nextUrl.searchParams.get("ok") === "1";
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

  if (link.adultWarning && !confirmed) {
    log(["hit"]); // a visit; the warning page records its own "view"
    return new Response(null, { status: 302, headers: { ...NO_STORE, Location: `/l/${slug}/warning` } });
  }

  log(link.adultWarning ? ["confirm", "redirect"] : ["hit", "redirect"]);
  return new Response(null, { status: 302, headers: { ...NO_STORE, Location: link.destinationUrl } });
}
