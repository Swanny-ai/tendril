import { NextResponse } from "next/server";
import { apiUserId } from "@/lib/session";
import { db } from "@/lib/db";
import { planFromSubscription } from "@/lib/plan-rules";

export async function GET() {
  const userId = await apiUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const sub = await db.subscription.findUnique({ where: { userId }, select: { plan: true, status: true, currentPeriodEnd: true } });
  return NextResponse.json({ plan: planFromSubscription(sub), status: sub?.status ?? null }, { headers: { "Cache-Control": "no-store" } });
}
