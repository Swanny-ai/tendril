import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentPage } from "@/lib/current-page";
import { db } from "@/lib/db";
import { editPagePath } from "@/lib/edit-paths";

// The editor lives at /edit/template/<page link>. This old address sends you to the page you
// edited last (a plain redirect, so the browser goes straight there).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", request.url));
  const page = await getCurrentPage(session.user.id);
  if (!page) return NextResponse.redirect(new URL("/onboarding", request.url));
  const domain = page.domainId ? await db.domain.findUnique({ where: { id: page.domainId }, select: { hostname: true } }) : null;
  return NextResponse.redirect(new URL(editPagePath(page, domain), request.url));
}
