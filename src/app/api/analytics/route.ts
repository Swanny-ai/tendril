import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getAnalytics, parseRange } from "@/lib/analytics/queries";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const page = await db.page.findUnique({ where: { userId }, select: { id: true } });
  if (!page) return NextResponse.json({ error: "No page" }, { status: 404 });
  const plan = await getPlan(userId);
  const range = parseRange(request.nextUrl.searchParams.get("range"), plan);
  const data = await getAnalytics(page.id, range.days, plan);
  return NextResponse.json({ range: range.key, clamped: range.clamped, plan, ...data }, { headers: { "Cache-Control": "private, no-store" } });
}
