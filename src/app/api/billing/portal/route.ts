import { NextResponse } from "next/server";
import { appUrl } from "@/config/brand";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { paddleConfigured, paddlePortalUrl } from "@/lib/paddle";
import { getStripe, stripeConfigured } from "@/lib/stripe";

// "Manage subscription": Paddle's customer portal for card plans paid through Paddle, else Stripe's.
export async function POST() {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, paddleCustomerId: true, subscription: { select: { paddleSubscriptionId: true } } },
  });

  if (user?.paddleCustomerId && paddleConfigured()) {
    try {
      return NextResponse.json({ url: await paddlePortalUrl(user.paddleCustomerId, user.subscription?.paddleSubscriptionId) });
    } catch (e) {
      console.error("[billing] Paddle portal failed", e);
      return NextResponse.json({ error: "Couldn't open the billing portal. Please try again." }, { status: 502 });
    }
  }

  if (!stripeConfigured()) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });
  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/dashboard/billing`,
  });
  return NextResponse.json({ url: session.url });
}
