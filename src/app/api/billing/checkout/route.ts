import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/config/brand";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { getStripe, priceIdFor, stripeConfigured, type Interval } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Billing isn't set up yet. Add Stripe test keys to .env." }, { status: 503 });
  if ((await getPlan(userId)) === "PRO") return NextResponse.json({ error: "You're already on Pro." }, { status: 409 });

  const body = (await request.json().catch(() => ({}))) as { interval?: string };
  const interval: Interval = body.interval === "year" ? "year" : "month";
  const stripe = getStripe();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, stripeCustomerId: true } });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId } });
    customerId = customer.id;
    await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceIdFor(interval), quantity: 1 }],
    subscription_data: { metadata: { userId, plan: "pro" } },
    allow_promotion_codes: true,
    success_url: `${appUrl}/dashboard/billing?checkout=success`,
    cancel_url: `${appUrl}/dashboard/billing?checkout=canceled`,
  });
  return NextResponse.json({ url: session.url });
}
