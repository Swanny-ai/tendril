import "server-only";
import { db } from "@/lib/db";
import { invalidatePageFromRoute } from "@/lib/pages";
import { invalidateUserSmartLinksFromRoute } from "@/lib/smart-links";

// Every new account starts on a free trial of Pro. It's stored as a Subscription row with
// status "trial" that ends after TRIAL_DAYS and then falls back to Free on its own (see
// planFromSubscription) — no cron needed. Buying a plan (card or crypto) replaces the trial row.

export const TRIAL_DAYS = 5;

/** Gives a new account its Pro trial. Does nothing if the account already has a subscription. */
export async function startTrial(userId: string): Promise<boolean> {
  const existing = await db.subscription.findUnique({ where: { userId }, select: { userId: true } });
  if (existing) return false;
  const endsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000);
  try {
    await db.subscription.create({ data: { userId, plan: "PRO", status: "trial", currentPeriodEnd: endsAt, cancelAtPeriodEnd: true } });
  } catch {
    return false; // a race (two requests) — the other one made it
  }
  // The account is Pro now, so its pages and links may show Pro features.
  await invalidatePageFromRoute({ userId });
  await invalidateUserSmartLinksFromRoute(userId);
  return true;
}

export type TrialSub = { status: string; currentPeriodEnd: Date | null } | null | undefined;

export type TrialInfo = {
  /** On a trial that's still running. */
  onTrial: boolean;
  /** Days left (rounded up), 0 when none. */
  daysLeft: number;
  endsAt: Date | null;
  /** Had a trial, and it's over (still on Free unless they bought a plan). */
  expired: boolean;
};

export function trialInfo(sub: TrialSub, now: Date = new Date()): TrialInfo {
  if (sub?.status !== "trial" || !sub.currentPeriodEnd) return { onTrial: false, daysLeft: 0, endsAt: null, expired: false };
  const end = sub.currentPeriodEnd;
  const running = end > now;
  return {
    onTrial: running,
    daysLeft: running ? Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86_400_000)) : 0,
    endsAt: end,
    expired: !running,
  };
}
