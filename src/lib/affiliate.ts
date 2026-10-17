import "server-only";
import { cookies } from "next/headers";
import type Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { availableAt, commissionCents, levelFor, normalizeCode, REF_COOKIE } from "@/lib/affiliate-rules";

// Affiliate program data (rules in affiliate-rules.ts).

/** The user's affiliate code, created on first use from their first page name (or at random). */
export async function ensureAffiliateCode(userId: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { affiliateCode: true, pages: { select: { username: true }, orderBy: { createdAt: "asc" }, take: 1 } } });
  if (user.affiliateCode) return user.affiliateCode;
  const base = normalizeCode((user.pages[0]?.username ?? "").replace(/[^a-z0-9_-]/gi, "").slice(0, 16)) ?? "tendril";
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = attempt === 0 && base !== "tendril" ? base : `${base.slice(0, 14)}${Math.random().toString(36).slice(2, 6)}`;
    try {
      await db.user.update({ where: { id: userId }, data: { affiliateCode: code } });
      return code;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  throw new Error("Couldn't create an affiliate code");
}

/**
 * Credits a new user to whoever's /join/<code> link they arrived through (the referral cookie).
 * Only once, never to themselves. Call from server actions right after sign-up / first page.
 */
export async function attributeReferral(userId: string) {
  const code = (await cookies()).get(REF_COOKIE)?.value;
  if (!code) return;
  const [user, affiliate] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { referredById: true } }),
    db.user.findUnique({ where: { affiliateCode: code }, select: { id: true } }),
  ]);
  if (!user || user.referredById || !affiliate || affiliate.id === userId) return;
  await db.user.update({ where: { id: userId }, data: { referredById: affiliate.id, referredAt: new Date() } });
}

/** From the Stripe webhook: a paid invoice earns the referrer a commission at their current level. */
export async function recordCommission(invoice: Stripe.Invoice) {
  const paid = invoice.amount_paid ?? 0;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!invoice.id || paid <= 0 || !customerId) return;
  const user = await db.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true, referredById: true } });
  if (!user?.referredById) return;
  const earlier = await db.affiliateCommission.findMany({ where: { affiliateId: user.referredById }, distinct: ["referredUserId"], select: { referredUserId: true } });
  const paying = new Set(earlier.map((c) => c.referredUserId)).add(user.id).size;
  const { level } = levelFor(paying);
  const paidAt = invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : new Date();
  try {
    await db.affiliateCommission.create({
      data: {
        affiliateId: user.referredById,
        referredUserId: user.id,
        invoiceId: invoice.id,
        paidCents: paid,
        rate: level.rate,
        amountCents: commissionCents(paid, level.rate),
        availableAt: availableAt(paidAt),
      },
    });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e; // already recorded
  }
}

/** Everything the Affiliate page shows. */
export async function getAffiliateOverview(userId: string) {
  const code = await ensureAffiliateCode(userId);
  const now = new Date();
  const [user, clicks, referrals, commissions, payouts] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { payoutEmail: true } }),
    db.affiliateClick.count({ where: { affiliateId: userId } }),
    db.user.findMany({
      where: { referredById: userId },
      orderBy: { referredAt: "desc" },
      select: { id: true, email: true, referredAt: true, createdAt: true, subscription: { select: { plan: true, status: true } } },
    }),
    db.affiliateCommission.findMany({ where: { affiliateId: userId }, select: { referredUserId: true, paidCents: true, amountCents: true, availableAt: true, payoutId: true, payout: { select: { status: true } } } }),
    db.payoutRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, amountCents: true, email: true, status: true, createdAt: true, paidAt: true } }),
  ]);

  const sum = (rows: { amountCents: number }[]) => rows.reduce((n, r) => n + r.amountCents, 0);
  const payingIds = new Set(commissions.map((c) => c.referredUserId));
  const perReferral = new Map<string, { paid: number; earned: number }>();
  for (const c of commissions) {
    const r = perReferral.get(c.referredUserId) ?? { paid: 0, earned: 0 };
    r.paid += c.paidCents;
    r.earned += c.amountCents;
    perReferral.set(c.referredUserId, r);
  }
  return {
    code,
    payoutEmail: user.payoutEmail,
    funnel: { clicks, signups: referrals.length, customers: payingIds.size },
    ...levelFor(payingIds.size),
    balances: {
      pending: sum(commissions.filter((c) => !c.payoutId && c.availableAt > now)),
      available: sum(commissions.filter((c) => !c.payoutId && c.availableAt <= now)),
      requested: sum(commissions.filter((c) => c.payout?.status === "requested")),
      paidOut: sum(commissions.filter((c) => c.payout?.status === "paid")),
      lifetime: sum(commissions),
    },
    referrals: referrals.map((r) => ({
      id: r.id,
      email: r.email,
      joined: r.referredAt ?? r.createdAt,
      plan: r.subscription?.plan === "PRO" && ["active", "trialing", "past_due"].includes(r.subscription.status) ? "Pro" : "Free",
      paidCents: perReferral.get(r.id)?.paid ?? 0,
      earnedCents: perReferral.get(r.id)?.earned ?? 0,
    })),
    payouts,
  };
}
