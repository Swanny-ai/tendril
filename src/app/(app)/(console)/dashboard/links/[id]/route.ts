import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editLinkPath } from "@/lib/edit-paths";

// Deep links are edited at /edit/<their link>; this old address redirects there.
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", request.url));
  const { id } = await ctx.params;
  const link = await db.smartLink.findFirst({ where: { id, userId: session.user.id }, include: { domain: { select: { hostname: true } } } });
  return NextResponse.redirect(new URL(link ? editLinkPath(link, link.domain) : "/dashboard/links", request.url));
}
