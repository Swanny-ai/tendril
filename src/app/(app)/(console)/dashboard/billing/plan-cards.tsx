"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PAID_PLANS, PLAN_LABEL, PLAN_PRICES_USD, type PaidPlan, type PlanName } from "@/lib/plan-rules";
import { cn } from "@/lib/utils";
import type { PaddleClient } from "./paddle-checkout";
import { PaddlePopup } from "./paddle-popup";

const FEATURES: Record<PlanName, string[]> = {
  FREE: ["1 bio page with 12 blocks", "1 Deeplink with an 18+ page", "Opens in the phone's browser from Instagram & TikTok", "30 days of analytics"],
  PRO: [
    "3 links: Two-Steps or Deeplinks",
    "3 bio pages",
    "1 custom domain",
    "5 Link Health checks a day",
    "Two-Steps pages (Escape Meta Bot)",
    "Verified blue badge",
    "All themes, custom colors and fonts",
    "Remove the “Made with” badge",
    "Custom 18+ wording and colors",
    "A year of analytics: countries, devices, platforms",
  ],
  BUSINESS: [
    "10 Two-Steps pages (Escape Meta Bot)",
    "10 Deeplinks",
    "10 bio pages",
    "10 custom domains",
    "20 Link Health checks a day",
    "Verified blue badge",
    "All themes, custom colors and fonts",
    "Remove the “Made with” badge",
    "Custom 18+ wording and colors",
    "A year of analytics: countries, devices, platforms",
  ],
  AGENCY: [
    "50 Two-Steps pages (Escape Meta Bot)",
    "50 Deeplinks",
    "50 bio pages",
    "50 custom domains",
    "100 Link Health checks a day",
    "Verified blue badge",
    "All themes, custom colors and fonts",
    "Remove the “Made with” badge",
    "Custom 18+ wording and colors",
    "A year of analytics: countries, devices, platforms",
  ],
};
const TAGLINE: Record<PlanName, string> = {
  FREE: "Everything you need to start.",
  PRO: "For creators growing their audience.",
  BUSINESS: "For creators with many pages and brands.",
  AGENCY: "For agencies running many creators.",
};

type Interval = "month" | "year";
/** The plan buttons: the action on one line, the price under it, never spilling out of the card. */
const TWO_LINE = "h-auto min-h-12 w-full flex-col gap-0 py-2 whitespace-normal text-center";
const RANK: Record<PlanName, number> = { FREE: 0, PRO: 1, BUSINESS: 2, AGENCY: 3 };

async function post(path: string, body: object) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { url?: string; ok?: boolean; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
  return json;
}

const perMonthOf = (plan: PaidPlan, interval: Interval) =>
  interval === "year" ? (PLAN_PRICES_USD[plan].yearly / 12).toFixed(2).replace(/\.00$/, "") : String(PLAN_PRICES_USD[plan].monthly);
const priceOf = (plan: PaidPlan, interval: Interval) => (interval === "year" ? PLAN_PRICES_USD[plan].yearly : PLAN_PRICES_USD[plan].monthly);

/** Free and the paid plans side by side, with a Monthly / Yearly switch and the ways to pay. */
export function PlanCards({
  plan,
  cardPay,
  paddle,
  cardSub,
}: {
  plan: PlanName;
  cardPay: boolean;
  /** Card payments through Paddle (popup checkout); null = Stripe Checkout. */
  paddle: PaddleClient | null;
  /** The card plan this account pays for through Paddle, if any (it can switch plan or period). */
  cardSub: { plan: PaidPlan; interval: Interval } | null;
}) {
  const router = useRouter();
  // Opens on monthly prices (a current card subscription shows its own period).
  const [interval, setPeriod] = useState<Interval>(cardSub?.interval ?? "month");
  const [busy, setBusy] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<PaidPlan | null>(null);
  const yearly = interval === "year";

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(null);
  };
  const payCard = (p: PaidPlan) => {
    if (paddle) return setCheckout(p);
    void run(`card-${p}`, async () => {
      const { url } = await post("/api/billing/checkout", { interval, plan: p });
      if (url) window.location.assign(url);
    });
  };
  const switchTo = (p: PaidPlan) => {
    const what = `${PLAN_LABEL[p]} ${yearly ? "yearly" : "monthly"} ($${priceOf(p, interval)}/${yearly ? "year" : "month"})`;
    if (!window.confirm(`Switch to ${what}? Paddle charges or credits the difference for the rest of this period.`)) return;
    void run(`switch-${p}`, async () => {
      await post("/api/billing/change-plan", { plan: p, interval });
      toast.success(`Switching to ${PLAN_LABEL[p]}… this takes a few seconds.`);
      setTimeout(() => router.refresh(), 4000);
    });
  };

  return (
    <div className="space-y-5">
      {paddle && checkout ? (
        <PaddlePopup
          open
          onOpenChange={(o) => !o && setCheckout(null)}
          paddle={paddle}
          plan={checkout}
          interval={interval}
          price={priceOf(checkout, interval)}
          perMonth={perMonthOf(checkout, interval)}
        />
      ) : null}
      <div className="flex justify-center">
        <div className="flex rounded-full border bg-muted p-1 text-sm" role="radiogroup" aria-label="Billing period">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={interval === i}
              onClick={() => setPeriod(i)}
              className={cn("flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-colors", interval === i ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {i === "month" ? "Monthly" : "Yearly"}
              {i === "year" ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">2 months free</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Free */}
        <div className="flex flex-col rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Free</h2>
            {plan === "FREE" ? <Badge variant="secondary">Your plan</Badge> : null}
          </div>
          <p className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-sm text-muted-foreground">forever</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{TAGLINE.FREE}</p>
          <FeatureList items={FEATURES.FREE} muted />
          <Button variant="outline" size="lg" className="mt-6 w-full" disabled>
            {plan === "FREE" ? "Current plan" : "Included"}
          </Button>
        </div>

        {PAID_PLANS.map((p) => {
          const popular = p === "BUSINESS";
          const mine = plan === p;
          const onThisCard = cardSub?.plan === p && cardSub.interval === interval;
          // Upgrades only (to a higher plan) for accounts without a card plan; card plans switch instead.
          // Stripe (the fallback when Paddle isn't set up) only has Pro prices, and a plan needs its
          // Paddle price set up (Agency's are added in Paddle by hand).
          const hasPrice = !paddle || !!paddle.prices[p][interval];
          const canCard = cardPay && !cardSub && RANK[p] > RANK[plan] && (p === "PRO" || !!paddle) && hasPrice;
          const canSwitch = !!cardSub && !onThisCard && !!paddle && hasPrice;
          return (
            <div
              key={p}
              className={cn(
                "relative flex flex-col rounded-2xl bg-card p-6",
                popular ? "border-2 border-primary shadow-[0_0_40px_-15px_var(--primary)]" : "border",
              )}
            >
              {popular ? (
                <span className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  <Sparkles className="size-3" aria-hidden /> Most popular
                </span>
              ) : null}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{PLAN_LABEL[p]}</h2>
                {mine ? <Badge>Your plan</Badge> : null}
              </div>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${perMonthOf(p, interval)}</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{yearly ? `$${PLAN_PRICES_USD[p].yearly} billed once a year` : "Billed monthly. Cancel anytime."}</p>
              <p className="mt-2 text-sm">{TAGLINE[p]}</p>
              <FeatureList items={FEATURES[p]} />

              <div className="mt-6 space-y-2">
                {onThisCard ? (
                  <Button size="lg" className="w-full" disabled>
                    Your plan
                  </Button>
                ) : null}
                {/* Two lines (action, then price) so the text fits in narrow cards. */}
                {canSwitch ? (
                  <Button size="lg" variant={popular ? "default" : "outline"} className={TWO_LINE} disabled={!!busy} onClick={() => switchTo(p)}>
                    <span className="flex items-center gap-2">
                      {busy === `switch-${p}` ? <Loader2 className="animate-spin" /> : <ArrowLeftRight />} Switch to {PLAN_LABEL[p]}
                    </span>
                    <span className="text-xs font-normal opacity-75">
                      ${priceOf(p, interval)} / {yearly ? "year" : "month"}
                    </span>
                  </Button>
                ) : null}
                {canCard ? (
                  <Button size="lg" variant={popular ? "default" : "outline"} className={TWO_LINE} disabled={!!busy} onClick={() => payCard(p)}>
                    <span className="flex items-center gap-2">
                      {busy === `card-${p}` ? <Loader2 className="animate-spin" /> : <CreditCard />} Get {PLAN_LABEL[p]}
                    </span>
                    <span className="text-xs font-normal opacity-75">
                      ${priceOf(p, interval)} / {yearly ? "year" : "month"}
                    </span>
                  </Button>
                ) : null}
                {mine && !cardSub ? (
                  <Button size="lg" className="w-full" disabled>
                    You&apos;re on {PLAN_LABEL[p]}
                  </Button>
                ) : null}
                {!onThisCard && !canSwitch && !canCard && !mine ? (
                  <Button size="lg" variant="outline" className="h-auto min-h-10 w-full py-2 whitespace-normal" disabled>
                    {cardPay ? "Not available with your current plan" : `Get ${PLAN_LABEL[p]}`}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1 text-center text-xs text-muted-foreground">
        <p>
          {cardPay ? `Secure card payment with ${paddle ? "Paddle" : "Stripe"}. Plans renew automatically until you cancel.` : ""}
        </p>
        <p>
          14-day money-back guarantee. By paying you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/refund" className="underline underline-offset-4 hover:text-foreground">
            Refund Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function FeatureList({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <ul className="mt-5 flex-1 space-y-2.5 text-sm">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2">
          <Check className={cn("mt-0.5 size-4 shrink-0", muted ? "text-muted-foreground" : "text-primary")} aria-hidden /> {f}
        </li>
      ))}
    </ul>
  );
}
