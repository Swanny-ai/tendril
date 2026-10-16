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
  "pro-card": [900, 1080, `
    <rect width="900" height="1080" fill="#14110f"/>
    <radialGradient id="g1" cx="70%" cy="20%" r="80%"><stop offset="0" stop-color="#f59e0b" stop-opacity=".55"/><stop offset="1" stop-color="#14110f" stop-opacity="0"/></radialGradient>
    <rect width="900" height="1080" fill="url(#g1)"/>
    ${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 110 - 20}" y="0" width="6" height="1080" fill="#ffffff" opacity=".05"/>`).join("")}
    <rect x="60" y="760" width="780" height="26" rx="13" fill="#2b2622"/>
    <rect x="70" y="700" width="40" height="150" rx="8" fill="#3a332d"/><rect x="790" y="700" width="40" height="150" rx="8" fill="#3a332d"/>
    <g transform="translate(450,40)">${person("#0b0908")}</g>
    <path d="M0 1080 L0 900 Q450 820 900 900 L900 1080Z" fill="#0b0908" opacity=".7"/>`],
  // Red-glow portrait for Personal Card
  "personal-card": [900, 1200, `
    <defs><radialGradient id="r" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#ef233c"/><stop offset=".55" stop-color="#7a0f1d"/><stop offset="1" stop-color="#140507"/></radialGradient>
    <linearGradient id="fig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0b10"/><stop offset="1" stop-color="#0c0304"/></linearGradient></defs>
    <rect width="900" height="1200" fill="url(#r)"/>
    <circle cx="450" cy="520" r="330" fill="#ff4d5e" opacity=".25"/>
    <g transform="translate(450,120)">${person("url(#fig)")}</g>`],
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
  "card-1": [1200, 900, `<rect width="1200" height="900" fill="#ea580c"/><rect x="180" y="520" width="140" height="240" rx="16" fill="#fff" opacity=".85"/><rect x="380" y="400" width="140" height="360" rx="16" fill="#fff" opacity=".85"/><rect x="580" y="280" width="140" height="480" rx="16" fill="#fff" opacity=".85"/><rect x="780" y="160" width="140" height="600" rx="16" fill="#fff"/>`],
  "card-2": [1200, 900, `<rect width="1200" height="900" fill="#15803d"/><circle cx="600" cy="450" r="300" fill="#f0fdf4"/><circle cx="520" cy="400" r="70" fill="#f97316"/><circle cx="680" cy="420" r="60" fill="#dc2626"/><circle cx="600" cy="540" r="80" fill="#84cc16"/>`],
  "card-3": [1200, 900, `<rect width="1200" height="900" fill="#1d4ed8"/><circle cx="460" cy="360" r="90" fill="#dbeafe"/><path d="M300 760 C300 560 380 490 460 490 C540 490 620 560 620 760Z" fill="#dbeafe"/><circle cx="760" cy="380" r="80" fill="#93c5fd"/><path d="M620 760 C620 580 690 520 760 520 C830 520 900 580 900 760Z" fill="#93c5fd"/>`],
  "card-4": [1200, 900, `<defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f9a8d4"/><stop offset="1" stop-color="#be185d"/></linearGradient></defs><rect width="1200" height="900" fill="url(#p)"/><path d="M600 300 C 520 180 340 230 360 390 C 380 540 600 660 600 660 C 600 660 820 540 840 390 C 860 230 680 180 600 300Z" fill="#fff" opacity=".9"/>`],
  "card-5": [1200, 900, `<rect width="1200" height="900" fill="#4c1d95"/><path d="M450 230 L380 260 L280 360 L360 450 L420 400 L420 720 L780 720 L780 400 L840 450 L920 360 L820 260 L750 230 C 720 290 480 290 450 230Z" fill="#f5f3ff"/><circle cx="600" cy="470" r="60" fill="#a78bfa"/>`],
  "card-6": [1200, 900, `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#7c2d12"/></linearGradient></defs><rect width="1200" height="900" fill="url(#s)"/>${[200, 450, 750, 1000].map((x, i) => `<path d="M${x} 0 L${x - 160} 700 L${x + 160} 700Z" fill="${["#fbbf24", "#f472b6", "#60a5fa", "#a3e635"][i]}" opacity=".25"/>`).join("")}<rect y="700" width="1200" height="200" fill="#020617"/>${Array.from({ length: 18 }, (_, i) => `<circle cx="${40 + i * 66}" cy="${720 + (i % 3) * 12}" r="26" fill="#020617"/>`).join("")}`],
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
