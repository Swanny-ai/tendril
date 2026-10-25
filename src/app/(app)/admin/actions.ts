"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { wwwOf } from "@/lib/domain-names";
import { removeHostedDomain } from "@/lib/domains";
import { expireUsername, invalidatePageFromAction, invalidatePageFromRoute } from "@/lib/pages";
import { extendPrepaid, PLAN_LABEL, type PaidPlan } from "@/lib/plan-rules";
import { invalidateSmartLinkFromAction, invalidateUserSmartLinksFromRoute, smartLinkTag } from "@/lib/smart-links";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { cancelPaddleSubscription, paddleConfigured } from "@/lib/paddle";

// Every admin action checks the admin again (actions are public endpoints) and refreshes /admin.

export type AdminResult = { ok?: string; error?: string };

const id = (form: FormData, key = "id") => String(form.get(key) ?? "");

async function done(message: string): Promise<AdminResult> {
  revalidatePath("/admin", "layout");
  return { ok: message };
}

// ---------- Users ----------

/**
 * Pro or Business for a month or a year (added on top of time left on the same plan), with no end,
 * or back to Free.
 */
export async function setPlanAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const userId = id(form);
  const mode = id(form, "mode");
  const plan: PaidPlan = id(form, "plan") === "BUSINESS" ? "BUSINESS" : "PRO";
  const label = PLAN_LABEL[plan];
  const sub = await db.subscription.findUnique({ where: { userId } });
  if ((sub?.stripeSubscriptionId || sub?.paddleSubscriptionId) && ["active", "trialing", "past_due"].includes(sub.status)) {
    const where = sub.paddleSubscriptionId ? "Paddle" : "Stripe";
    return { error: `This account pays by card through ${where}. Change or cancel it in the ${where} dashboard.` };
  }
  if ((mode === "month" || mode === "year") && sub?.plan === plan && sub.status === "active") {
    return { error: `This account already has ${label} with no end date.` };
  }
  const data =
    mode === "free"
      ? { plan: "FREE" as const, status: "canceled", currentPeriodEnd: null }
      : mode === "forever"
        ? { plan, status: "active", currentPeriodEnd: null }
        : mode === "month" || mode === "year"
          ? {
              plan,
              status: "prepaid",
              currentPeriodEnd: extendPrepaid(sub?.plan === plan && sub.status === "prepaid" ? sub.currentPeriodEnd : null, mode),
            }
          : null;
  if (!data) return { error: "Unknown plan." };
  await db.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: { ...data, cancelAtPeriodEnd: false } });
  // What the public pages and links may show depends on the plan.
  await invalidatePageFromRoute({ userId });
  await invalidateUserSmartLinksFromRoute(userId);
  return done(mode === "free" ? "Moved to Free." : mode === "forever" ? `${label} with no end date.` : `${label} for one more ${mode}.`);
}

export async function verifyEmailAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  await db.user.update({ where: { id: id(form) }, data: { emailVerified: new Date() } });
  return done("Email marked as confirmed.");
}

/** Signs the account out on every device (sessions are JWTs carrying sessionVersion). */
export async function signOutUserAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  await db.user.update({ where: { id: id(form) }, data: { sessionVersion: { increment: 1 } } });
  return done("Signed out everywhere.");
}

/** Takes everything the account published offline and signs it out. Nothing is deleted. */
export async function suspendUserAction(form: FormData): Promise<AdminResult> {
  const { userId: me } = await requireAdmin();
  const userId = id(form);
  if (userId === me) return { error: "That's your own account." };
  await db.$transaction([
    db.page.updateMany({ where: { userId }, data: { published: false } }),
    db.smartLink.updateMany({ where: { userId }, data: { enabled: false } }),
    db.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } }),
  ]);
  await invalidatePageFromRoute({ userId });
  await invalidateUserSmartLinksFromRoute(userId);
  return done("All pages and links are off, and the account is signed out.");
}

export async function deleteUserAction(form: FormData): Promise<AdminResult> {
  const { userId: me } = await requireAdmin();
  const userId = id(form);
  if (userId === me) return { error: "You can't delete your own account here." };
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, pages: { select: { id: true, username: true } }, smartLinks: { select: { slug: true } }, subscription: true },
  });
  if (!user) return done("Already deleted.");
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== user.email.toLowerCase()) return { error: "Type the account's email to confirm." };

  const subId = user.subscription?.stripeSubscriptionId;
  if (subId && user.subscription?.status !== "canceled") {
    if (!stripeConfigured()) return { error: "Stripe isn't configured here, so the card subscription can't be canceled first." };
    try {
      await getStripe().subscriptions.cancel(subId);
    } catch (e) {
      console.error("[admin] subscription cancel failed", e);
      return { error: "Stripe couldn't cancel the subscription. Nothing was deleted." };
    }
  }
  const paddleSubId = user.subscription?.paddleSubscriptionId;
  if (paddleSubId && user.subscription?.status !== "canceled") {
    if (!paddleConfigured()) return { error: "Paddle isn't configured here, so the card subscription can't be canceled first." };
    try {
      await cancelPaddleSubscription(paddleSubId);
    } catch (e) {
      console.error("[admin] Paddle cancel failed", e);
      return { error: "Paddle couldn't cancel the subscription. Nothing was deleted." };
    }
  }
  const pageIds = user.pages.map((p) => p.id);
  await db.$transaction([
    db.pageView.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.warningView.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.dailyStat.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.media.deleteMany({ where: { pageId: { in: [...pageIds, userId] } } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  for (const p of user.pages) expireUsername(p.username);
  for (const l of user.smartLinks) revalidateTag(smartLinkTag(l.slug), { expire: 0 });
  return done(`${user.email} was deleted.`);
}

// ---------- Bio pages ----------

export async function togglePagePublishedAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const page = await db.page.findUnique({ where: { id: id(form) }, select: { id: true, published: true } });
  if (!page) return { error: "That page no longer exists." };
  await db.page.update({ where: { id: page.id }, data: { published: !page.published } });
  await invalidatePageFromAction(page.id);
  return done(page.published ? "Page taken offline." : "Page is live again.");
}

/** The owner's verified badge: kept whatever the plan. */
export async function togglePageVerifiedAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const page = await db.page.findUnique({ where: { id: id(form) }, select: { id: true, verifiedAt: true } });
  if (!page) return { error: "That page no longer exists." };
  await db.page.update({ where: { id: page.id }, data: { verifiedAt: page.verifiedAt ? null : new Date() } });
  await invalidatePageFromAction(page.id);
  return done(page.verifiedAt ? "Verified badge removed." : "Verified badge given.");
}

export async function deletePageAdminAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const page = await db.page.findUnique({ where: { id: id(form) }, select: { id: true, username: true } });
  if (!page) return done("Already deleted.");
  await invalidatePageFromAction(page.id);
  await db.$transaction([
    db.pageView.deleteMany({ where: { pageId: page.id } }),
    db.warningView.deleteMany({ where: { pageId: page.id } }),
    db.dailyStat.deleteMany({ where: { pageId: page.id } }),
    db.media.deleteMany({ where: { pageId: page.id } }),
    db.page.delete({ where: { id: page.id } }),
  ]);
  expireUsername(page.username);
  return done(`/${page.username} was deleted.`);
}

// ---------- Links ----------

export async function toggleLinkAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const link = await db.smartLink.findUnique({ where: { id: id(form) }, select: { id: true, slug: true, enabled: true } });
  if (!link) return { error: "That link no longer exists." };
  await db.smartLink.update({ where: { id: link.id }, data: { enabled: !link.enabled } });
  invalidateSmartLinkFromAction(link.slug);
  return done(link.enabled ? `${link.slug} turned off.` : `${link.slug} turned on.`);
}

export async function deleteLinkAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const link = await db.smartLink.findUnique({ where: { id: id(form) }, select: { id: true, slug: true } });
  if (!link) return done("Already deleted.");
  await db.smartLink.delete({ where: { id: link.id } });
  invalidateSmartLinkFromAction(link.slug);
  return done(`${link.slug} was deleted.`);
}

// ---------- Reports ----------

export async function dismissReportAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  await db.linkReport.deleteMany({ where: { id: id(form) } });
  return done("Report dismissed.");
}

/** Turns the reported link off and clears its reports. */
export async function takeDownReportedLinkAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const link = await db.smartLink.findUnique({ where: { id: id(form) }, select: { id: true, slug: true } });
  if (!link) return { error: "That link no longer exists." };
  await db.$transaction([db.smartLink.update({ where: { id: link.id }, data: { enabled: false } }), db.linkReport.deleteMany({ where: { linkId: link.id } })]);
  invalidateSmartLinkFromAction(link.slug);
  return done(`${link.slug} is off and its reports are cleared.`);
}

// ---------- Domains ----------

export async function deleteDomainAdminAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const domainId = id(form);
  const domain = await db.domain.findUnique({ where: { id: domainId }, include: { smartLinks: { select: { slug: true } } } });
  if (!domain) return done("Already removed.");
  const www = wwwOf(domain.hostname);
  const keep = www && (await db.domain.findUnique({ where: { hostname: www }, select: { id: true } })) ? [www] : [];
  const hosted = await removeHostedDomain(domain.hostname, keep);
  if (hosted === "error") return { error: "Couldn't remove the domain from the hosting right now. Please try again." };
  await db.smartLink.updateMany({ where: { domainId }, data: { atRoot: false } });
  const pages = await db.page.findMany({ where: { domainId }, select: { id: true } });
  await db.page.updateMany({ where: { domainId }, data: { atRoot: false } });
  await db.domain.delete({ where: { id: domainId } });
  for (const l of domain.smartLinks) invalidateSmartLinkFromAction(l.slug);
  for (const p of pages) await invalidatePageFromAction(p.id);
  return done(hosted === "manual" ? `${domain.hostname} removed. Remove it from the hosting dashboard too.` : `${domain.hostname} removed everywhere.`);
}

// ---------- Affiliates ----------

/** After you've sent the money (PayPal / Wise). */
export async function markPayoutPaidAction(form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const { count } = await db.payoutRequest.updateMany({ where: { id: id(form), status: "requested" }, data: { status: "paid", paidAt: new Date() } });
  return count ? done("Payout marked as paid.") : { error: "That payout isn't open anymore." };
}
