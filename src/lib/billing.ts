import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { invalidatePageFromRoute } from "@/lib/pages";
import { invalidateUserSmartLinksFromRoute } from "@/lib/smart-links";
import { isProPrice } from "@/lib/stripe";
import { creditReferral } from "@/lib/affiliate";
import { planForPaddlePrice } from "@/lib/paddle";
import type { PlanName } from "@/lib/plan-rules";

/** Finds our user for a Stripe subscription: metadata first, then the customer id. */
async function userIdFor(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.userId;
  if (fromMeta && (await db.user.findUnique({ where: { id: fromMeta }, select: { id: true } }))) return fromMeta;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const user = await db.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  return user?.id ?? null;
}

/** Mirrors a Stripe subscription into our Subscription row and refreshes the public page. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<{ userId: string; plan: PlanName } | null> {
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
  const current = await db.subscription.findUnique({ where: { userId }, select: { plan: true, status: true, currentPeriodEnd: true } });
  if (plan === "FREE" && current?.status === "prepaid" && current.currentPeriodEnd && current.currentPeriodEnd > new Date()) {
    await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    return { userId, plan: current.plan };
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

// ---------- Paddle ----------

/** The parts of a Paddle subscription (webhook `data`) we use. */
export type PaddleSubscription = {
  id: string;
  status: string; // active | trialing | past_due | paused | canceled
  customer_id: string;
  custom_data?: { userId?: string } | null;
  items?: { price?: { id?: string } | null }[];
  current_billing_period?: { ends_at?: string } | null;
  scheduled_change?: { action?: string } | null;
};

async function paddleUserId(customData: { userId?: string } | null | undefined, customerId: string | null | undefined): Promise<string | null> {
  const fromData = customData?.userId;
  if (fromData && (await db.user.findUnique({ where: { id: fromData }, select: { id: true } }))) return fromData;
  if (!customerId) return null;
  return (await db.user.findUnique({ where: { paddleCustomerId: customerId }, select: { id: true } }))?.id ?? null;
}

/** Mirrors a Paddle subscription into our Subscription row and refreshes the public pages. */
export async function syncPaddleSubscription(sub: PaddleSubscription): Promise<{ userId: string; plan: PlanName } | null> {
  const userId = await paddleUserId(sub.custom_data, sub.customer_id);
  if (!userId) {
    console.warn(`[billing] no user for Paddle subscription ${sub.id}`);
    return null;
  }
  const priceId = sub.items?.[0]?.price?.id ?? null;
  // Paddle's active/trialing/past_due mean the same as Stripe's, so planFromSubscription works as is.
  const paid = planForPaddlePrice(priceId);
  const plan: PlanName = paid && ["active", "trialing", "past_due"].includes(sub.status) ? paid : "FREE";

  // A prepaid plan (paid in crypto) still running: an inactive card subscription mustn't end it.
  const current = await db.subscription.findUnique({ where: { userId }, select: { plan: true, status: true, currentPeriodEnd: true } });
  if (plan === "FREE" && current?.status === "prepaid" && current.currentPeriodEnd && current.currentPeriodEnd > new Date()) {
    await db.user.update({ where: { id: userId }, data: { paddleCustomerId: sub.customer_id } });
    return { userId, plan: current.plan };
  }

  const row = {
    plan,
    status: sub.status,
    paddleSubscriptionId: sub.id,
    paddlePriceId: priceId,
    currentPeriodEnd: sub.current_billing_period?.ends_at ? new Date(sub.current_billing_period.ends_at) : null,
    cancelAtPeriodEnd: sub.scheduled_change?.action === "cancel",
  } as const;
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { paddleCustomerId: sub.customer_id } }),
    db.subscription.upsert({ where: { userId }, create: { userId, ...row }, update: row }),
  ]);
  await invalidatePageFromRoute({ userId });
  await invalidateUserSmartLinksFromRoute(userId);
  return { userId, plan };
}

/** The parts of a Paddle transaction (transaction.completed) we use. */
export type PaddleTransaction = {
  id: string;
  customer_id?: string | null;
  currency_code?: string;
  custom_data?: { userId?: string } | null;
  billed_at?: string | null;
  details?: { totals?: { grand_total?: string } | null; payout_totals?: { grand_total?: string; currency_code?: string } | null } | null;
};

/** A completed Paddle payment earns the referrer a commission (affiliate program), in US cents. */
export async function creditPaddleTransaction(tx: PaddleTransaction) {
  const userId = await paddleUserId(tx.custom_data, tx.customer_id);
  if (!userId) return;
  const cents =
    tx.currency_code === "USD"
      ? Number(tx.details?.totals?.grand_total ?? 0)
      : tx.details?.payout_totals?.currency_code === "USD"
        ? Number(tx.details.payout_totals.grand_total ?? 0)
        : 0;
  if (cents > 0) await creditReferral(userId, Math.round(cents), tx.id, tx.billed_at ? new Date(tx.billed_at) : new Date());
}
