"use client";

import { useSyncExternalStore } from "react";
import { timeLeft } from "@/lib/blocks";

// One shared 1-second clock for every countdown on the page.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let now = 0;
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const getNow = () => now || Date.now();

const pad = (n: number) => String(n).padStart(2, "0");

export type CountdownStyle = { box: React.CSSProperties; label: React.CSSProperties; title: React.CSSProperties };

/** Live countdown. Renders dashes on the server, then ticks in the browser. */
export function Countdown({ until, title, look }: { until?: string; title: string; look: CountdownStyle }) {
  const t = useSyncExternalStore(subscribe, getNow, () => 0);
  const left = t ? timeLeft(until, t) : null;
  const parts = left
    ? left.days > 0
      ? [
          [left.days, "Days"],
          [left.hours, "Hours"],
          [left.minutes, "Minutes"],
        ]
      : [
          [left.hours, "Hours"],
          [left.minutes, "Minutes"],
          [left.seconds, "Seconds"],
        ]
    : [
        [null, "Hours"],
        [null, "Minutes"],
        [null, "Seconds"],
      ];
  return (
    <div className="flex flex-col items-center gap-2" role="timer" aria-live="off">
      {title ? (
        <p className="text-xs font-semibold" style={look.title}>
          {left?.done ? `${title} · Ended` : title}
        </p>
      ) : null}
      <div className="flex items-center gap-1.5">
        {parts.map(([value, label], i) => (
          <div key={label as string} className="flex items-center gap-1.5">
            <div className="flex min-w-14 flex-col items-center rounded-lg px-2 py-1.5" style={look.box}>
              <span className="text-xl font-bold tabular-nums">{value === null ? "--" : pad(value as number)}</span>
              <span className="text-[9px] font-semibold tracking-widest uppercase" style={look.label}>
                {label}
              </span>
            </div>
            {i < 2 ? <span className="text-lg font-bold opacity-70">:</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
