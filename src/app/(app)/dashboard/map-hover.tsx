"use client";

import { useRef, useState } from "react";

const fmt = new Intl.NumberFormat("en-US");

/**
 * Hover tooltip for the server-rendered world map. Country paths carry data-name and
 * data-views (already filtered by the selected date range), so this only tracks the pointer.
 */
export function MapHover({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; name: string; views: number } | null>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = (e.target as Element).closest?.("path[data-name]") as SVGPathElement | null;
    const box = ref.current?.getBoundingClientRect();
    if (!target || !box) {
      setTip(null);
      return;
    }
    const x = Math.min(Math.max(e.clientX - box.left, 90), box.width - 90);
    setTip({ x, y: e.clientY - box.top, name: target.dataset.name ?? "", views: Number(target.dataset.views ?? 0) });
  };

  return (
    <div ref={ref} className="relative" onPointerMove={onMove} onPointerLeave={() => setTip(null)}>
      {children}
      {tip ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-20 min-w-40 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl border bg-popover px-3.5 py-2.5 text-popover-foreground shadow-lg"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="font-semibold whitespace-nowrap">{tip.name}</p>
          <p className="mt-0.5 border-b pb-1.5 text-sm whitespace-nowrap">
            Total: <span className="font-semibold tabular-nums">{fmt.format(tip.views)}</span> {tip.views === 1 ? "view" : "views"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
