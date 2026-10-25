import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { changePaddlePlan, paddleConfigured, paddlePriceIds } from "@/lib/paddle";
import type { PaidPlan } from "@/lib/plan-rules";

// Switches a card subscription (Paddle) between Pro and Business, or monthly and yearly. Paddle
// charges or credits the difference right away; its webhook then updates the account's plan.
export async function POST(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!paddleConfigured()) return NextResponse.json({ error: "Card payments aren't set up yet." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { plan?: string; interval?: string };
  const plan: PaidPlan = body.plan === "BUSINESS" ? "BUSINESS" : "PRO";
  const interval = body.interval === "year" ? "year" : "month";
  const priceId = paddlePriceIds()[plan][interval];

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
