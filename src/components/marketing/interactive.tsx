"use client";

// Interactive pieces of the home page: scroll reveals, audience tabs, the affiliate calculator
// and counting numbers.

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Check } from "lucide-react";
import { formatUsd, levelFor, LEVELS } from "@/lib/affiliate-rules";
import { cn } from "@/lib/utils";

const REDUCED = "(prefers-reduced-motion: reduce)";
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (on) => {
      const m = window.matchMedia(REDUCED);
      m.addEventListener("change", on);
      return () => m.removeEventListener("change", on);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

function useInView<T extends Element>(once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return { ref, inView };
}

/** Fades and slides its content in the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("transition-all duration-700 ease-out motion-reduce:transition-none", inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100", className)}
    >
      {children}
    </div>
  );
}

/** A number that counts up when it scrolls into view. */
export function CountUp({ to, suffix = "", prefix = "", duration = 1400 }: { to: number; suffix?: string; prefix?: string; duration?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const reduced = usePrefersReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {(reduced && inView ? to : n).toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

// ---------- Audience tabs ----------

const AUDIENCES = [
  {
    key: "creators",
    label: "Creators",
    title: "Show the world everything you make",
    body: "One page for your socials, content and offers. Deep links keep fans signed in all the way to checkout, and 18+ pages keep the right links behind a quick age check.",
    points: ["Templates made to look like you", "Links that open in Safari or Chrome", "See which links earn the clicks"],
  },
  {
    key: "agencies",
    label: "Agencies",
    title: "Run every talent from one account",
    body: "Create a page and links for each creator you manage, each with its own domain and its own analytics, all from one dashboard.",
    points: ["Pages and deep links per talent", "Analytics for each page and link", "Custom domains for every brand"],
  },
  {
    key: "brands",
    label: "Brands",
    title: "Turn social traffic into sales",
    body: "Send ad and influencer traffic to your own domain and into the visitor's real browser, where saved cards, Apple Pay and logins work.",
    points: ["Your domain, at the root or a path", "Fewer drop-offs at checkout", "Live visitors and conversions"],
  },
];

export function AudienceTabs() {
  const [active, setActive] = useState(0);
  const a = AUDIENCES[active];
  return (
    <div>
      <div role="tablist" aria-label="Who it's for" className="mx-auto flex w-fit gap-1 rounded-full border bg-card p-1">
        {AUDIENCES.map((x, i) => (
          <button
            key={x.key}
            role="tab"
            id={`aud-tab-${x.key}`}
            aria-selected={i === active}
            aria-controls="aud-panel"
            onClick={() => setActive(i)}
            className={cn("rounded-full px-4 py-2 text-sm font-medium transition-colors", i === active ? "bg-[var(--plum)] text-[#0a0a0a]" : "text-muted-foreground hover:text-foreground")}
          >
            For {x.label}
          </button>
        ))}
      </div>
      <div id="aud-panel" role="tabpanel" aria-labelledby={`aud-tab-${a.key}`} className="mx-auto mt-10 max-w-3xl text-center">
        <div key={a.key} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">{a.title}</h3>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">{a.body}</p>
          <ul className="mt-7 flex flex-wrap justify-center gap-2.5">
            {a.points.map((p) => (
              <li key={p} className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
                <Check className="size-4 text-[var(--plum)]" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------- Affiliate calculator ----------

export function EarningsCalculator({ monthlyUsd }: { monthlyUsd: number }) {
  const [n, setN] = useState(10);
  const { level } = levelFor(n);
  const monthly = Math.floor(n * monthlyUsd * 100 * (level.rate / 100));
  return (
    <div className="rounded-3xl border bg-card p-6 sm:p-8">
      <label htmlFor="calc-referrals" className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Paying creators you invite</span>
        <span className="font-heading text-3xl font-semibold text-[var(--plum)] tabular-nums">{n}</span>
      </label>
      <input
        id="calc-referrals"
        type="range"
        min={1}
        max={100}
        value={n}
        onChange={(e) => setN(Number(e.target.value))}
        className="mt-4 w-full accent-[var(--plum)]"
      />
      <div className="mt-2 flex gap-1.5 text-xs">
        {LEVELS.map((l) => (
          <span key={l.key} className={cn("rounded-full px-2.5 py-1 transition-colors", l.key === level.key ? "bg-[var(--plum)] text-[#0a0a0a]" : "bg-secondary text-muted-foreground")}>
            {l.name} {l.rate}%
          </span>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6">
        <div>
          <p className="text-sm text-muted-foreground">Each month</p>
          <p className="font-heading text-3xl font-semibold tabular-nums" aria-live="polite">
            {formatUsd(monthly)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Each year</p>
          <p className="font-heading text-3xl font-semibold tabular-nums">{formatUsd(monthly * 12)}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Based on Pro monthly at ${monthlyUsd}, at your level&apos;s rate. Earnings are paid out from $25.</p>
    </div>
  );
}
