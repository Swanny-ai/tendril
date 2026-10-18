import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createCryptoInvoice, cryptoConfigured } from "@/lib/crypto-pay";
import { db } from "@/lib/db";

// Starts a crypto payment for one month or year of Pro and returns the NOWPayments invoice page.
export async function POST(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!cryptoConfigured()) return NextResponse.json({ error: "Crypto payments aren't set up yet." }, { status: 503 });

  // A card subscription already renews Pro; crypto is for prepaid Pro only.
  const sub = await db.subscription.findUnique({ where: { userId }, select: { status: true, stripeSubscriptionId: true } });
  if (sub?.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(sub.status)) {
    return NextResponse.json({ error: "You already have Pro by card. Manage it from the billing page." }, { status: 409 });
  }

  const body = (await request.json().catch(() => ({}))) as { interval?: string };
  try {
    const url = await createCryptoInvoice(userId, body.interval === "year" ? "year" : "month");
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
