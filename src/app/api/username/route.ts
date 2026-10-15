import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { usernameSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const parsed = usernameSchema.safeParse(request.nextUrl.searchParams.get("u") ?? "");
  if (!parsed.success) {
    return NextResponse.json({ available: false, error: parsed.error.issues[0].message });
  }
  const taken = await db.page.findUnique({ where: { username: parsed.data }, select: { id: true } });
  return NextResponse.json(
    { available: !taken, username: parsed.data, error: taken ? "That name is taken" : undefined },
    { headers: { "Cache-Control": "no-store" } },
  );
}
