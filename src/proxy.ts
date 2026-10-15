import { NextResponse, type NextRequest } from "next/server";

// Warning pages render per request and stream, so a missing link would otherwise
// be sent as a 200 "not found" page. Checking here returns a real 404 status first.
// The lookup happens in /api/link-status rather than here, because some hosts
// (Netlify) run the proxy as an edge function, where the Postgres driver can't load.

function notFound() {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Link not available</title>` +
      `<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#fbf8f2;color:#1c1a24">` +
      `<div style="text-align:center"><h1>This link isn't available</h1><p>It may have been removed or turned off.</p></div>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

async function exists(request: NextRequest, kind: "smart" | "block", id: string, page: string) {
  const url = new URL("/api/link-status", request.nextUrl.origin);
  url.search = new URLSearchParams({ kind, id, page }).toString();
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    return res.status !== 404;
  } catch {
    return true; // if the check itself fails, let the page render (it shows its own not-found UI)
  }
}

export async function proxy(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);

  if (parts[0] === "l" && parts.length === 3) {
    if (!(await exists(request, "smart", parts[1], parts[2]))) return notFound();
    return NextResponse.next();
  }

  if (parts[0] === "go" && parts.length === 3 && parts[2] === "warning") {
    if (!(await exists(request, "block", parts[1], "warning"))) return notFound();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/l/:slug/warning", "/l/:slug/left", "/go/:blockId/warning"],
};
