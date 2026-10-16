import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { normalizeHostname } from "@/lib/domain-names";
import { getVerifiedDomain } from "@/lib/domains";

// Used by the proxy (which can't reach the database) to serve a custom domain's home page:
// returns the owner's main bio page username for a connected domain.
export async function GET(request: NextRequest) {
  const host = normalizeHostname(request.nextUrl.searchParams.get("host") ?? "");
  const domain = host ? await getVerifiedDomain(host) : null;
  if (!domain) return Response.json({ connected: false }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const page = await db.page.findFirst({ where: { userId: domain.userId, published: true }, orderBy: { createdAt: "asc" }, select: { username: true } });
  return Response.json({ connected: true, username: page?.username ?? null }, { headers: { "Cache-Control": "public, max-age=60" } });
}
