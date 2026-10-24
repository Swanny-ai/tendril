// Fireworks and confetti over the whole screen for a few seconds (browser only). The canvas is added
// to <body> and removes itself, so it keeps playing while the app moves to another page.

const COLORS = ["#49f264", "#f472d0", "#1d9bf0", "#ffd166", "#ff7a59", "#a78bfa", "#ffffff"];

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; spin: number; angle: number; kind: "spark" | "confetti" };

export function celebrate({ bursts = 5, confetti = 120, duration = 3200 }: { bursts?: number; confetti?: number; duration?: number } = {}) {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas");
  c.setAttribute("aria-hidden", "true");
  c.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:70";
  document.body.appendChild(c);
  const ctx = c.getContext("2d")!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    c.width = innerWidth * dpr;
    c.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize);

  const parts: Particle[] = [];
  const burst = (x: number, y: number) => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < 70; i++) {
      const a = (Math.PI * 2 * i) / 70;
      const speed = 2 + Math.random() * 4;
      parts.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0, max: 60 + Math.random() * 30, color: Math.random() < 0.25 ? "#ffffff" : color, size: 2 + Math.random() * 1.5, spin: 0, angle: 0, kind: "spark" });
    }
  };
  for (let i = 0; i < confetti; i++) {
    const fromLeft = i % 2 === 0;
    parts.push({
      x: fromLeft ? 0 : innerWidth,
      y: innerHeight * 0.75,
      vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 8),
      vy: -(9 + Math.random() * 9),
      life: 0,
      max: 160 + Math.random() * 60,
      color: COLORS[i % COLORS.length],
      size: 5 + Math.random() * 5,
      spin: (Math.random() - 0.5) * 0.3,
      angle: Math.random() * Math.PI,
      kind: "confetti",
    });
  }
  const timers = Array.from({ length: bursts }, (_, i) =>
    setTimeout(() => burst(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.12 + Math.random() * 0.35)), i * 450),
  );

  const start = performance.now();
  let raf = 0;
  const tick = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life++;
      if (p.kind === "spark") {
        p.vx *= 0.96;
        p.vy = p.vy * 0.96 + 0.06;
      } else {
        p.vx *= 0.99;
        p.vy += 0.25;
        p.angle += p.spin;
      }
      p.x += p.vx;
      p.y += p.vy;
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      if (p.kind === "spark") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (p.life >= p.max || p.y > innerHeight + 40) parts.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    if (parts.length || performance.now() - start < duration) raf = requestAnimationFrame(tick);
    else cleanup();
  };
  const cleanup = () => {
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    removeEventListener("resize", resize);
    c.remove();
  };
  raf = requestAnimationFrame(tick);
}
