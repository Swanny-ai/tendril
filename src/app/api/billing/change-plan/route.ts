import { NextResponse, type NextRequest } from "next/server";
import { apiUserId } from "@/lib/session";
import { db } from "@/lib/db";
import { changePaddlePlan, paddleConfigured, paddlePriceIds } from "@/lib/paddle";
import { toPaidPlan } from "@/lib/plan-rules";

// Switches a card subscription (Paddle) between the paid plans, or monthly and yearly. Paddle
// charges or credits the difference right away; its webhook then updates the account's plan.
export async function POST(request: NextRequest) {
  const userId = await apiUserId({ write: true });
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!paddleConfigured()) return NextResponse.json({ error: "Card payments aren't set up yet." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { plan?: string; interval?: string };
  const plan = toPaidPlan(body.plan);
  const interval = body.interval === "year" ? "year" : "month";
  const priceId = paddlePriceIds()[plan][interval];
  if (!priceId) return NextResponse.json({ error: "This plan can't be paid by card yet." }, { status: 409 });

  const sub = await db.subscription.findUnique({ where: { userId }, select: { paddleSubscriptionId: true, paddlePriceId: true, status: true } });
  if (!sub?.paddleSubscriptionId || !["active", "trialing", "past_due"].includes(sub.status)) {
    return NextResponse.json({ error: "You don't have a card plan to change." }, { status: 409 });
  }
  if (sub.paddlePriceId === priceId) return NextResponse.json({ error: "You're already on this plan." }, { status: 409 });

  try {
    await changePaddlePlan(sub.paddleSubscriptionId, priceId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[billing] plan change failed", e);
    return NextResponse.json({ error: "Couldn't change your plan. Please try again." }, { status: 502 });
  }
}
