import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apexOfWww, normalizeHostname } from "@/lib/domain-names";
import { getVerifiedDomain } from "@/lib/domains";

// Used by the proxy (which can't reach the database) to serve a custom domain:
//  - without ?path: what the domain's home page shows (a Root deep link or a Root bio page);
//  - with ?path=x: whether x is a bio page assigned to this domain (else it's a deep link).
// A domain only shows what the creator assigned to it; it never falls back to their bio page.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const host = normalizeHostname(q.get("host") ?? "");
  const domain = host ? await getVerifiedDomain(host) : null;
  const cache = { "Cache-Control": "public, max-age=30" };
  if (!domain) {
    // www.example.com isn't connected itself but example.com is: send visitors there.
    const apex = host ? apexOfWww(host) : null;
    if (apex && (await getVerifiedDomain(apex))) return Response.json({ connected: true, redirectTo: apex }, { headers: cache });
    return Response.json({ connected: false }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const path = q.get("path");
  if (path) {
    const page = await db.page.findFirst({ where: { domainId: domain.id, username: path.toLowerCase(), published: true }, select: { username: true } });
    return Response.json({ connected: true, pageUsername: page?.username ?? null }, { headers: cache });
  }
  const root = await db.smartLink.findFirst({ where: { domainId: domain.id, atRoot: true, enabled: true }, select: { slug: true } });
  const rootPage = root ? null : await db.page.findFirst({ where: { domainId: domain.id, atRoot: true, published: true }, select: { username: true } });
  return Response.json({ connected: true, rootSlug: root?.slug ?? null, username: rootPage?.username ?? null }, { headers: cache });
}
