import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { invalidatePageFromRoute } from "@/lib/pages";
import { invalidateUserSmartLinksFromRoute } from "@/lib/smart-links";
import { isProPrice } from "@/lib/stripe";

/** Finds our user for a Stripe subscription: metadata first, then the customer id. */
async function userIdFor(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.userId;
  if (fromMeta && (await db.user.findUnique({ where: { id: fromMeta }, select: { id: true } }))) return fromMeta;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = await db.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  return user?.id ?? null;
}

/** Mirrors a Stripe subscription into our Subscription row and refreshes the public page. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<{ userId: string; plan: "FREE" | "PRO" } | null> {
  const userId = await userIdFor(sub);
  if (!userId) {
    console.warn(`[billing] no user for subscription ${sub.id}`);
    return null;
  }
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  const isPro = isProPrice(priceId) || sub.metadata?.plan === "pro";
  const plan = isPro && sub.status !== "canceled" && sub.status !== "incomplete_expired" ? "PRO" : "FREE";
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Prepaid Pro (paid in crypto) still running: an inactive card subscription mustn't end it.
  const current = await db.subscription.findUnique({ where: { userId }, select: { status: true, currentPeriodEnd: true } });
  if (plan === "FREE" && current?.status === "prepaid" && current.currentPeriodEnd && current.currentPeriodEnd > new Date()) {
    await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    return { userId, plan: "PRO" };
  }

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } }),
    db.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        status: sub.status,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
      update: {
        plan,
        status: sub.status,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    }),
  ]);
  await invalidatePageFromRoute({ userId });
  await invalidateUserSmartLinksFromRoute(userId);
  return { userId, plan };
}
