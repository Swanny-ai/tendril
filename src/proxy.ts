import { NextResponse, type NextRequest } from "next/server";
import { loadRedirectTarget } from "@/lib/pages";
import { loadSmartLink } from "@/lib/smart-links";

// Warning pages render per request and stream, so a missing link would otherwise
// be sent as a 200 "not found" page. Checking here returns a real 404 status first.
// The proxy cannot use "use cache", so it calls the uncached loaders (one indexed query).

function notFound() {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Link not available</title>` +
      `<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#fbf8f2;color:#1c1a24">` +
      `<div style="text-align:center"><h1>This link isn't available</h1><p>It may have been removed or turned off.</p></div>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

export async function proxy(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);

  if (parts[0] === "l" && parts.length === 3) {
    const link = await loadSmartLink(parts[1]);
    if (!link) return notFound();
    if (parts[2] === "warning" && !link.adultWarning) return notFound();
    return NextResponse.next();
  }

  if (parts[0] === "go" && parts.length === 3 && parts[2] === "warning") {
    const target = await loadRedirectTarget(parts[1]);
    if (!target || !target.contentWarning) return notFound();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/l/:slug/warning", "/l/:slug/left", "/go/:blockId/warning"],
};
