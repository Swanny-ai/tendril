import { NextResponse } from "next/server";
import { appUrl } from "@/config/brand";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export async function POST() {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  const user = await db.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });
  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/dashboard/billing`,
  });
  return NextResponse.json({ url: session.url });
}
