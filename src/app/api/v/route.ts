import { after, type NextRequest } from "next/server";
import { recordPageView } from "@/lib/analytics/record";
import { clientIp } from "@/lib/analytics/visitor";
import { rateLimit } from "@/lib/rate-limit";

const ID = /^[a-z0-9]{10,40}$/i;
const NO_CONTENT = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

function track(request: NextRequest, pageId: unknown, referrer: unknown) {
  if (typeof pageId !== "string" || !ID.test(pageId)) return;
  const headers = new Headers(request.headers);
  if (!rateLimit(`view:${clientIp(headers)}:${pageId}`, 20, 60_000)) return;
  const ref = typeof referrer === "string" ? referrer.slice(0, 2048) : null;
  after(() => recordPageView({ headers }, pageId, ref).catch((e) => console.error("view log failed", e)));
}

// sendBeacon / fetch from the public page
export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    if (text.length > 4096) return NO_CONTENT();
    const body = JSON.parse(text) as { p?: unknown; r?: unknown };
    track(request, body.p, body.r);
  } catch {
    /* ignore malformed beacons */
  }
  return NO_CONTENT();
}

// <noscript> image fallback
export async function GET(request: NextRequest) {
  track(request, request.nextUrl.searchParams.get("p"), request.headers.get("referer"));
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  return new Response(gif, { status: 200, headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}
