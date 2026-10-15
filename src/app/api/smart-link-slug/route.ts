import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { smartLinkSlugSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ available: false, error: "Not signed in" }, { status: 401 });
  const parsed = smartLinkSlugSchema.safeParse(request.nextUrl.searchParams.get("s") ?? "");
  if (!parsed.success) return NextResponse.json({ available: false, error: parsed.error.issues[0].message });
  const owner = request.nextUrl.searchParams.get("id");
  const existing = await db.smartLink.findUnique({ where: { slug: parsed.data }, select: { id: true } });
  const available = !existing || existing.id === owner;
  return NextResponse.json({ available, slug: parsed.data, error: available ? undefined : "That link name is taken" }, { headers: { "Cache-Control": "no-store" } });
}
