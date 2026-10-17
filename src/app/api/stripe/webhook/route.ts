import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { recordCommission } from "@/lib/affiliate";
import { syncSubscription } from "@/lib/billing";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { Prisma } from "@/generated/prisma/client";

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.paid",
]);

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const payload = await request.text(); // raw body is required for signature verification
  let event: Stripe.Event;
  try {
    event = getWebhookVerifier().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true, ignored: true });

  // Idempotency: Stripe retries deliveries, so each event is processed once.
  try {
    await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ received: true, duplicate: true });
    throw e;
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const sub = typeof session.subscription === "string" ? await getStripe().subscriptions.retrieve(session.subscription) : session.subscription;
          await syncSubscription(sub);
        }
        break;
      }
      case "invoice.paid":
        await recordCommission(event.data.object); // affiliate program
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subId = invoice.parent?.subscription_details?.subscription;
        if (subId) await syncSubscription(typeof subId === "string" ? await getStripe().subscriptions.retrieve(subId) : subId);
        break;
      }
    }
  } catch (e) {
    // Let Stripe retry: forget the event so the retry is processed.
    await db.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    console.error("[stripe] webhook handling failed", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

// Signature verification is done locally and doesn't need a real API key.
let verifier: Stripe | null = null;
function getWebhookVerifier(): Stripe {
  if (process.env.STRIPE_SECRET_KEY) return getStripe();
  verifier ??= new Stripe("sk_test_signature_verification_only");
  return verifier;
}
