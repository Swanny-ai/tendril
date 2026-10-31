"use server";

import { signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteAccountAnalytics } from "@/lib/analytics/purge";
import { expireUsername } from "@/lib/pages";
import { smartLinkTag } from "@/lib/smart-links";
import { revalidateTag } from "next/cache";
import { requireUserId } from "@/lib/session";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { cancelPaddleSubscription, paddleConfigured } from "@/lib/paddle";

export type SettingsState = { ok?: boolean; error?: string } | undefined;

export async function deleteAccountAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const userId = await requireUserId();
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, pages: { select: { username: true } }, subscription: { select: { stripeSubscriptionId: true, paddleSubscriptionId: true, status: true } } },
  });
  // Deleting needs the account's email typed out, so it can't happen by accident.
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== user.email.toLowerCase()) {
    return { error: "Type your account's email to confirm." };
  }

  // Stop billing before deleting data.
  const subId = user.subscription?.stripeSubscriptionId;
  if (subId && user.subscription?.status !== "canceled") {
    if (!stripeConfigured()) return { error: "Your subscription can't be canceled right now. Please contact support." };
    try {
      await getStripe().subscriptions.cancel(subId);
    } catch (e) {
      console.error("[settings] subscription cancel failed", e);
      return { error: "We couldn't cancel your subscription. Please try again." };
    }
  }
  const paddleSubId = user.subscription?.paddleSubscriptionId;
  if (paddleSubId && user.subscription?.status !== "canceled") {
    if (!paddleConfigured()) return { error: "Your subscription can't be canceled right now. Please contact support." };
    try {
      await cancelPaddleSubscription(paddleSubId);
    } catch (e) {
      console.error("[settings] Paddle cancel failed", e);
      return { error: "We couldn't cancel your subscription. Please try again." };
    }
  }

  // Cascades remove the pages, blocks, links, sessions and subscription row. Analytics rows have
  // no foreign key (they outlive deleted links), so delete them explicitly.
  const pageIds = (await db.page.findMany({ where: { userId }, select: { id: true } })).map((p) => p.id);
  const smartSlugs = (await db.smartLink.findMany({ where: { userId }, select: { slug: true } })).map((l) => l.slug);
  await deleteAccountAnalytics(userId);
  await db.$transaction([db.media.deleteMany({ where: { pageId: { in: pageIds } } }), db.user.delete({ where: { id: userId } })]);
  for (const p of user.pages) expireUsername(p.username);
  for (const slug of smartSlugs) revalidateTag(smartLinkTag(slug), { expire: 0 });
  await signOut({ redirectTo: "/?deleted=1" });
  return { ok: true };
}
