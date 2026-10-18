// Renders the animated HTML scenes in video/scenes to MP4 (H.264) + JPEG posters in public/videos.
//   node video/render.mjs                 render every scene
//   node video/render.mjs hero            render one scene
//   node video/render.mjs hero --stills 1,4,6.5   save stills to video/stills for checking
// Frames are captured at exact times (no screen recording), then encoded with WebCodecs in Chrome.
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = path.join(ROOT, "scenes");
const OUT_DIR = path.join(ROOT, "..", "public", "videos");
const STILLS_DIR = path.join(ROOT, "stills");
const FPS = 30;

const SCENES = {
  hero: { width: 390, height: 844, scale: 2, duration: 12, poster: 2.6, bitrate: 1_800_000 },
  sophie: { width: 390, height: 844, scale: 2, duration: 12, poster: 3.2, bitrate: 2_000_000 },
  speed: { width: 390, height: 844, scale: 2, duration: 12, poster: 3.2, bitrate: 2_000_000 },
  editor: { width: 1280, height: 800, scale: 1.5, duration: 12, poster: 5, bitrate: 2_200_000 },
  analytics: { width: 1280, height: 800, scale: 1.5, duration: 12, poster: 7, bitrate: 2_200_000 },
};

async function ensureMapPaths() {
  const file = path.join(SCENES_DIR, "map-paths.js");
  if (existsSync(file)) return;
  const { geoNaturalEarth1, geoPath } = await import("d3-geo");
  const { feature } = await import("topojson-client");
  const world = (await import("world-atlas/countries-110m.json", { with: { type: "json" } })).default;
  const fc = feature(world, world.objects.countries);
  fc.features = fc.features.filter((f) => f.id !== "010");
  const p = geoPath(geoNaturalEarth1().fitSize([560, 290], fc));
  const paths = fc.features.map((f) => ({ id: f.id, d: p(f) })).filter((x) => x.d);
  await writeFile(file, `window.MAP_PATHS = ${JSON.stringify(paths)};\n`);
}

async function openScene(browser, name, cfg) {
  const page = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height }, deviceScaleFactor: cfg.scale });
  await page.goto(pathToFileURL(path.join(SCENES_DIR, `${name}.html`)).href + "?capture");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  return page;
}

async function stills(browser, name, cfg, times) {
  await mkdir(STILLS_DIR, { recursive: true });
  const page = await openScene(browser, name, cfg);
  for (const t of times) {
    await page.evaluate((x) => window.seek(x), t);
    await page.screenshot({ path: path.join(STILLS_DIR, `${name}-${t}.png`), scale: "css" });
  }
  await page.close();
}

async function render(browser, name, cfg) {
  const page = await openScene(browser, name, cfg);
  const W = Math.round(cfg.width * cfg.scale);
  const H = Math.round(cfg.height * cfg.scale);

  const enc = await browser.newPage();
  await enc.goto(pathToFileURL(path.join(SCENES_DIR, "encoder.html")).href);
  await enc.addScriptTag({ path: path.join(ROOT, "..", "node_modules", "mp4-muxer", "build", "mp4-muxer.js") });
  const codec = await enc.evaluate(
    async ({ W, H, FPS, bitrate }) => {
      const candidates = ["avc1.640033", "avc1.4d0033", "avc1.42e033"];
      let chosen = null;
      for (const codec of candidates) {
        const cfg = { codec, width: W, height: H, bitrate, framerate: FPS, avc: { format: "avc" } };
        if ((await VideoEncoder.isConfigSupported(cfg)).supported) {
          chosen = cfg;
          break;
        }
      }
      if (!chosen) throw new Error("No supported H.264 encoder");
      window.muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: "avc", width: W, height: H, frameRate: FPS }, fastStart: "in-memory" });
      window.encoder = new VideoEncoder({ output: (chunk, meta) => window.muxer.addVideoChunk(chunk, meta), error: (e) => console.error(e) });
      window.encoder.configure(chosen);
      return chosen.codec;
    },
    { W, H, FPS, bitrate: cfg.bitrate },
  );

  const frames = Math.round(cfg.duration * FPS);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.seek(t), i / FPS);
    const png = await page.screenshot({ type: "png" });
    await enc.evaluate(
      async ({ b64, i, FPS }) => {
        const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
        const bmp = await createImageBitmap(blob);
        const frame = new VideoFrame(bmp, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
        window.encoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
        frame.close();
        bmp.close();
        while (window.encoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 5));
      },
      { b64: png.toString("base64"), i, FPS },
    );
    if (i % 60 === 0) process.stdout.write(`  ${name}: frame ${i}/${frames}\r`);
  }
  const b64 = await enc.evaluate(async () => {
    await window.encoder.flush();
    window.muxer.finalize();
    const bytes = new Uint8Array(window.muxer.target.buffer);
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  const mp4 = Buffer.from(b64, "base64");
  await writeFile(path.join(OUT_DIR, `${name}.mp4`), mp4);

  await page.evaluate((t) => window.seek(t), cfg.poster);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}-poster.jpg`), type: "jpeg", quality: 82 });
  console.log(`  ${name}: ${W}x${H}, ${frames} frames, ${codec}, ${(mp4.length / 1e6).toFixed(2)} MB`);
  await page.close();
  await enc.close();
}

const args = process.argv.slice(2);
const stillsIdx = args.indexOf("--stills");
const times = stillsIdx >= 0 ? args[stillsIdx + 1].split(",").map(Number) : null;
const names = args.filter((a, i) => !a.startsWith("--") && (stillsIdx < 0 || i !== stillsIdx + 1));
const selected = names.length ? names : Object.keys(SCENES);

await ensureMapPaths();
await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const name of selected) {
    if (!SCENES[name]) throw new Error(`Unknown scene ${name}`);
    if (times) await stills(browser, name, SCENES[name], times);
    else await render(browser, name, SCENES[name]);
  }
} finally {
  await browser.close();
}
