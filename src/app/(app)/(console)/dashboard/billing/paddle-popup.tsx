"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PLAN_LABEL, type PaidPlan } from "@/lib/plan-rules";
import { closeInlineCheckout, openInlineCheckout, PADDLE_FRAME_CLASS, type PaddleClient } from "./paddle-checkout";

const HIGHLIGHTS: Record<PaidPlan, string[]> = {
  PRO: ["3 links: Two-Steps or Deeplinks", "3 bio pages and 1 custom domain", "Verified badge, all themes and colors", "A year of analytics"],
  BUSINESS: ["10 Two-Steps + 10 Deeplinks", "10 bio pages and 10 custom domains", "Verified badge, all themes and colors", "A year of analytics"],
};

/** ViewLink's own popup around Paddle's card form: plan summary on the left, payment on the right. */
export function PaddlePopup({
  open,
  onOpenChange,
  paddle,
  plan,
  interval,
  price,
  perMonth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paddle: PaddleClient;
  plan: PaidPlan;
  interval: "month" | "year";
  price: number;
  perMonth: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    // Reset for this opening, then draw Paddle's form once the popup is on the page.
    queueMicrotask(() => {
      if (!alive) return;
      setLoading(true);
      setError(null);
      setPaid(false);
    });
    let loaded = false;
    openInlineCheckout(paddle, plan, interval, (e) => {
      if (!alive) return;
      if (e.name === "checkout.loaded") {
        loaded = true;
        setLoading(false);
      }
      if (e.name === "checkout.completed") setPaid(true);
      // After loading, Paddle shows its own messages (e.g. a declined card) inside the form.
      if (e.name === "checkout.error" && !loaded) setError("Paddle couldn't load the payment form. Please try again.");
    }).catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
      closeInlineCheckout();
    };
  }, [open, paddle, plan, interval]);

  const yearly = interval === "year";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] gap-0 overflow-y-auto p-0 sm:max-w-3xl md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Plan summary */}
        <div className="relative overflow-hidden bg-[#0f1410] p-6 text-white md:rounded-l-xl md:p-8">
          <div aria-hidden className="absolute -top-24 -left-24 size-64 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white">
              <Image src="/apple-icon.png" alt="" width={32} height={32} className="size-8 rounded-lg" />
              ViewLink {PLAN_LABEL[plan]}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-white/60">{yearly ? "Yearly plan · 2 months free" : "Monthly plan · cancel anytime"}</DialogDescription>
            <p className="mt-6 flex items-baseline gap-1.5">
              <span className="text-4xl font-bold">${perMonth}</span>
              <span className="text-sm text-white/60">/ month</span>
            </p>
            <p className="text-sm text-white/60">{yearly ? `$${price} billed once a year` : `$${price} billed every month`}</p>
            <ul className="mt-6 hidden space-y-2.5 text-sm md:block">
              {HIGHLIGHTS[plan].map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {h}
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2 border-t border-white/10 pt-5 text-xs text-white/60">
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" aria-hidden /> 14-day money-back guarantee
              </p>
              <p className="flex items-center gap-2">
                <Lock className="size-4 text-primary" aria-hidden /> Secure payment by Paddle, our reseller
              </p>
            </div>
          </div>
        </div>

        {/* Paddle's form (light, like the checkout's theme) */}
        <div className="relative min-h-[470px] bg-white p-4 text-neutral-900 md:rounded-r-xl md:p-6">
          {paid ? (
            <div className="grid h-full min-h-[420px] place-items-center text-center" role="status">
              <div>
                <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                <p className="mt-3 font-medium">Payment received. Turning on {PLAN_LABEL[plan]}…</p>
              </div>
            </div>
          ) : null}
          {loading && !error && !paid ? (
            <div className="absolute inset-0 grid place-items-center" role="status" aria-label="Loading the payment form">
              <Loader2 className="size-6 animate-spin text-neutral-400" />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="mt-10 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className={`${PADDLE_FRAME_CLASS} ${paid ? "hidden" : ""}`} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
