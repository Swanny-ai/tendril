"use server";

import { signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { expireUsername } from "@/lib/pages";
import { smartLinkTag } from "@/lib/smart-links";
import { revalidateTag } from "next/cache";
import { requireUserId } from "@/lib/session";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export type SettingsState = { ok?: boolean; error?: string } | undefined;

export async function deleteAccountAction(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const userId = await requireUserId();
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { pages: { select: { username: true }, orderBy: { createdAt: "asc" } }, subscription: { select: { stripeSubscriptionId: true, status: true } } },
  });
  const expected = user.pages[0]?.username ?? "delete";
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== expected) {
    return { error: `Type ${expected} to confirm.` };
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

  // Cascades remove the page, blocks, sessions and subscription row. Raw analytics
  // rows reference pageId without a foreign key, so delete them explicitly.
  const pageIds = (await db.page.findMany({ where: { userId }, select: { id: true } })).map((p) => p.id);
  const smartSlugs = (await db.smartLink.findMany({ where: { userId }, select: { slug: true } })).map((l) => l.slug);
  await db.$transaction([
    db.pageView.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.warningView.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.dailyStat.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.media.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  for (const p of user.pages) expireUsername(p.username);
  for (const slug of smartSlugs) revalidateTag(smartLinkTag(slug), { expire: 0 });
  await signOut({ redirectTo: "/?deleted=1" });
  return { ok: true };
}
