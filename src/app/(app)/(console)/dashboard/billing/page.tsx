import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireAccount } from "@/lib/session";
import { cryptoConfigured } from "@/lib/crypto-pay";
import { stripeConfigured } from "@/lib/stripe";
import { CheckoutStatus, ManageButton } from "./billing-actions";
import { PlanCards } from "./plan-cards";

export const instant = false;
export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage(props: PageProps<"/dashboard/billing">) {
  const { userId } = await requireAccount();
  const [plan, sub, user, pages, links] = await Promise.all([
    getPlan(userId),
    db.subscription.findUnique({ where: { userId } }),
    db.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } }),
    db.page.count({ where: { userId } }),
    db.smartLink.count({ where: { userId } }),
  ]);
  const { checkout } = await props.searchParams;
  const configured = stripeConfigured();
  const cryptoOn = cryptoConfigured();
  const prepaid = sub?.status === "prepaid";
  const limits = PLAN_LIMITS[plan];
  const date = (d: Date) => d.toLocaleDateString("en-US", { dateStyle: "long" });

  const status =
    plan === "PRO" && prepaid && sub?.currentPeriodEnd
      ? `Pro until ${date(sub.currentPeriodEnd)}, paid with crypto.`
      : plan === "PRO" && sub?.currentPeriodEnd
        ? `${sub.cancelAtPeriodEnd ? "Ends" : "Renews"} on ${date(sub.currentPeriodEnd)}.`
        : plan === "PRO"
          ? "Thanks for supporting ViewLink."
          : "You're on the free plan.";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Pick your plan</h1>
        <p className="mt-1 text-muted-foreground">Start free. Upgrade when you need more. Cancel anytime.</p>
      </div>

      <CheckoutStatus state={typeof checkout === "string" ? checkout : null} plan={plan} />

      {!configured && !cryptoOn ? (
        <p role="note" className="rounded-lg border border-[var(--persimmon)]/40 bg-[var(--persimmon)]/10 px-4 py-3 text-sm">
          Payments aren&apos;t configured on this server. Add Stripe keys or NOWPayments keys to <code>.env</code> (see README) to enable upgrades.
        </p>
      ) : null}

      {/* Where you are now: plan, renewal, usage, and managing the card subscription. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border bg-card px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            Current plan <Badge variant={plan === "PRO" ? "default" : "secondary"}>{plan === "PRO" ? "Pro" : "Free"}</Badge>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {status}
            {sub?.status === "past_due" ? " Your last payment failed. Update your card to keep Pro." : ""}
          </p>
        </div>
        <div className="flex gap-5 text-sm">
          <Usage label="Bio pages" used={pages} max={limits.maxPages} />
          <Usage label="Deep links" used={links} max={limits.maxSmartLinks} />
        </div>
        {user?.stripeCustomerId && configured ? <ManageButton /> : null}
      </div>

      <PlanCards plan={plan} cardPay={configured} cryptoPay={cryptoOn} prepaid={prepaid} />
    </div>
  );
}

function Usage({ label, used, max }: { label: string; used: number; max: number }) {
  return (
    <div className="w-28">
      <p className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {used}/{max}
        </span>
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (used / max) * 100)}%` }} />
      </div>
    </div>
  );
}
