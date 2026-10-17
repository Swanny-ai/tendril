"use client";

// Interactive pieces of the home page: scroll reveals, audience tabs, a template switcher,
// the in-app browser escape demo, the affiliate calculator and counting numbers.

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { Check, CreditCard, ExternalLink, Globe, KeyRound, Loader2, MousePointerClick } from "lucide-react";
import { SocialGlyph } from "@/components/public-page/social";
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
    image: "/templates/spotlight.jpg",
  },
  {
    key: "agencies",
    label: "Agencies",
    title: "Run every talent from one account",
    body: "Create a page and links for each creator you manage, each with its own domain and its own analytics, all from one dashboard.",
    points: ["Pages and deep links per talent", "Analytics for each page and link", "Custom domains for every brand"],
    image: "/templates/pro-card.jpg",
  },
  {
    key: "brands",
    label: "Brands",
    title: "Turn social traffic into sales",
    body: "Send ad and influencer traffic to your own domain and into the visitor's real browser, where saved cards, Apple Pay and logins work.",
    points: ["Your domain, at the root or a path", "Fewer drop-offs at checkout", "Live visitors and conversions"],
    image: "/templates/modern-card.jpg",
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
      <div id="aud-panel" role="tabpanel" aria-labelledby={`aud-tab-${a.key}`} className="mt-10 grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div key={a.key} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h3 className="text-2xl font-semibold tracking-tight sm:text-4xl">{a.title}</h3>
          <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">{a.body}</p>
          <ul className="mt-6 space-y-2.5">
            {a.points.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm">
                <span className="grid size-5 place-items-center rounded-full bg-[var(--plum)]/15">
                  <Check className="size-3 text-[var(--plum)]" aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto h-[420px] w-[230px]">
          <div aria-hidden className="absolute inset-0 rounded-full bg-[var(--plum)]/15 blur-3xl" />
          {AUDIENCES.map((x, i) => (
            <div
              key={x.key}
              className={cn(
                "absolute inset-0 overflow-hidden rounded-[36px] border-[7px] border-[#262626] shadow-2xl transition-all duration-500",
                i === active ? "z-10 scale-100 rotate-0 opacity-100" : i === (active + 1) % 3 ? "translate-x-16 scale-90 rotate-6 opacity-40" : "-translate-x-16 scale-90 -rotate-6 opacity-40",
              )}
            >
              <Image src={x.image} alt={i === active ? `Example page for ${x.label.toLowerCase()}` : ""} fill sizes="230px" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Template switcher ----------

const LOOKS = [
  { key: "spotlight", name: "Spotlight" },
  { key: "pro-card", name: "Pro Card" },
  { key: "personal-card", name: "Personal Card" },
  { key: "modern-card", name: "Modern Card" },
  { key: "simple-stack", name: "Simple Stack" },
];

export function TemplateSwitcher() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (paused || reduced) return;
    const t = setInterval(() => setActive((i) => (i + 1) % LOOKS.length), 2800);
    return () => clearInterval(t);
  }, [paused, reduced]);
  return (
    <div className="grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative mx-auto h-[460px] w-[240px]">
        <div aria-hidden className="absolute -inset-6 rounded-full bg-[var(--plum)]/15 blur-3xl" />
        <div className="relative h-full overflow-hidden rounded-[40px] border-[8px] border-[#262626] bg-[#262626] shadow-2xl">
          {LOOKS.map((l, i) => (
            <Image
              key={l.key}
              src={`/templates/${l.key}.jpg`}
              alt={i === active ? `${l.name} template` : ""}
              fill
              sizes="240px"
              className={cn("object-cover transition-all duration-500", i === active ? "scale-100 opacity-100" : "scale-105 opacity-0")}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold tracking-[0.2em] text-[var(--plum)] uppercase">Templates</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Try a look. Make it yours.</h2>
        <p className="mt-3 max-w-lg text-muted-foreground">Tap a template to see it on the phone. Every one comes with your photo, links and colors filled in.</p>
        <div role="radiogroup" aria-label="Templates" className="mt-6 flex flex-wrap gap-2">
          {LOOKS.map((l, i) => (
            <button
              key={l.key}
              role="radio"
              aria-checked={i === active}
              onClick={() => {
                setActive(i);
                setPaused(true);
              }}
              className={cn(
                "group flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-sm transition-all hover:-translate-y-0.5",
                i === active ? "border-[var(--plum)] bg-[var(--plum)]/10 text-foreground" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="relative size-7 overflow-hidden rounded-full border">
                <Image src={`/templates/${l.key}.jpg`} alt="" fill sizes="28px" className="object-cover" />
              </span>
              {l.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- In-app browser escape demo ----------

const ESCAPE_STEPS = [
  { icon: MousePointerClick, title: "A fan taps your link", body: "Inside Instagram, TikTok or Snapchat." },
  { icon: ExternalLink, title: "ViewLink opens the real browser", body: "Safari on iPhone, Chrome on Android." },
  { icon: KeyRound, title: "They're already signed in", body: "Saved passwords and cookies work again." },
  { icon: CreditCard, title: "Checkout in one tap", body: "Apple Pay, Google Pay and card autofill." },
];

export function EscapeDemo() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(false);
  useEffect(() => {
    if (paused || reduced || !inView) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % ESCAPE_STEPS.length), 2400);
    return () => clearTimeout(t);
  }, [step, paused, reduced, inView]);

  return (
    <div ref={ref} className="grid items-center gap-10 md:grid-cols-2">
      <ol className="space-y-2" aria-label="What happens when a fan taps your link">
        {ESCAPE_STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              onClick={() => {
                setStep(i);
                setPaused(true);
              }}
              aria-current={i === step ? "step" : undefined}
              className={cn("relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all", i === step ? "border-[var(--plum)]/60 bg-card shadow-lg" : "border-transparent hover:bg-card/60")}
            >
              <span className="flex items-start gap-3">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl transition-colors", i === step ? "bg-[var(--plum)] text-[#0a0a0a]" : "bg-secondary text-muted-foreground")}>
                  <s.icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="text-sm text-muted-foreground">{s.body}</span>
                </span>
              </span>
              {i === step && !paused && !reduced ? (
                <span aria-hidden key={step} className="absolute bottom-0 left-0 h-0.5 bg-[var(--plum)] [animation:vl-progress_2.4s_linear_forwards]" />
              ) : null}
            </button>
          </li>
        ))}
      </ol>

      {/* The phone acting it out */}
      <div aria-hidden className="relative mx-auto h-[440px] w-[230px] overflow-hidden rounded-[38px] border-[7px] border-[#262626] bg-[#0d0d0d] shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-3 text-[10px] text-white/70">
          <span>9:41</span>
          <span>●●●</span>
        </div>
        {/* address bar */}
        <div className={cn("mx-3 mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] transition-colors duration-500", step === 0 ? "bg-white/10 text-white/60" : "bg-[var(--plum)]/15 text-[var(--plum)]")}>
          {step === 0 ? <SocialGlyph network="instagram" size={11} /> : <Globe className="size-3" />}
          <span className="truncate">{step === 0 ? "Instagram browser" : "Safari · shop.example.com"}</span>
        </div>
        <div className="relative mt-4 h-[330px] px-4">
          {/* step 0: profile with link */}
          <div className={cn("absolute inset-x-4 top-0 transition-all duration-500", step === 0 ? "opacity-100" : "pointer-events-none -translate-y-4 opacity-0")}>
            <div className="mx-auto size-14 rounded-full bg-gradient-to-br from-[#e6ffaa] to-[var(--plum)]" />
            <p className="mt-2 text-center text-xs font-semibold text-white">@yourname</p>
            <div className="mt-4 space-y-2">
              <div className="rounded-xl bg-[var(--plum)] py-2.5 text-center text-[11px] font-semibold text-[#0a0a0a] ring-4 ring-[var(--plum)]/30">My shop ↗</div>
              <div className="rounded-xl bg-white/10 py-2.5 text-center text-[11px] text-white/80">Latest video</div>
              <div className="rounded-xl bg-white/10 py-2.5 text-center text-[11px] text-white/80">Free guide</div>
            </div>
          </div>
          {/* step 1: opening */}
          <div className={cn("absolute inset-0 grid place-items-center transition-all duration-500", step === 1 ? "opacity-100" : "pointer-events-none opacity-0")}>
            <div className="text-center">
              <Loader2 className={cn("mx-auto size-8 text-[var(--plum)]", step === 1 && !reduced && "animate-spin")} />
              <p className="mt-3 text-xs text-white/80">Opening in Safari…</p>
            </div>
          </div>
          {/* step 2: signed in */}
          <div className={cn("absolute inset-x-4 top-4 transition-all duration-500", step === 2 ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0")}>
            <p className="text-sm font-semibold text-white">Welcome back, Sam</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white/80">
                <KeyRound className="size-3 text-[var(--plum)]" /> Password filled
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white/80">
                <Check className="size-3 text-[var(--plum)]" /> Cart kept: 2 items
              </div>
            </div>
          </div>
          {/* step 3: checkout */}
          <div className={cn("absolute inset-x-4 top-4 transition-all duration-500", step === 3 ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0")}>
            <p className="text-sm font-semibold text-white">Checkout</p>
            <div className="mt-3 rounded-xl bg-white/10 p-3 text-[11px] text-white/80">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-semibold text-white">$29.00</span>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-white py-2.5 text-center text-[11px] font-semibold text-black"> Pay</div>
            <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-[var(--plum)]">
              <Check className="size-3" /> Paid
            </p>
          </div>
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
