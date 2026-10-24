import type { NextRequest } from "next/server";
import { loadRedirectTarget } from "@/lib/pages";
import { db } from "@/lib/db";
import { getSmartLink, loadSmartLink } from "@/lib/smart-links";

// Tells the proxy whether a warning/left page should exist, so it can send a real 404.
// The proxy can't query the database itself: some hosts (Netlify) run it as an edge
// function, where the Postgres driver isn't available. This only reveals what
// /l/<slug> and /go/<id> already reveal publicly.

const SLUG = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const ID = /^[a-z0-9]{10,40}$/;

const reply = (ok: boolean) =>
  new Response(null, { status: ok ? 204 : 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const kind = q.get("kind");
  const id = q.get("id") ?? "";
  const page = q.get("page");

  // <app domain>/<name>: is it a deep link? (cached lookup first: this runs for bio page visits too)
  if (kind === "smart" && page === "route") {
    if (!SLUG.test(id) || !(await getSmartLink(id))) return reply(false);
    // A bio page with the same name (from before links moved here) keeps its address.
    return reply(!(await db.page.findUnique({ where: { username: id }, select: { id: true } })));
  }
  if (kind === "smart" && SLUG.test(id)) {
    const link = await loadSmartLink(id);
    if (!link) return reply(false);
    if (page === "warning") return reply(link.adultWarning);
    if (page === "open") return reply(link.openInBrowser);
    // Which first step a visitor gets on a custom domain (the proxy renders it at the clean address).
    if (page === "entry") {
      return Response.json({ adultWarning: link.adultWarning, openInBrowser: link.openInBrowser }, { headers: { "Cache-Control": "no-store" } });
    }
    return reply(true);
  }
  if (kind === "block" && ID.test(id)) {
    const target = await loadRedirectTarget(id);
    return reply(!!target && target.contentWarning);
  }
  return reply(false);
}
