"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { CountryFlag } from "@/components/country-flag";
import { cn } from "@/lib/utils";

export type DemoCity = { name: string; code: string; country: string; x: number; y: number; weight: number };

type Visit = { id: number; city: DemoCity; device: "Mobile" | "Desktop" | "Tablet"; link: string; at: number };

const LINKS = ["viewlink.me/maya", "viewlink.me/l/vip", "maya.com", "viewlink.me/l/drop", "viewlink.me/l/merch"];
const DEVICES: Visit["device"][] = ["Mobile", "Mobile", "Mobile", "Mobile", "Desktop", "Tablet"];
const DEVICE_ICON = { Mobile: Smartphone, Desktop: Monitor, Tablet: Tablet };

// Deterministic "random" so the server render and the first client render match.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** A city chosen by weight, so busy regions show up more often. */
function pick(cities: DemoCity[], u: number) {
  const total = cities.reduce((n, c) => n + c.weight, 0);
  let x = u * total;
  for (const c of cities) if ((x -= c.weight) < 0) return c;
  return cities[cities.length - 1];
}

function makeVisit(id: number, cities: DemoCity[], r: () => number, at: number): Visit {
  return { id, city: pick(cities, r()), device: DEVICES[Math.floor(r() * DEVICES.length)], link: LINKS[Math.floor(r() * LINKS.length)], at };
}

function ago(ms: number) {
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
}

/** The moving part of the home page's live demo: pings on the map, a visitor feed and counters. */
export function LiveDemoOverlay({ cities, children }: { cities: DemoCity[]; children: ReactNode }) {
  // Seeded until the page is live (so server and browser agree), then truly random.
  const r = useRef<() => number>(rng(7));
  const nextId = useRef(6);
  const [now, setNow] = useState(0);
  const [visits, setVisits] = useState<Visit[]>(() => {
    const seed = rng(3);
    return Array.from({ length: 6 }, (_, i) => makeVisit(i, cities, seed, -(i + 1) * 4000));
  });
  const [views, setViews] = useState(18432);
  const [paused, setPaused] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Only run while on screen, and not at all for people who prefer reduced motion.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let tick: ReturnType<typeof setInterval> | null = null;
    r.current = Math.random;
    const start = performance.now();
    const schedule = () => {
      timer = setTimeout(
        () => {
          const t = performance.now() - start;
          setVisits((v) => [makeVisit(nextId.current++, cities, r.current, t), ...v].slice(0, 7));
          setViews((n) => n + 1 + Math.floor(r.current() * 3));
          schedule();
        },
        900 + r.current() * 1400,
      );
    };
    const stop = () => {
      if (timer) clearTimeout(timer);
      if (tick) clearInterval(tick);
      timer = tick = null;
    };
    const io = new IntersectionObserver(([e]) => {
      stop();
      if (e.isIntersecting && !reduced && !paused) {
        schedule();
        tick = setInterval(() => setNow(performance.now() - start), 1000);
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, [cities, paused]);

  const fmt = new Intl.NumberFormat("en-US");
  const latest = visits.slice(0, 5);

  return (
    <div ref={box} className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="relative overflow-hidden rounded-3xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-heading text-lg font-semibold">Geographic distribution</p>
            <p className="text-sm text-muted-foreground">Where your visitors are, as they arrive</p>
          </div>
          <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">Example data</span>
        </div>
        <div className="relative mt-4">
          {children}
          {/* steady glow on every city, plus a ping where the newest visitors are */}
          {cities.map((c) => (
            <span key={c.name} aria-hidden className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--plum)]/50" style={{ left: `${c.x}%`, top: `${c.y}%` }} />
          ))}
          {latest.map((v, i) => (
            <span key={v.id} aria-hidden className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${v.city.x}%`, top: `${v.city.y}%` }}>
              <span className={cn("absolute top-1/2 left-1/2 size-5 sm:size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--plum)]/40", i === 0 && "animate-ping")} />
              <span className="relative block size-2 sm:size-2.5 rounded-full bg-[var(--plum)] shadow-[0_0_12px_var(--plum)]" />
            </span>
          ))}
          {latest[0] ? (
            <span
              key={`label-${latest[0].id}`}
              aria-hidden
              className="absolute z-10 flex -translate-x-1/2 -translate-y-[160%] animate-in items-center gap-1.5 rounded-full border bg-card/95 px-2.5 py-1 text-[11px] whitespace-nowrap shadow-lg fade-in zoom-in-95"
              style={{ left: `${latest[0].city.x}%`, top: `${latest[0].city.y}%` }}
            >
              <CountryFlag code={latest[0].city.code} size="sm" /> {latest[0].city.name}
            </span>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-sm">
          <div>
            <p className="text-muted-foreground">Views today</p>
            <p className="font-heading text-2xl font-semibold tabular-nums">{fmt.format(views)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Countries</p>
            <p className="font-heading text-2xl font-semibold tabular-nums">{new Set(cities.map((c) => c.code)).size}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Opened in browser</p>
            <p className="font-heading text-2xl font-semibold text-[var(--plum)] tabular-nums">92%</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col rounded-3xl border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-heading text-lg font-semibold">
            Live activity <span className="size-2 animate-pulse rounded-full bg-[var(--plum)] shadow-[0_0_0_4px_rgba(73,242,100,.2)]" />
          </p>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
            aria-pressed={paused}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">New visitors, as they happen</p>
        <ul className="mt-3 flex-1 space-y-1 overflow-hidden" aria-live="off">
          {visits.map((v, i) => {
            const Icon = DEVICE_ICON[v.device];
            const fresh = now - v.at < 2500 && v.at > 0;
            return (
              <li
                key={v.id}
                className={cn("flex items-center gap-3 rounded-xl px-2 py-2 transition-colors", i === 0 && fresh && "animate-in bg-[var(--plum)]/10 fade-in slide-in-from-top-2 duration-500")}
              >
                <CountryFlag code={v.city.code} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">New visitor · {v.city.country}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Icon className="size-3 shrink-0" aria-hidden /> {v.device} · {v.link}
                  </p>
                </div>
                {fresh ? (
                  <span className="rounded-full bg-[#f4a124] px-2 py-0.5 text-[10px] font-bold text-[#0a0a0a]">NEW</span>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">{ago(Math.max(1000, now - v.at))}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
