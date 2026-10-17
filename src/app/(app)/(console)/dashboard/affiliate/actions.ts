"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { formatUsd, MIN_PAYOUT_CENTS, normalizeCode } from "@/lib/affiliate-rules";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { emailSchema } from "@/lib/validation";

export type AffiliateResult = { ok: true; message?: string } | { ok: false; error: string };

/** Change your affiliate code (your old link stops working). */
export async function updateAffiliateCodeAction(input: string): Promise<AffiliateResult> {
  const userId = await requireUserId();
  const code = normalizeCode(input);
  if (!code) return { ok: false, error: "Use 3–20 letters, numbers, dashes or underscores." };
  try {
    await db.user.update({ where: { id: userId }, data: { affiliateCode: code } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "That code is taken. Try another one." };
    throw e;
  }
  revalidatePath("/dashboard/affiliate");
  return { ok: true, message: "Code updated. Share your new link." };
}

/** Where payouts are sent (PayPal or Wise email). */
export async function savePayoutEmailAction(input: string): Promise<AffiliateResult> {
  const userId = await requireUserId();
  const email = emailSchema.safeParse(input);
  if (!email.success) return { ok: false, error: email.error.issues[0].message };
  await db.user.update({ where: { id: userId }, data: { payoutEmail: email.data } });
  revalidatePath("/dashboard/affiliate");
  return { ok: true, message: "Payout email saved." };
}

/** Request a payout of everything available (past the 30-day hold), from $25. */
export async function requestPayoutAction(): Promise<AffiliateResult> {
  const userId = await requireUserId();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { payoutEmail: true } });
  if (!user.payoutEmail) return { ok: false, error: "Add your payout email first." };
  const result = await db.$transaction(async (tx) => {
    const available = await tx.affiliateCommission.findMany({ where: { affiliateId: userId, payoutId: null, availableAt: { lte: new Date() } }, select: { id: true, amountCents: true } });
    const total = available.reduce((n, c) => n + c.amountCents, 0);
    if (total < MIN_PAYOUT_CENTS) return { total, payout: null };
    const payout = await tx.payoutRequest.create({ data: { userId, amountCents: total, email: user.payoutEmail! } });
    await tx.affiliateCommission.updateMany({ where: { id: { in: available.map((c) => c.id) } }, data: { payoutId: payout.id } });
    return { total, payout };
  });
  if (!result.payout) return { ok: false, error: `Payouts start at ${formatUsd(MIN_PAYOUT_CENTS)}. You have ${formatUsd(result.total)} available.` };
  revalidatePath("/dashboard/affiliate");
  return { ok: true, message: `Payout of ${formatUsd(result.total)} requested. It's sent to ${user.payoutEmail} within 7 days.` };
}
