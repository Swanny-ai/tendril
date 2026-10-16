"use client";

import { useRef, type ReactNode } from "react";

/**
 * 3D card that tilts toward the pointer with a moving holographic sheen.
 * Still for people who prefer reduced motion and in static previews.
 */
export function TiltCard({ children, className, still = false }: { children: ReactNode; className?: string; still?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  const move = (x: number, y: number) => {
    const el = ref.current;
    if (!el || still || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (x - r.left) / r.width;
    const py = (y - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 14}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 18}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
    el.style.setProperty("--sheen", "1");
  };
  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--sheen", "0");
  };

  return (
    <div className="w-full [perspective:1000px]">
      <div
        ref={ref}
        onPointerMove={(e) => move(e.clientX, e.clientY)}
        onPointerLeave={reset}
        className={`relative transition-transform duration-200 ease-out [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] [transform-style:preserve-3d] ${className ?? ""}`}
      >
        {children}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-color-dodge transition-opacity duration-300"
          style={{
            opacity: "calc(var(--sheen, 0) * .55)",
            background:
              "radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,.55), transparent 45%), linear-gradient(115deg, transparent 20%, rgba(255,120,200,.35) 38%, rgba(120,200,255,.35) 52%, rgba(160,255,170,.3) 64%, transparent 80%)",
          }}
        />
      </div>
    </div>
  );
}
