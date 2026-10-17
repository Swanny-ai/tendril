import { after, type NextRequest } from "next/server";
import { recordClick } from "@/lib/analytics/record";
import { clientIp } from "@/lib/analytics/visitor";
import { getRedirectTarget } from "@/lib/pages";
import { rateLimit } from "@/lib/rate-limit";

const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "strict-origin-when-cross-origin" };

function notFoundResponse() {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link not available</title>` +
      `<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#151515;color:#ffffff">` +
      `<div style="text-align:center"><h1>This link isn't available</h1><p>It may have been removed or turned off.</p><p><a href="/">Go home</a></p></div>`,
    { status: 404, headers: { ...NO_STORE, "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest, ctx: RouteContext<"/go/[blockId]">) {
  const { blockId } = await ctx.params;
  if (!/^[a-z0-9]{10,40}$/i.test(blockId)) return notFoundResponse();

  const target = await getRedirectTarget(blockId);
  if (!target) return notFoundResponse();

  const confirmed = request.nextUrl.searchParams.get("ok") === "1";
  if (target.contentWarning && !confirmed) {
    return new Response(null, { status: 302, headers: { ...NO_STORE, Location: `/go/${blockId}/warning` } });
  }

  // Count the click after responding, so logging never delays the redirect.
  const headers = new Headers(request.headers);
  if (rateLimit(`click:${clientIp(headers)}:${blockId}`, 30, 60_000)) {
    after(() => recordClick({ headers }, target.pageId, target.blockId, target.contentWarning && confirmed).catch((e) => console.error("click log failed", e)));
  }

  return new Response(null, { status: 302, headers: { ...NO_STORE, Location: target.url } });
}
