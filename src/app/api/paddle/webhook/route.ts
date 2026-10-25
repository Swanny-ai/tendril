import { NextResponse, type NextRequest } from "next/server";
import { creditPaddleTransaction, syncPaddleSubscription, type PaddleSubscription, type PaddleTransaction } from "@/lib/billing";
import { db } from "@/lib/db";
import { verifyPaddleSignature } from "@/lib/paddle-sig";
import { Prisma } from "@/generated/prisma/client";

// Paddle notifications (Developer tools → Notifications → destination URL https://<site>/api/paddle/webhook).
// Signed with the destination's secret key (PADDLE_WEBHOOK_SECRET); anything else is rejected.

type PaddleEvent = { event_id: string; event_type: string; data: unknown };

export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const raw = await request.text(); // the raw body is what Paddle signed
  if (!verifyPaddleSignature(raw, request.headers.get("paddle-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: PaddleEvent;
  try {
    event = JSON.parse(raw) as PaddleEvent;
  } catch {
    return NextResponse.json({ error: "Bad body" }, { status: 400 });
  }
  const isSub = event.event_type.startsWith("subscription.");
  if (!isSub && event.event_type !== "transaction.completed") return NextResponse.json({ received: true, ignored: true });

  // Paddle retries deliveries, so each event is processed once (same table as Stripe events).
  try {
    await db.stripeEvent.create({ data: { id: `paddle:${event.event_id}`, type: event.event_type } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ received: true, duplicate: true });
    throw e;
  }

  try {
    if (isSub) await syncPaddleSubscription(event.data as PaddleSubscription);
    else await creditPaddleTransaction(event.data as PaddleTransaction);
  } catch (e) {
    await db.stripeEvent.delete({ where: { id: `paddle:${event.event_id}` } }).catch(() => {});
    console.error("[paddle] webhook handling failed", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
