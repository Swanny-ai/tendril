import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apexOfWww, normalizeHostname } from "@/lib/domain-names";
import { getVerifiedDomain } from "@/lib/domains";

// Used by the proxy (which can't reach the database) to serve a custom domain's home page:
// returns the domain's root smart link if it has one, else the owner's main bio page username.
export async function GET(request: NextRequest) {
  const host = normalizeHostname(request.nextUrl.searchParams.get("host") ?? "");
  const domain = host ? await getVerifiedDomain(host) : null;
  if (!domain) {
    // www.example.com isn't connected itself but example.com is: send visitors there.
    const apex = host ? apexOfWww(host) : null;
    if (apex && (await getVerifiedDomain(apex))) {
      return Response.json({ connected: true, redirectTo: apex }, { headers: { "Cache-Control": "public, max-age=60" } });
    }
    return Response.json({ connected: false }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const root = await db.smartLink.findFirst({ where: { domainId: domain.id, atRoot: true, enabled: true }, select: { slug: true } });
  const page = root ? null : await db.page.findFirst({ where: { userId: domain.userId, published: true }, orderBy: { createdAt: "asc" }, select: { username: true } });
  return Response.json({ connected: true, rootSlug: root?.slug ?? null, username: page?.username ?? null }, { headers: { "Cache-Control": "public, max-age=60" } });
}
