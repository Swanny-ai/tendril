import { NextResponse, type NextRequest } from "next/server";
import { apiUserId } from "@/lib/session";
import { CURRENT_PAGE_COOKIE } from "@/lib/current-page";
import { db } from "@/lib/db";

// Opening a page at its /edit/template/... address makes it the page the editor saves to
// (remembered in a cookie, which only a route handler or action can set), then goes back.
export async function GET(request: NextRequest) {
  const viewerId = await apiUserId();
  const next = request.nextUrl.searchParams.get("next") ?? "";
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const safeNext = next.startsWith("/edit/template/") ? next : "/dashboard/templates";
  if (!viewerId) return NextResponse.redirect(new URL("/login", request.url));
  const page = await db.page.findFirst({ where: { id, userId: viewerId }, select: { id: true } });
  if (!page) return NextResponse.redirect(new URL("/dashboard/templates", request.url));
  const res = NextResponse.redirect(new URL(safeNext, request.url));
  res.cookies.set(CURRENT_PAGE_COOKIE, page.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  return res;
}
