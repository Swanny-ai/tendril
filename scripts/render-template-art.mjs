// Renders the original sample art used by the page templates into public/templates/*.jpg.
//   node scripts/render-template-art.mjs
// Everything is drawn here (gradients, shapes, silhouettes): no photos of real people.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const OUT = path.join(process.cwd(), "public", "templates");

const person = (fill, x = 0, scale = 1) => `
  <g transform="translate(${x * 9},0) scale(${scale})" fill="${fill}">
    <ellipse cx="0" cy="330" rx="88" ry="104"/>
    <path d="M-36 410 h72 v90 h-72z"/>
    <path d="M-250 1200 C -250 760 -190 500 -60 485 C -30 482 30 482 60 485 C 190 500 250 760 250 1200 Z"/>
  </g>`;

const SCENES = {
  // Gym-style dark hero for Pro Card
  // Red-glow portrait for Personal Card
  // Coastal sunset town for Spotlight (background)
  spotlight: [1200, 1600, `
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a6b"/><stop offset=".45" stop-color="#f08a6b"/><stop offset=".7" stop-color="#ffd29a"/></linearGradient></defs>
    <rect width="1200" height="1600" fill="url(#sky)"/>
    <circle cx="820" cy="760" r="150" fill="#fff2c9" opacity=".9"/>
    <path d="M0 900 Q300 760 600 860 T1200 820 V1600 H0Z" fill="#7a4f6d"/>
    <path d="M0 1000 Q350 900 700 980 T1200 960 V1600 H0Z" fill="#5a3a55"/>
    ${Array.from({ length: 14 }, (_, i) => `<rect x="${60 + i * 80}" y="${940 - (i % 4) * 60}" width="56" height="${300 + (i % 4) * 60}" fill="#3a2440" opacity=".9"/><rect x="${74 + i * 80}" y="${980 - (i % 4) * 60}" width="10" height="14" fill="#ffd29a" opacity=".8"/>`).join("")}
    <rect y="1180" width="1200" height="420" fill="#26172b"/>
    <path d="M0 1180 H1200" stroke="#ffd29a" stroke-opacity=".3" stroke-width="4"/>`],
  // Colourful bokeh portrait for Modern Card
  "modern-card": [900, 1125, `
    <defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset=".5" stop-color="#7c3aed"/><stop offset="1" stop-color="#db2777"/></linearGradient></defs>
    <rect width="900" height="1125" fill="url(#m)"/>
    ${[[120, 180, 90, "#fde68a"], [760, 140, 120, "#a5f3fc"], [700, 520, 70, "#fbcfe8"], [160, 620, 110, "#c4b5fd"], [450, 90, 60, "#fef3c7"]].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".35"/>`).join("")}
    <g transform="translate(450,140)">${person("#160f2e")}</g>`],
  // Image-card art
  "card-4": [1200, 900, `<defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f9a8d4"/><stop offset="1" stop-color="#be185d"/></linearGradient></defs><rect width="1200" height="900" fill="url(#p)"/><path d="M600 300 C 520 180 340 230 360 390 C 380 540 600 660 600 660 C 600 660 820 540 840 390 C 860 230 680 180 600 300Z" fill="#fff" opacity=".9"/>`],
  "card-5": [1200, 900, `<rect width="1200" height="900" fill="#4c1d95"/><path d="M450 230 L380 260 L280 360 L360 450 L420 400 L420 720 L780 720 L780 400 L840 450 L920 360 L820 260 L750 230 C 720 290 480 290 450 230Z" fill="#f5f3ff"/><circle cx="600" cy="470" r="60" fill="#a78bfa"/>`],
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
for (const [name, [w, h, svg]] of Object.entries(SCENES)) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg}</svg></body></html>`);
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 82 });
  console.log(`  ${name}.jpg`);
}
await browser.close();
