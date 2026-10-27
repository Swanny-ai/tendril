"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, Zap } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export type TrialState = { onTrial: boolean; daysLeft: number; expired: boolean; userId: string };

/** A line at the top of the dashboard about the Pro trial: a gentle note early, then a push near the end / after it ends. */
export function TrialBanner({ onTrial, daysLeft, expired }: TrialState) {
  const [hidden, setHidden] = useState(false);
  if (hidden || (!onTrial && !expired)) return null;
  const urgent = expired || daysLeft <= 2;
  const text = expired
    ? "Your free Pro trial has ended. Upgrade to keep Two-Steps, custom domains, the verified badge and more."
    : daysLeft <= 2
      ? `Your free Pro trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Upgrade to keep your Pro features.`
      : `You're on a free Pro trial — ${daysLeft} days left. Enjoy every Pro feature.`;
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-3 border-b px-4 py-2.5 text-sm md:px-8 ${urgent ? "bg-[var(--persimmon)]/10" : "bg-primary/10"}`}
    >
      {urgent ? <Zap className="size-4 shrink-0 text-[var(--persimmon-text)]" aria-hidden /> : <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />}
      <p className="flex-1">{text}</p>
      <Link href="/dashboard/billing" className={buttonVariants({ size: "sm", variant: urgent ? "default" : "outline" })}>
        {expired ? "See plans" : "Upgrade"}
      </Link>
      {!urgent ? (
        <Button size="icon-sm" variant="ghost" aria-label="Hide for now" onClick={() => setHidden(true)}>
          <X />
        </Button>
      ) : null}
    </div>
  );
}

/** A reminder popup near the end of the trial and after it ends, shown at most once a day per account. */
export function TrialPopup({ onTrial, daysLeft, expired, userId }: TrialState) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!(expired || (onTrial && daysLeft <= 2))) return;
    const key = `vl-trial-nag-${userId}`;
    const today = new Date().toISOString().slice(0, 10);
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem(key) === today) return; // already nagged today
        localStorage.setItem(key, today);
      } catch {
        /* private mode: show it anyway */
      }
      setShow(true);
    }, 900);
    return () => clearTimeout(t);
  }, [onTrial, daysLeft, expired, userId]);

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[59] grid place-items-center bg-black/50 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="trial-title">
      <div className="relative w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-2xl">
        <button type="button" onClick={() => setShow(false)} className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </button>
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-7" aria-hidden />
        </span>
        <h2 id="trial-title" className="mt-4 text-xl font-semibold">
          {expired ? "Your Pro trial has ended" : daysLeft === 1 ? "Your Pro trial ends tomorrow" : `${daysLeft} days left of Pro`}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {expired
            ? "Keep Two-Steps pages, custom domains, the verified badge, all themes and a year of analytics — pick a plan to turn Pro back on."
            : "Don't lose your Two-Steps pages, custom domains, verified badge and analytics. Upgrade now and keep everything."}
        </p>
        <div className="mt-5 grid gap-2">
          <Link href="/dashboard/billing" onClick={() => setShow(false)} className={buttonVariants({ size: "lg" })}>
            See plans
          </Link>
          <Button variant="ghost" onClick={() => setShow(false)}>
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
