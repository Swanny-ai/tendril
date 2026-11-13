import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cancelPaddleAtPeriodEnd, paddleConfigured, paddleUpdatePaymentUrl, resumePaddleSubscription } from "@/lib/paddle";
import { apiUserId } from "@/lib/session";

// The billing page's subscription controls for card plans paid through Paddle:
//   { action: "cancel" }  → stops renewing; the plan stays on until the end of the paid period
//   { action: "resume" }  → takes the cancellation back
//   { action: "update-payment" } → a link to Paddle's page for changing the card
// Paddle's webhook then confirms the change; the row is updated here too so the page shows it at once.
export async function POST(request: NextRequest) {
  const userId = await apiUserId({ write: true });
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!paddleConfigured()) return NextResponse.json({ error: "Card payments aren't set up." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const [user, sub] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { paddleCustomerId: true } }),
    db.subscription.findUnique({ where: { userId }, select: { paddleSubscriptionId: true, status: true, cancelAtPeriodEnd: true } }),
  ]);
  const subId = sub?.paddleSubscriptionId;
  if (!subId || !["active", "trialing", "past_due"].includes(sub.status)) {
    return NextResponse.json({ error: "You don't have a card subscription." }, { status: 409 });
  }

  try {
    if (body.action === "cancel") {
      if (sub.cancelAtPeriodEnd) return NextResponse.json({ ok: true });
      await cancelPaddleAtPeriodEnd(subId);
      await db.subscription.update({ where: { userId }, data: { cancelAtPeriodEnd: true } });
      console.info(`[billing] ${userId} cancelled ${subId} at period end`);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "resume") {
      if (!sub.cancelAtPeriodEnd) return NextResponse.json({ ok: true });
      await resumePaddleSubscription(subId);
      await db.subscription.update({ where: { userId }, data: { cancelAtPeriodEnd: false } });
      console.info(`[billing] ${userId} resumed ${subId}`);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "update-payment") {
      if (!user?.paddleCustomerId) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });
      return NextResponse.json({ url: await paddleUpdatePaymentUrl(user.paddleCustomerId, subId) });
    }
  } catch (e) {
    console.error(`[billing] subscription ${body.action} failed`, e);
    return NextResponse.json({ error: "Paddle didn't accept that just now. Please try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
