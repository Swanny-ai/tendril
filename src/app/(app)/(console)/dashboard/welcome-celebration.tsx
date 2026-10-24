"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutTemplate, Link2, PartyPopper, Unlink, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { celebrate } from "@/lib/celebrate";

const FLOWERS = ["🌸", "🌺", "🌼", "💐", "🌷", "✨"];


/**
 * New accounts land on the dashboard with fireworks, confetti and falling flowers, then a short
 * "what's next" card. Shown once per account (remembered in this browser).
 */
export function WelcomeCelebration({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);
  // Only drawn after the welcome opens (never on the server), so random positions are fine here.
  const [flowers] = useState(() =>
    Array.from({ length: 28 }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      dur: 4 + Math.random() * 3,
      emoji: FLOWERS[id % FLOWERS.length],
      size: 18 + Math.random() * 18,
    })),
  );

  useEffect(() => {
    const key = `vl-welcomed-${userId}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      /* private mode: show it anyway */
    }
    // Shown after mount: whether this browser has seen it is only known here.
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
      // Drop ?welcome=1 so a refresh doesn't replay it.
      if (location.search.includes("welcome=1")) history.replaceState(null, "", location.pathname);
      setShow(true);
    });
    return () => clearTimeout(t);
  }, [userId]);

  // Fireworks and confetti (shared with link creation); flowers fall on top.
  useEffect(() => {
    if (show) celebrate({ bursts: 7, confetti: 160, duration: 4000 });
  }, [show]);

  if (!show) return null;
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[61] overflow-hidden" aria-hidden>
        {flowers.map((f) => (
          <span
            key={f.id}
            className="absolute -top-12 animate-[vl-fall_linear_forwards]"
            style={{ left: `${f.left}%`, fontSize: f.size, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>
      <style>{`@keyframes vl-fall{0%{transform:translateY(0) rotate(0);opacity:0}10%{opacity:1}100%{transform:translateY(110vh) rotate(540deg);opacity:.9}}`}</style>
      <div className="fixed inset-0 z-[59] grid place-items-center bg-black/50 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-2xl">
          <button type="button" onClick={() => setShow(false)} className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </button>
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
            <PartyPopper className="size-7" aria-hidden />
          </span>
          <h2 id="welcome-title" className="mt-4 text-2xl font-semibold">
            Congrats, you&apos;re in! 🎉
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Your ViewLink account is ready. What do you want to make first?</p>
          <div className="mt-5 grid gap-2 text-left">
            <Link href="/dashboard/templates" onClick={() => setShow(false)} className={buttonVariants({ variant: "outline", className: "h-auto justify-start gap-3 py-3" })}>
              <LayoutTemplate className="text-primary" /> <span><b className="block">A bio page</b><span className="text-xs font-normal text-muted-foreground">All your links on one page</span></span>
            </Link>
            <Link href="/dashboard/links/new" onClick={() => setShow(false)} className={buttonVariants({ variant: "outline", className: "h-auto justify-start gap-3 py-3" })}>
              <Unlink className="text-primary" /> <span><b className="block">A Two-Steps link</b><span className="text-xs font-normal text-muted-foreground">Opens your page in the phone&apos;s browser</span></span>
            </Link>
            <Link href="/dashboard/deeplinks/new" onClick={() => setShow(false)} className={buttonVariants({ variant: "outline", className: "h-auto justify-start gap-3 py-3" })}>
              <Link2 className="text-primary" /> <span><b className="block">A deep link</b><span className="text-xs font-normal text-muted-foreground">A short link with an optional 18+ page</span></span>
            </Link>
          </div>
          <Button variant="ghost" className="mt-3 w-full" onClick={() => setShow(false)}>
            Look around first
          </Button>
        </div>
      </div>
    </>
  );
}
