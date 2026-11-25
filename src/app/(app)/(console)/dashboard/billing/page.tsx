import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { PLAN_LABEL, PLAN_LIMITS, PLAN_PRICES_USD } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireAccount } from "@/lib/session";
import { trialInfo } from "@/lib/trial";
import { stripeConfigured } from "@/lib/stripe";
import { paddleClientConfig, paddlePaymentMethod, planForPaddlePrice } from "@/lib/paddle";
import { CheckoutStatus, ManageButton } from "./billing-actions";
import { PlanCards } from "./plan-cards";
import { SubscriptionPanel } from "./subscription-panel";

export const instant = false;
export const metadata: Metadata = { title: "Pricing" };

export default async function BillingPage(props: PageProps<"/dashboard/billing">) {
  const { userId } = await requireAccount();
  const [plan, sub, user, pages, links, domains] = await Promise.all([
    getPlan(userId),
    db.subscription.findUnique({ where: { userId } }),
    db.user.findUnique({ where: { id: userId }, select: { email: true, stripeCustomerId: true, paddleCustomerId: true } }),
    db.page.count({ where: { userId } }),
    db.smartLink.count({ where: { userId } }),
    db.domain.count({ where: { userId } }),
  ]);
  const { checkout, interval } = await props.searchParams;
  // Card payments: Paddle when it's set up, else Stripe.
  const paddle = paddleClientConfig();
  const stripeOn = stripeConfigured();
  const configured = !!paddle || stripeOn;
  const prepaid = sub?.status === "prepaid";
  const limits = PLAN_LIMITS[plan];
  const date = (d: Date) => d.toLocaleDateString("en-US", { dateStyle: "long" });
  // A running Paddle card plan can switch between the paid plans, monthly and yearly.
  const cardPlan = sub?.paddleSubscriptionId && ["active", "trialing", "past_due"].includes(sub.status) ? planForPaddlePrice(sub.paddlePriceId) : null;
  const cardSub = cardPlan && paddle ? { plan: cardPlan, interval: paddle.prices[cardPlan].year === sub?.paddlePriceId ? ("year" as const) : ("month" as const) } : null;
  // The card it's charged to (from Paddle). The page still loads if Paddle doesn't answer.
  const method =
    cardSub && user?.paddleCustomerId
      ? await paddlePaymentMethod(user.paddleCustomerId, sub?.paddleSubscriptionId ?? null).catch((e) => {
          console.error("[billing] payment method lookup failed", e);
          return null;
        })
      : null;

  const label = PLAN_LABEL[plan];
  const trial = trialInfo(sub);
  const status =
    trial.onTrial && sub?.currentPeriodEnd
      ? `Free Pro trial — ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left (until ${date(sub.currentPeriodEnd)}). Upgrade to keep Pro.`
      : trial.expired
        ? "Your free Pro trial has ended. Pick a plan to turn Pro back on."
        : plan !== "FREE" && prepaid && sub?.currentPeriodEnd
          ? `${label} until ${date(sub.currentPeriodEnd)}.`
          : plan !== "FREE" && sub?.currentPeriodEnd
            ? `${sub.cancelAtPeriodEnd ? "Ends" : "Renews"} on ${date(sub.currentPeriodEnd)}.`
            : plan !== "FREE"
              ? "Thanks for supporting ViewLink."
              : "You're on the free plan.";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Pick your plan</h1>
        <p className="mt-1 text-muted-foreground">Start free. Upgrade when you need more. Cancel anytime.</p>
      </div>

      <CheckoutStatus state={typeof checkout === "string" ? checkout : null} plan={plan} />

      {!configured ? (
        <p role="note" className="rounded-lg border border-[var(--persimmon)]/40 bg-[var(--persimmon)]/10 px-4 py-3 text-sm">
          Payments aren&apos;t configured on this server. Add Paddle or Stripe keys to <code>.env</code> (see README) to enable upgrades.
        </p>
      ) : null}

      {/* Where you are now: plan, renewal, usage, and managing the card subscription. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border bg-card px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            Current plan <Badge variant={plan !== "FREE" ? "default" : "secondary"}>{label}</Badge>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {status}
            {sub?.status === "past_due" ? ` Your last payment failed. Update your card to keep ${label}.` : ""}
          </p>
        </div>
        <div className="flex gap-5 text-sm">
          <Usage label="Bio pages" used={pages} max={limits.maxPages} />
          <Usage label="Links" used={links} max={limits.maxSmartLinks} />
          <Usage label="Domains" used={domains} max={limits.customDomains} />
        </div>
        {!cardSub && ((user?.paddleCustomerId && paddle) || (user?.stripeCustomerId && stripeOn)) ? <ManageButton /> : null}
      </div>

      {cardSub && sub ? (
        <SubscriptionPanel
          planLabel={PLAN_LABEL[cardSub.plan]}
          price={cardSub.interval === "year" ? `$${PLAN_PRICES_USD[cardSub.plan].yearly}/yr` : `$${PLAN_PRICES_USD[cardSub.plan].monthly}/mo`}
          periodEnd={sub.currentPeriodEnd ? sub.currentPeriodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null}
          cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
          pastDue={sub.status === "past_due"}
          method={method}
        />
      ) : null}

      <PlanCards
        plan={plan}
        cardPay={configured}
        paddle={paddle ? { ...paddle, email: user?.email ?? "", userId } : null}
        cardSub={cardSub}
        initialInterval={interval === "year" ? "year" : undefined}
      />
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
