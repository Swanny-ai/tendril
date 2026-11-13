import { NextResponse, type NextRequest } from "next/server";
import { apiUserId } from "@/lib/session";
import { getCurrentPage } from "@/lib/current-page";
import { db } from "@/lib/db";
import { editPagePath } from "@/lib/edit-paths";

// The editor lives at /edit/template/<page link>. This old address sends you to the page you
// edited last (a plain redirect, so the browser goes straight there).
export async function GET(request: NextRequest) {
  const viewerId = await apiUserId();
  if (!viewerId) return NextResponse.redirect(new URL("/login", request.url));
  const page = await getCurrentPage(viewerId);
  if (!page) return NextResponse.redirect(new URL("/dashboard/templates", request.url));
  const domain = page.domainId ? await db.domain.findUnique({ where: { id: page.domainId }, select: { hostname: true } }) : null;
  return NextResponse.redirect(new URL(editPagePath(page, domain), request.url));
}
