import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { expireUsername, invalidatePageFromRoute } from "@/lib/pages";
import { invalidateUserSmartLinksFromRoute } from "@/lib/smart-links";
import { usernameSchema } from "@/lib/validation";

// Operational endpoint: clear a page's cache after changes made outside the app
// (database fixes, seeding). Protected by CRON_SECRET.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { username?: unknown };
  const parsed = usernameSchema.safeParse(body.username);
  if (!parsed.success) return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  expireUsername(parsed.data);
  const found = await invalidatePageFromRoute({ username: parsed.data });
  const owner = await db.page.findUnique({ where: { username: parsed.data }, select: { userId: true } });
  if (owner) await invalidateUserSmartLinksFromRoute(owner.userId);
  return NextResponse.json({ ok: true, found });
}
