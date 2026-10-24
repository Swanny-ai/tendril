"use client";

import { useState } from "react";
import { Bitcoin, Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRICES_USD, type PlanName } from "@/lib/plan-rules";
import { cn } from "@/lib/utils";

const FREE_FEATURES = ["1 bio page with 12 blocks", "1 deep link with an 18+ page", "Opens in the phone's browser from Instagram & TikTok", "30 days of analytics"];
const PRO_FEATURES = [
  "Two-Steps pages (Escape Meta Bot)",
  "Up to 25 bio pages and 100 deep links",
  "Custom domains (up to 5)",
  "Verified blue badge",
  "All themes, custom colors and fonts",
  "Remove the “Made with” badge",
  "Custom 18+ wording and colors",
  "Countries, devices and platforms, a year of history",
];

type Interval = "month" | "year";

async function goTo(path: string, interval: Interval) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ interval }) });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "Something went wrong. Please try again.");
  window.location.assign(json.url);
}

/** Free and Pro side by side, with a Monthly / Yearly switch and the ways to pay. */
export function PlanCards({ plan, cardPay, cryptoPay, prepaid }: { plan: PlanName; cardPay: boolean; cryptoPay: boolean; prepaid: boolean }) {
  const [interval, setPeriod] = useState<Interval>("year");
  const [busy, setBusy] = useState<"card" | "crypto" | null>(null);
  const pay = async (how: "card" | "crypto") => {
    setBusy(how);
    try {
      await goTo(how === "card" ? "/api/billing/checkout" : "/api/billing/crypto", interval);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  };
  const yearly = interval === "year";
  const price = yearly ? PRICES_USD.yearly : PRICES_USD.monthly;
  const perMonth = yearly ? (PRICES_USD.yearly / 12).toFixed(2).replace(/\.00$/, "") : String(PRICES_USD.monthly);
  // Pro on crypto is prepaid: buying again adds time. Pro on a card subscription is managed in Stripe.
  const canBuy = plan === "FREE" || (prepaid && cryptoPay);

  return (
    <div className="space-y-5">
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

      <div className="grid gap-4 md:grid-cols-2">
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
          <p className="mt-1 text-sm text-muted-foreground">Everything you need to start.</p>
          <ul className="mt-5 flex-1 space-y-2.5 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /> {f}
              </li>
            ))}
          </ul>
          <Button variant="outline" size="lg" className="mt-6 w-full" disabled>
            {plan === "FREE" ? "Current plan" : "Included"}
          </Button>
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-[0_0_40px_-15px_var(--primary)]">
          <span className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
            <Sparkles className="size-3" aria-hidden /> Most popular
          </span>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pro</h2>
            {plan === "PRO" ? <Badge>Your plan</Badge> : null}
          </div>
          <p className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-bold">${perMonth}</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{yearly ? `$${PRICES_USD.yearly} billed once a year` : "Billed monthly. Cancel anytime."}</p>
          <ul className="mt-5 flex-1 space-y-2.5 text-sm">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {f}
              </li>
            ))}
          </ul>

          {canBuy ? (
            <div className="mt-6 space-y-2">
              {plan === "FREE" && cardPay ? (
                <Button size="lg" className="w-full" disabled={!!busy} onClick={() => pay("card")}>
                  {busy === "card" ? <Loader2 className="animate-spin" /> : <CreditCard />} Upgrade to Pro · ${price}
                  {yearly ? "/year" : "/month"}
                </Button>
              ) : null}
              {cryptoPay ? (
                <Button size="lg" variant={plan === "FREE" && cardPay ? "outline" : "default"} className="w-full" disabled={!!busy} onClick={() => pay("crypto")}>
                  {busy === "crypto" ? <Loader2 className="animate-spin" /> : <Bitcoin />} {plan === "PRO" ? "Add more Pro time" : "Pay with crypto"} · ${price}
                </Button>
              ) : null}
              {!cardPay && !cryptoPay ? (
                <Button size="lg" className="w-full" disabled>
                  Upgrade to Pro
                </Button>
              ) : null}
              <p className="pt-1 text-center text-xs text-muted-foreground">
                {cardPay ? "Secure card payment with Stripe. " : ""}
                {cryptoPay ? "Crypto (USDT, USDC, BTC, ETH, SOL…) is prepaid: nothing renews by itself." : ""}
              </p>
            </div>
          ) : (
            <Button size="lg" className="mt-6 w-full" disabled>
              You&apos;re on Pro
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
