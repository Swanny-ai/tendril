import type { NextRequest } from "next/server";
import { openHopLocation } from "@/lib/deeplink";

// One step of the Android "open in browser" chain (see lib/deeplink.ts): Android loads this when
// the browser an intent named isn't installed, and we send the phone on to the next browser's
// intent (Chrome, then Samsung Internet, then the default browser), or back to the page itself
// once all were tried. A server redirect keeps the visitor's original tap behind each attempt.
// Only pages on this same host are accepted, so this can't be used to redirect elsewhere.
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const location = openHopLocation(params.get("u") ?? "", Number(params.get("s")), host);
  if (!location) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
