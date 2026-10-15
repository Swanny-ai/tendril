"use client";

import { useEffect, useRef } from "react";

/** Shows a number and briefly highlights it whenever it changes after a background refresh. */
export function LiveNumber({ value, text, className }: { value: number; text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && previous.current !== null && previous.current !== value && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.animate(
        [
          { backgroundColor: "color-mix(in oklab, var(--chart-1) 28%, transparent)", color: "var(--chart-1)" },
          { backgroundColor: "transparent" },
        ],
        { duration: 1400, easing: "ease-out" },
      );
    }
    previous.current = value;
  }, [value]);

  return (
    <span ref={ref} className={className ? `rounded px-0.5 ${className}` : "rounded px-0.5"}>
      {text}
    </span>
  );
}
