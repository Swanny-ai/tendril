// Optional profile page a deep link shows first ("Template" in the link settings): a big cover
// photo fading into its own colors, name + verified badge, social icons, photo cards,
// text and a countdown. Links can ask for an 18+ confirmation (a popup) before opening.
// Plain HTML + CSS (+ a tiny script on the live page) so the page is one small document; the
// dashboard preview renders the same markup, so preview = live page.
import { brand } from "@/config/brand";
import { socialMeta } from "@/components/public-page/social";
import { SOCIAL_NETWORKS, type SocialNetwork } from "@/lib/validation";
import { esc } from "@/warning-templates/warning-html";

export type LandingSection = {
  id: string;
  kind: "link" | "text" | "countdown";
  title: string;
  url?: string;
  imageUrl?: string;
  /** Photo cards: "large" spans the row, "small" ones sit two per row. */
  size?: "large" | "small";
  /** Accent-colored border. */
  highlight?: boolean;
  /** Ask "Are you 18+?" in a popup before opening the link. */
  adult?: boolean;
  /** A looping animation that draws the eye. */
  anim?: LinkAnim;
  /** Icon left of the text: "auto" (from the link's site), "none", a simple icon or a network logo. */
  icon?: string;
  body?: string;
  /** Countdown end (ISO). Once passed it keeps counting down the next 24 hours. */
  endsAt?: string;
  /** Block size: small, medium (default) or large. */
  scale?: BlockScale;
  /** Text size inside the block (S, M default, L, XL). */
  textSize?: TextSize;
  /** Font of the block's title (NAME_FONTS key, "" = page font) and bold or regular. */
  font?: string;
  bold?: boolean;
  /** Own look for this section ("" = the page's link-button style). */
  style?: "" | ButtonStyle;
  color?: string;
  textColor?: string;
  /** Rendering only: the app link to try on tap (Step 1's button); a long press uses `url`. */
  deep?: string;
  /** Photo framing inside the card: focus point (0-100 %) and zoom (1-3). */
  imgX?: number;
  imgY?: number;
  imgZoom?: number;
};

export type ButtonStyle = "glass" | "solid" | "outline";
export type BlockScale = "s" | "m" | "l";
export type TextSize = "s" | "m" | "l" | "xl";
const TEXT_SCALE: Record<TextSize, number> = { s: 0.85, m: 1, l: 1.2, xl: 1.45 };

/** Photo card shape for its width and size (the CSS below uses the same ratios). */
export function cardAspect(s: Pick<LandingSection, "size" | "scale">): string {
  const half = s.size === "small";
  return s.scale === "s" ? (half ? "1/1" : "16/7") : s.scale === "l" ? (half ? "2/3" : "1/1") : half ? "4/5" : "16/10";
}

export const LINK_ANIMS = ["none", "pulse", "shake", "glow", "bounce", "shine"] as const;
export type LinkAnim = (typeof LINK_ANIMS)[number];

export type LandingSocial = { network: SocialNetwork; handle: string };

export type LandingPage = {
  enabled: boolean;
  name: string;
  nameStyle: "normal" | "wide";
  /** Font of the name ("" = the page font); keys of NAME_FONTS. */
  nameFont: string;
  nameBold: boolean;
  handle: string;
  bio: string;
  coverUrl: string;
  /** How the cover sits in its fixed frame: focus point (0-100 %) and zoom (1-3). */
  coverX: number;
  coverY: number;
  coverZoom: number;
  verified: boolean;
  /** A green "Available now" status under the name. */
  availableNow: boolean;
  theme: "dark" | "light";
  accent: string;
  /** Color the page fades into below the cover ("" = from the cover photo only). */
  bgColor: string;
  /** Link buttons (without a photo): look, color and text color ("" = automatic). */
  btnStyle: ButtonStyle;
  btnColor: string;
  btnText: string;
  buttonShape: "rounded" | "pill" | "square";
  font: "sans" | "serif" | "mono";
  socials: LandingSocial[];
  sections: LandingSection[];
  /** Step 1: a simple page (cover, name, bio, one button) shown before this page (Step 2). */
  intro: boolean;
  introSections: LandingSection[];
  /** Step 1's own profile ("" = Step 2's). */
  introName: string;
  introHandle: string;
  introBio: string;
  introCoverUrl: string;
  introCoverX: number;
  introCoverY: number;
  introCoverZoom: number;
};

export const DEFAULT_LANDING: LandingPage = {
  enabled: false,
  name: "",
  nameStyle: "wide",
  nameFont: "",
  nameBold: true,
  handle: "",
  bio: "",
  coverUrl: "",
  coverX: 50,
  coverY: 50,
  coverZoom: 1,
  verified: false,
  availableNow: false,
  theme: "dark",
  accent: "#f472d0",
  bgColor: "",
  btnStyle: "glass",
  btnColor: "",
  btnText: "",
  buttonShape: "rounded",
  font: "sans",
  socials: [],
  sections: [],
  intro: false,
  introSections: [],
  introName: "",
  introHandle: "",
  introBio: "",
  introCoverUrl: "",
  introCoverX: 50,
  introCoverY: 50,
  introCoverZoom: 1,
};

export const MAX_SECTIONS = 16;
export const MAX_SOCIALS = 8;
export const LANDING_SOCIALS: SocialNetwork[] = [
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "snapchat",
  "onlyfans",
  "telegram",
  "threads",
  "twitch",
  "facebook",
  "spotify",
  "discord",
  "whatsapp",
  "patreon",
];

const HEX = /^#[0-9a-f]{6}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v)) * 100) / 100 : fallback;
const hex = (v: unknown) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : "");
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

/** http(s) URL or an uploaded /media/ image; anything else is dropped. */
export function safeImageUrl(v: unknown): string {
  const s = str(v, 2048);
  return /^https?:\/\/[^\s"'<>()]+$/i.test(s) || /^\/media\/[a-z0-9.-]+$/i.test(s) ? s : "";
}

/** Links: http(s) only, "example.com" becomes https://example.com. */
export function safeLinkUrl(v: unknown): string {
  let s = str(v, 2048);
  if (!s) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

/** Cleans stored/submitted data into a LandingPage (null when there is nothing usable). */
export function parseLanding(value: unknown): LandingPage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const parseSections = (arr: unknown, max: number) =>
    (Array.isArray(arr) ? arr : [])
      .slice(0, max)
      .map((raw, i): LandingSection | null => {
        if (!raw || typeof raw !== "object") return null;
        const s = raw as Record<string, unknown>;
        const kind = oneOf(s.kind, ["link", "text", "countdown"] as const, "link");
        const id = str(s.id, 40) || `s${i}`;
        const title = str(s.title, 80);
        const look = {
          style: oneOf(s.style, ["", "glass", "solid", "outline"] as const, ""),
          color: hex(s.color),
          textColor: hex(s.textColor),
          scale: oneOf(s.scale, ["s", "m", "l"] as const, "m"),
          textSize: oneOf(s.textSize, ["s", "m", "l", "xl"] as const, "m"),
          font: typeof s.font === "string" && s.font in NAME_FONTS ? s.font : "",
          bold: s.bold !== false,
        };
        if (kind === "text") return { id, kind, title, body: str(s.body, 500), ...look, icon: isBlockIcon(s.icon) ? s.icon : "none" };
        if (kind === "countdown") {
          const t = Date.parse(str(s.endsAt, 40));
          return { id, kind, title, endsAt: Number.isFinite(t) ? new Date(t).toISOString() : "", ...look };
        }
        return {
          id,
          kind,
          title,
          ...look,
          imgX: num(s.imgX, 0, 100, 50),
          imgY: num(s.imgY, 0, 100, 50),
          imgZoom: num(s.imgZoom, 1, 3, 1),
          url: safeLinkUrl(s.url),
          imageUrl: safeImageUrl(s.imageUrl),
          size: oneOf(s.size, ["large", "small"] as const, "large"),
          highlight: s.highlight === true,
          adult: s.adult === true,
          anim: oneOf(s.anim, LINK_ANIMS, "none"),
          icon: isBlockIcon(s.icon) ? s.icon : "auto",
        };
      })
      .filter((s): s is LandingSection => !!s);
  const sections = parseSections(v.sections, MAX_SECTIONS);
  const socials = (Array.isArray(v.socials) ? v.socials : [])
    .slice(0, MAX_SOCIALS)
    .map((raw) => {
      const s = (raw ?? {}) as Record<string, unknown>;
      return SOCIAL_NETWORKS.includes(s.network as SocialNetwork) ? { network: s.network as SocialNetwork, handle: str(s.handle, 200) } : null;
    })
    .filter((s): s is LandingSocial => !!s);
  return {
    enabled: v.enabled === true,
    name: str(v.name, 60),
    nameStyle: oneOf(v.nameStyle, ["normal", "wide"] as const, DEFAULT_LANDING.nameStyle),
    nameFont: typeof v.nameFont === "string" && v.nameFont in NAME_FONTS ? v.nameFont : "",
    nameBold: v.nameBold !== false,
    handle: str(v.handle, 60),
    bio: str(v.bio, 200),
    coverUrl: safeImageUrl(v.coverUrl),
    coverX: num(v.coverX, 0, 100, 50),
    coverY: num(v.coverY, 0, 100, 50),
    coverZoom: num(v.coverZoom, 1, 3, 1),
    verified: v.verified === true,
    availableNow: v.availableNow === true,
    theme: oneOf(v.theme, ["dark", "light"] as const, "dark"),
    accent: typeof v.accent === "string" && HEX.test(v.accent) ? v.accent.toLowerCase() : DEFAULT_LANDING.accent,
    bgColor: typeof v.bgColor === "string" && HEX.test(v.bgColor) ? v.bgColor.toLowerCase() : "",
    btnStyle: oneOf(v.btnStyle, ["glass", "solid", "outline"] as const, "glass"),
    btnColor: typeof v.btnColor === "string" && HEX.test(v.btnColor) ? v.btnColor.toLowerCase() : "",
    btnText: typeof v.btnText === "string" && HEX.test(v.btnText) ? v.btnText.toLowerCase() : "",
    buttonShape: oneOf(v.buttonShape, ["rounded", "pill", "square"] as const, DEFAULT_LANDING.buttonShape),
    font: oneOf(v.font, ["sans", "serif", "mono"] as const, "sans"),
    socials,
    sections,
    intro: v.intro === true,
    introSections: parseSections(v.introSections, 1).filter((s) => s.kind === "link"),
    introName: str(v.introName, 60),
    introHandle: str(v.introHandle, 60),
    introBio: str(v.introBio, 200),
    introCoverUrl: safeImageUrl(v.introCoverUrl),
    introCoverX: num(v.introCoverX, 0, 100, 50),
    introCoverY: num(v.introCoverY, 0, 100, 50),
    introCoverZoom: num(v.introCoverZoom, 1, 3, 1),
  };
}

/** Fonts for the name (Google Fonts): family, weight and a fallback. */
export const NAME_FONTS: Record<string, { label: string; family: string; weight: number; fallback: string }> = {
  montserrat: { label: "Montserrat", family: "Montserrat", weight: 800, fallback: "sans-serif" },
  poppins: { label: "Poppins", family: "Poppins", weight: 700, fallback: "sans-serif" },
  bebas: { label: "Bebas Neue", family: "Bebas Neue", weight: 400, fallback: "sans-serif" },
  oswald: { label: "Oswald", family: "Oswald", weight: 600, fallback: "sans-serif" },
  playfair: { label: "Playfair", family: "Playfair Display", weight: 700, fallback: "serif" },
  abril: { label: "Abril Fatface", family: "Abril Fatface", weight: 400, fallback: "serif" },
  cinzel: { label: "Cinzel", family: "Cinzel", weight: 700, fallback: "serif" },
  righteous: { label: "Righteous", family: "Righteous", weight: 400, fallback: "sans-serif" },
  pacifico: { label: "Pacifico", family: "Pacifico", weight: 400, fallback: "cursive" },
  dancing: { label: "Dancing Script", family: "Dancing Script", weight: 700, fallback: "cursive" },
  lobster: { label: "Lobster", family: "Lobster", weight: 400, fallback: "cursive" },
};

/** Google Fonts stylesheet (regular + bold) for these fonts. With `text`, only those letters are downloaded (live page). */
export function nameFontsHref(keys: string[], text?: string): string {
  const families = [...new Set(keys)]
    .filter((k) => k in NAME_FONTS)
    .map((k) => `family=${NAME_FONTS[k].family.replace(/ /g, "+")}:wght@${[...new Set([400, NAME_FONTS[k].weight])].join(";")}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}${text ? `&text=${encodeURIComponent(text)}` : ""}&display=swap`;
}

/** Inline CSS for a font choice: family (when not the page font) and bold or regular weight. */
export function fontCss(key: string | undefined, bold: boolean | undefined): string {
  const f = key ? NAME_FONTS[key] : null;
  const family = f ? `font-family:'${f.family}',${f.fallback};` : "";
  return `${family}font-weight:${bold === false ? 400 : f ? f.weight : 700}`;
}

/** Which network a URL belongs to (for the small icon on photo cards). */
export function networkOfUrl(url: string): SocialNetwork | null {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  const map: [RegExp, SocialNetwork][] = [
    [/(^|\.)instagram\.com$/, "instagram"],
    [/(^|\.)tiktok\.com$/, "tiktok"],
    [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
    [/(^|\.)(x\.com|twitter\.com)$/, "x"],
    [/(^|\.)snapchat\.com$/, "snapchat"],
    [/(^|\.)onlyfans\.com$/, "onlyfans"],
    [/(^|\.)(t\.me|telegram\.me)$/, "telegram"],
    [/(^|\.)threads\.net$/, "threads"],
    [/(^|\.)twitch\.tv$/, "twitch"],
    [/(^|\.)(facebook\.com|fb\.com)$/, "facebook"],
    [/(^|\.)spotify\.com$/, "spotify"],
    [/(^|\.)patreon\.com$/, "patreon"],
  ];
  return map.find(([re]) => re.test(host))?.[1] ?? null;
}

/** Black or white, whichever reads better on a hex color. */
function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#0a0a0a" : "#ffffff";
}

// Filled icons for blocks (24x24, solid shapes), next to the network logos.
const SIMPLE_ICONS: Record<string, string> = {
  hand: "M10 2a2 2 0 0 1 2 2v6.4l1-.2a2 2 0 0 1 2.3 1.5l.1.2.8-.2a2 2 0 0 1 2.4 1.5l.1.3.5-.1a2 2 0 0 1 2.3 2V17a6 6 0 0 1-6 6h-2.3a6 6 0 0 1-4.8-2.4L4.3 16a1.8 1.8 0 0 1 2.7-2.4l1 1V4a2 2 0 0 1 2-2Z",
  heart: "M12 21s-7.5-4.6-9.5-9.2C1.2 8.7 3.2 4.5 7 4.5c2 0 3.3 1 5 2.8 1.7-1.8 3-2.8 5-2.8 3.8 0 5.8 4.2 4.5 7.3C19.5 16.4 12 21 12 21Z",
  star: "m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z",
  crown: "M3 7.5l4.6 4L12 4l4.4 7.5L21 7.5 19 19H5Z",
  gem: "M6.5 3h11L22 9 12 21 2 9Z",
  bolt: "M13.5 2 4 14h7l-1.5 8L19 10h-7Z",
  fire: "M12 22a7 7 0 0 1-7-7c0-3 1.7-5.2 3.3-6.8.4 1.8 1.4 3 2.7 3.3C10.5 7.6 12 4.5 14.5 2c.3 3.5 2.2 5.6 3.6 7.6A8.3 8.3 0 0 1 19 15a7 7 0 0 1-7 7Z",
  sparkle: "M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4Z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm2 0h6V7a3 3 0 0 0-6 0Z",
  gift: "M4 11h7v10H5a1 1 0 0 1-1-1Zm9 0h7v9a1 1 0 0 1-1 1h-6ZM3 7h8v3H3Zm10 0h8v3h-8ZM12 7c-1-3-5-5-6.5-3S8 7 12 7Zm0 0c1-3 5-5 6.5-3S16 7 12 7Z",
  play: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-2 6v8l6-4Z",
  camera: "M9 4h6l1.5 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5Zm3 4.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  chat: "M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
  music: "M21 3v12.5a3.5 3.5 0 1 1-2-3.2V7l-8 1.6v9.4a3.5 3.5 0 1 1-2-3.2V5Z",
  bag: "M7 7a5 5 0 0 1 10 0h3l-1 14H5L4 7Zm2 0h6a3 3 0 0 0-6 0Z",
};
export const SIMPLE_ICON_KEYS = Object.keys(SIMPLE_ICONS);
export const isBlockIcon = (v: unknown): v is string =>
  typeof v === "string" && (v === "auto" || v === "none" || v in SIMPLE_ICONS || (SOCIAL_NETWORKS as readonly string[]).includes(v));

/** The icon shown left of a block's text ("" when none). */
export function blockIconHtml(icon: string | undefined, url: string | undefined, size = 20): string {
  const key = icon === "auto" || icon === undefined ? (url ? networkOfUrl(url) : null) : icon;
  if (!key || key === "none") return "";
  if (key in SIMPLE_ICONS)
    return `<svg class="lp-bi" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="${SIMPLE_ICONS[key]}"/></svg>`;
  return (SOCIAL_NETWORKS as readonly string[]).includes(key) ? glyph(key as SocialNetwork, size, "currentColor").replace("<svg ", '<svg class="lp-bi" ') : "";
}

function glyph(network: SocialNetwork, size: number, textColor: string): string {
  const m = socialMeta(network);
  if (!m.icon) return `<b style="font-size:11px">${esc(m.mark)}</b>`;
  const hex = network === "instagram" ? "#e4405f" : `#${m.icon.hex}`;
  // Black logos (X, TikTok, Threads) use the page's text color so they show on dark pages.
  const color = /^#(000000|181717|0{3})$/i.test(hex) ? textColor : hex;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${esc(color)}" aria-hidden="true"><path d="${esc(m.icon.path)}"/></svg>`;
}

/** "HH", "MM", "SS" left until a countdown ends (repeats every 24h once passed). */
export function countdownParts(endsAt: string | undefined, now: number): [string, string, string] {
  const end = Date.parse(endsAt ?? "");
  if (!Number.isFinite(end) || !now) return ["--", "--", "--"];
  const day = 86_400_000;
  let left = end - now;
  if (left <= 0) left = day - ((now - end) % day);
  const s = Math.floor(left / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return [pad(Math.min(99, Math.floor(s / 3600))), pad(Math.floor((s % 3600) / 60)), pad(s % 60)];
}

const FONTS = {
  sans: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  serif: "Georgia,'Times New Roman',serif",
  mono: "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
};

export const LANDING_CSS = `.lp{position:relative;min-height:100%;width:100%;display:flex;justify-content:center;overflow:hidden;-webkit-font-smoothing:antialiased;box-sizing:border-box;isolation:isolate}.lp *{box-sizing:border-box}.lp p,.lp h1{margin:0}
.lp-bd{position:absolute;inset:-60px;z-index:-1;background:var(--bg) center/cover;filter:blur(40px) brightness(.55);transform:scale(1.1)}
.lp-col{position:relative;width:100%;max-width:34rem;min-height:100%;display:flex;flex-direction:column;align-items:center;padding-bottom:2.5rem;overflow:hidden;isolation:isolate}
.lp-cbg{position:absolute;inset:-48px;z-index:-2;background:var(--bg) center top/cover;filter:blur(38px) saturate(1.35) brightness(.62);transform:scale(1.15)}.lp-tint{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 0%,transparent 35%,var(--tint) 100%)}
.lp-hero{position:relative;width:100%;aspect-ratio:393.6/356.11;overflow:hidden;background:var(--accent);-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}.lp-hi{position:absolute;inset:0;background-size:cover;background-repeat:no-repeat}
.lp-head{position:relative;z-index:1;width:100%;padding:0 1.25rem;display:flex;flex-direction:column;align-items:center;text-align:center}.lp-head{margin-top:-5.5rem}
.lp-name{margin-top:.75rem!important;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.4rem;overflow-wrap:anywhere;font-size:1.75rem;font-weight:800;line-height:1.15;text-shadow:0 2px 12px rgba(0,0,0,.35)}.lp-name.wide{text-transform:uppercase;letter-spacing:.18em;font-size:2rem}
.lp-on{margin-top:.5rem!important;display:inline-flex;align-items:center;gap:.4rem;padding:.25rem .7rem;border-radius:9999px;background:rgba(34,197,94,.14);border:1px solid rgba(34,197,94,.35);color:#4ade80;font-size:.8rem;font-weight:700}.lp-on i{position:relative;width:.55rem;height:.55rem;border-radius:9999px;background:#22c55e}.lp-on i::after{content:"";position:absolute;inset:0;border-radius:9999px;background:#22c55e;animation:lp-ping 1.6s cubic-bezier(0,0,.2,1) infinite}@keyframes lp-ping{75%,100%{transform:scale(2.4);opacity:0}}
.lp-handle{margin-top:.35rem!important;font-size:.95rem;font-weight:500;opacity:.85}.lp-bio{margin-top:.4rem!important;font-size:.95rem;line-height:1.5;color:var(--muted);white-space:pre-line}
.lp-soc{margin-top:1rem;display:flex;flex-wrap:wrap;justify-content:center;gap:.6rem}.lp-si{display:flex;width:42px;height:42px;align-items:center;justify-content:center;border-radius:9999px;background:var(--chip);border:1px solid var(--line);text-decoration:none;transition:transform .15s}.lp-si:hover{transform:scale(1.06)}
.lp-list{position:relative;z-index:1;margin-top:1.75rem;width:100%;padding:0 1.25rem;display:flex;flex-direction:column;gap:.9rem}.lp-grid{display:grid;grid-template-columns:1fr 1fr;gap:.9rem}
.lp-btn{display:flex;min-height:3.25rem;width:100%;align-items:center;justify-content:center;padding:.75rem 1.25rem;font-weight:700;font-size:1rem;text-decoration:none;border-radius:var(--r);transition:transform .15s,filter .15s;cursor:pointer;text-align:center}.lp-btn:hover{filter:brightness(1.05)}.lp-btn:active{transform:scale(.98)}
.lp-main{background:var(--accent);color:var(--on)}.lp-link{background:var(--lb);color:var(--lt);border:var(--lbd);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 8px 24px -12px rgba(0,0,0,.5)}
.lp-card{position:relative;display:block;overflow:hidden;border-radius:var(--r2);background:var(--card);aspect-ratio:16/10;color:#fff;text-decoration:none;cursor:pointer;transition:transform .2s;box-shadow:0 12px 30px -14px rgba(0,0,0,.6)}.lp-btn:hover,.lp-card:hover{transform:translateY(-2px)}.lp-card:active{transform:scale(.985)}.lp-card.sm{aspect-ratio:4/5}.lp-card.hl{border:3px solid var(--accent);box-shadow:0 0 24px -6px var(--accent)}
.lp-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(0,0,0,.65) 100%)}.lp-ct{position:absolute;z-index:1;left:.75rem;right:.75rem;bottom:.85rem;text-align:center;font-weight:800;font-size:1.15rem;line-height:1.2;text-shadow:0 1px 8px rgba(0,0,0,.6)}.lp-card.sm .lp-ct{font-size:.95rem}
.lp-pi{position:absolute;z-index:1;top:.6rem;right:.6rem;display:flex;width:32px;height:32px;align-items:center;justify-content:center;border-radius:9999px;background:rgba(20,20,22,.6);border:1px solid rgba(255,255,255,.25);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}

.lp-text{padding:1rem 1.1rem;border-radius:var(--r2);background:var(--card);border:1px solid var(--line);text-align:left}.lp-text b{display:block;font-size:.95rem}.lp-text p{margin-top:.25rem!important;font-size:.9rem;line-height:1.5;color:var(--muted);white-space:pre-line}
.lp-cd{display:flex;flex-direction:column;align-items:center;gap:.6rem;padding:.25rem 0}.lp-cd b{font-size:.95rem}.lp-cdb{display:flex;align-items:center;gap:.6rem;padding:.75rem 1.4rem;border-radius:var(--r2);background:var(--chip);border:1px solid var(--line);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}.lp-cdb span{display:flex;flex-direction:column;align-items:center;min-width:3.2rem;font-size:2rem;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}.lp-cdb small{margin-top:.35rem;font-size:.6rem;font-weight:600;letter-spacing:.08em;color:var(--muted)}.lp-cdb i{font-style:normal;font-size:1.6rem;font-weight:800;margin-top:-1rem}
.lp-btn.z-s{min-height:2.6rem;padding:.5rem 1rem;font-size:.9rem}.lp-btn.z-l{min-height:4.25rem;font-size:1.2rem}.lp-card.z-s{aspect-ratio:16/7}.lp-card.z-l{aspect-ratio:1/1}.lp-card.sm.z-s{aspect-ratio:1/1}.lp-card.sm.z-l{aspect-ratio:2/3}.lp-card.z-l .lp-ct{font-size:1.4rem}
.lp-text.z-s{padding:.65rem .9rem}.lp-text.z-s b{font-size:.85rem}.lp-text.z-s p{font-size:.8rem}.lp-text.z-l{padding:1.4rem}.lp-text.z-l b{font-size:1.2rem}.lp-text.z-l p{font-size:1.02rem}.lp-cd.z-s .lp-cdb span{min-width:2.4rem;font-size:1.4rem}.lp-cd.z-s .lp-cdb i{font-size:1.1rem;margin-top:-.7rem}.lp-cd.z-l .lp-cdb span{min-width:4rem;font-size:2.7rem}.lp-cd.z-l .lp-cdb i{font-size:2.1rem}
.lp-btn{gap:.55rem}.lp-bi{flex-shrink:0}
/* Icons sit inside the text and are sized from it, so they line up with the letters at every text size. */
.lp-btn .lp-bi,.lp-ct .lp-bi,.lp-text b .lp-bi{display:inline-block;width:1.2em;height:1.2em;margin-right:.45em;vertical-align:-.24em}
.lp-it{animation:lp-in .6s cubic-bezier(.2,.8,.2,1) both}.lp-it:nth-child(2){animation-delay:.08s}.lp-it:nth-child(3){animation-delay:.16s}.lp-it:nth-child(4){animation-delay:.24s}.lp-it:nth-child(5){animation-delay:.32s}.lp-it:nth-child(6){animation-delay:.4s}.lp-it:nth-child(n+7){animation-delay:.48s}.lp.pv .lp-it{animation:none}
@keyframes lp-in{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:none}}
.a-pulse{animation:lp-pulse 1.8s ease-in-out infinite}@keyframes lp-pulse{50%{transform:scale(1.035)}}
.a-shake{animation:lp-shake 3s ease-in-out infinite}@keyframes lp-shake{0%,86%,100%{transform:none}88%{transform:rotate(-2deg)}90%{transform:rotate(2deg)}92%{transform:rotate(-2deg)}94%{transform:rotate(1.5deg)}96%{transform:rotate(0)}}
.a-glow{animation:lp-glow 2s ease-in-out infinite}@keyframes lp-glow{0%,100%{box-shadow:0 0 0 0 var(--accent)}50%{box-shadow:0 0 22px 2px var(--accent)}}
.a-bounce{animation:lp-bounce 2.2s ease-in-out infinite}@keyframes lp-bounce{0%,60%,100%{transform:none}30%{transform:translateY(-6px)}45%{transform:translateY(0)}52%{transform:translateY(-2px)}}
.a-shine{position:relative;overflow:hidden}.a-shine::before{content:"";position:absolute;z-index:2;top:0;bottom:0;left:-60%;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-20deg);animation:lp-shine 2.8s ease-in-out infinite;pointer-events:none}@keyframes lp-shine{0%,55%{left:-60%}100%{left:130%}}
.lp-ci{position:absolute;inset:0;background-size:cover;background-repeat:no-repeat}
.lp.pv [data-edit]::after{content:"";display:inline-block;flex-shrink:0;width:.95em;height:.95em;max-width:16px;max-height:16px;margin-left:.35em;vertical-align:-.1em;border-radius:9999px;background:currentColor;opacity:.7;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 20h9'/%3E%3Cpath d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'/%3E%3C/svg%3E") center/70% no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 20h9'/%3E%3Cpath d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'/%3E%3C/svg%3E") center/70% no-repeat}
.lp-nudge{position:absolute;z-index:3;right:.6rem;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:.35rem}.lp-nudge i{display:flex;width:2.1rem;height:2.1rem;align-items:center;justify-content:center;border-radius:9999px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.3);color:#fff;font-style:normal;font-size:1rem;font-weight:700;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}.lp-nudge i:hover{background:rgba(0,0,0,.8)}
.lp-tip{position:absolute;z-index:2;left:50%;top:.75rem;transform:translateX(-50%);padding:.3rem .7rem;border-radius:9999px;background:rgba(0,0,0,.6);color:#fff;font-size:.75rem;font-weight:600;white-space:nowrap;pointer-events:none;opacity:.85;transition:opacity .2s}.lp-card .lp-tip{top:auto;bottom:2.6rem;opacity:0}.lp-card:hover .lp-tip{opacity:.9}
.lp-addc{position:absolute;z-index:2;left:50%;top:45%;transform:translate(-50%,-50%);padding:.6rem 1rem;border-radius:9999px;background:rgba(0,0,0,.55);color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;white-space:nowrap}
.lp-link{-webkit-touch-callout:default}.lp-hint{margin-top:-.2rem!important;text-align:center;font-size:.8rem;color:var(--muted)}
.lp-add1{grid-template-columns:1fr!important}.lp-add{margin-top:.25rem;display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem;padding:.6rem;border:2px dashed var(--line);border-radius:var(--r2)}.lp-add p{grid-column:1/-1;text-align:center;font-size:.8rem;color:var(--muted)}.lp-add span{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.15rem;padding:.5rem .2rem;border-radius:12px;background:var(--chip);font-size:.72rem;font-weight:700;line-height:1.15;text-align:center;cursor:pointer}.lp-add span:hover{background:var(--line)}
.lp.pv .lp-sel{position:relative;overflow:visible}.lp-tools{position:absolute;z-index:5;top:-1.1rem;right:.5rem;display:flex;gap:2px;padding:3px;border-radius:9999px;background:#111113;border:1px solid #49f264;box-shadow:0 6px 16px rgba(0,0,0,.4)}.lp-tools i{display:flex;width:1.9rem;height:1.9rem;align-items:center;justify-content:center;border-radius:9999px;color:#fff;font-style:normal;font-size:.9rem;font-weight:700;cursor:pointer}.lp-tools i:hover{background:rgba(255,255,255,.15)}
.lp.pv [data-edit]{cursor:text;border-radius:6px;transition:box-shadow .15s}.lp.pv [data-edit]:hover{box-shadow:0 0 0 2px rgba(255,255,255,.75),0 0 0 4px rgba(0,0,0,.25)}.lp.pv [data-drag]{cursor:grab}.lp.pv [data-drag]:active{cursor:grabbing}.lp.pv .lp-sel{box-shadow:0 0 0 2px #49f264,0 0 0 4px rgba(0,0,0,.4)!important}
@media (prefers-reduced-motion:reduce){.lp *{animation:none!important}}
.lp-foot{margin-top:auto;padding-top:2.5rem;display:flex;flex-direction:column;align-items:center;gap:2rem}.lp-mark{margin-top:3.5rem;font-size:.75rem;font-weight:500;color:var(--muted);text-decoration:none;transition:color .15s}.lp-mark:hover{color:var(--text)}.lp-legal{display:flex;gap:1rem}.lp-legal button,.lp-legal span{border:0;background:none;padding:.2rem;font:inherit;font-size:.72rem;font-weight:600;color:var(--muted);cursor:pointer}.lp-legal button:hover{color:var(--text)}
.lp-sheet h2{margin:0;font-size:1.15rem}.lp-sheet>p{margin-top:.5rem!important;font-size:.88rem;line-height:1.55;color:var(--muted);text-align:left}.lp-sheet ul{margin:.75rem 0 0;padding-left:1.1rem;text-align:left;font-size:.85rem;line-height:1.6;color:var(--muted)}.lp-reasons{margin-top:1rem;display:grid;gap:.4rem;text-align:left}.lp-reasons label{display:flex;align-items:center;gap:.55rem;padding:.6rem .75rem;border-radius:12px;background:var(--chip);border:1px solid var(--line);font-size:.88rem;cursor:pointer}.lp-reasons input{accent-color:var(--accent)}.lp-sheet textarea{margin-top:.6rem;width:100%;min-height:4.5rem;resize:vertical;padding:.6rem .75rem;border-radius:12px;border:1px solid var(--line);background:var(--chip);color:var(--text);font:inherit;font-size:.85rem}.lp-sheet .lp-btn{margin-top:1rem;border:0;font:inherit;font-weight:700}.lp-done{display:none}.lp-sent .lp-form{display:none}.lp-sent .lp-done{display:block}
.lp-pop{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:1.25rem;background:rgba(0,0,0,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}.lp-pop.pv{position:absolute}
.lp-box{width:100%;max-width:22rem;border-radius:20px;background:var(--card);border:1px solid var(--line);padding:1.75rem 1.4rem 1.25rem;text-align:center;color:var(--text);box-shadow:0 25px 50px -12px rgba(0,0,0,.5)}.lp-box .lp-big{font-size:2.5rem;font-weight:900;color:var(--accent);line-height:1}.lp-box h2{margin:.6rem 0 0;font-size:1.25rem}.lp-box p{margin-top:.5rem!important;font-size:.9rem;line-height:1.5;color:var(--muted)}.lp-box .lp-btn{margin-top:1.25rem}.lp-no{display:block;width:100%;margin-top:.5rem;padding:.6rem;border:0;background:none;color:var(--muted);font:inherit;font-size:.875rem;cursor:pointer}`;

const VERIFIED = (size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="Verified" style="flex-shrink:0"><path fill="#1d9bf0" d="M12 1.5l2.4 1.8 3-.2 1 2.8 2.6 1.6-.7 2.9 1.2 2.7-2.2 2 .1 3-2.9.8-1.6 2.6-2.9-.8L12 22.5l-2.4-1.8-2.9.8-1.6-2.6-2.9-.8.1-3-2.2-2 1.2-2.7-.7-2.9L3.2 5.9l1-2.8 3 .2Z"/><path d="m8 12.2 2.7 2.7L16.2 9.4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export type AgeCopy = { title: string; message: string; button: string; leave: string };
export const DEFAULT_AGE_COPY: AgeCopy = {
  title: "Adults only",
  message: "This link leads to content intended for adults. Please confirm you're 18 or older to continue.",
  button: "I'm 18 or older, continue",
  leave: "Take me back",
};

export type LandingRenderInput = {
  page: LandingPage;
  fallbackName: string;
  showBadge: boolean;
  age?: AgeCopy;
  preview?: boolean;
  /** Preview only: the time used for countdowns (0 = not known yet). */
  now?: number;
  /** Preview only: show the 18+ popup for this section. */
  popupFor?: string | null;
  /** Preview only: outline this section (being edited). */
  selected?: string | null;
  /** Live page: the link's name, sent with reports. */
  slug?: string;
  /** Which step to draw: 1 = the simple page (Step 1), 2 (default) = the full page. */
  step?: 1 | 2;
  /** Where Step 1's button goes when it has no link of its own: Step 2's address (press and hold → Open Link). */
  step2Href?: string;
  /** Inside a social app: the link that opens Step 2 in the phone's browser, tried when the button is tapped. */
  step2Deep?: string;
};

export function landingHtml({
  page: full,
  fallbackName,
  showBadge,
  age = DEFAULT_AGE_COPY,
  preview,
  now = 0,
  popupFor,
  selected,
  slug,
  step = 2,
  step2Href = "#",
  step2Deep,
}: LandingRenderInput): string {
  // Step 1: its own cover, name, username and bio (nothing is borrowed from Step 2), no social icons, and only its one
  // button (to Step 2 unless it has its own link). "{NAME}" in titles becomes the step's name.
  const view: LandingPage =
    step === 1
      ? {
          ...full,
          coverUrl: full.introCoverUrl,
          coverX: full.introCoverX,
          coverY: full.introCoverY,
          coverZoom: full.introCoverZoom,
          name: full.introName,
          handle: full.introHandle,
          bio: full.introBio,
          socials: [],
          sections: full.introSections.map((s) => (s.url ? s : { ...s, url: step2Href, deep: step2Deep })),
        }
      : full;
  const viewName = view.name || fallbackName;
  const p: LandingPage = {
    ...view,
    sections: view.sections.map((s) => (s.title.includes(NAME_TOKEN) ? { ...s, title: s.title.split(NAME_TOKEN).join(viewName) } : s)),
  };
  const dark = p.theme === "dark";
  const vars = dark
    ? {
        bg: "#111113",
        text: "#f7f7f8",
        muted: "#b4b4bd",
        card: "#1d1d21",
        line: "rgba(255,255,255,.16)",
        chip: "rgba(255,255,255,.08)",
        glass: "rgba(255,255,255,.1)",
        tint: "rgba(10,10,12,.55)",
      }
    : {
        bg: "#f6f6f7",
        text: "#111113",
        muted: "#55555f",
        card: "#ffffff",
        line: "rgba(0,0,0,.1)",
        chip: "rgba(0,0,0,.05)",
        glass: "rgba(255,255,255,.65)",
        tint: "rgba(246,246,247,.7)",
      };
  const r = p.buttonShape === "pill" ? "9999px" : p.buttonShape === "rounded" ? "16px" : "4px";
  const r2 = p.buttonShape === "square" ? "4px" : "18px";
  const look = (style: ButtonStyle, color: string, text: string) => {
    const solidBg = color || p.accent;
    return style === "solid"
      ? { bg: solidBg, text: text || onColor(solidBg), border: `1px solid ${solidBg}` }
      : style === "outline"
        ? { bg: "transparent", text: text || vars.text, border: `2px solid ${color || p.accent}` }
        : { bg: color ? `${color}55` : vars.glass, text: text || vars.text, border: `1px solid ${vars.line}` };
  };
  const btn = look(p.btnStyle, p.btnColor, p.btnText);
  const style = `--bg:${vars.bg};--text:${vars.text};--muted:${vars.muted};--card:${vars.card};--line:${vars.line};--chip:${vars.chip};--glass:${vars.glass};--tint:${p.bgColor || vars.tint};--lb:${btn.bg};--lt:${btn.text};--lbd:${btn.border};--accent:${p.accent};--on:${onColor(p.accent)};--r:${r};--r2:${r2};color:${vars.text};font-family:${FONTS[p.font]}`;
  const name = p.name || fallbackName;
  const link = (href: string, cls: string, inner: string, extra = "") =>
    preview ? `<span class="${cls}"${extra}>${inner}</span>` : `<a href="${esc(href)}" rel="nofollow noopener" class="${cls}"${extra}>${inner}</a>`;
  const bgImage = (url: string) => `background-image:url('${esc(url)}')`;
  const backdrop = p.coverUrl;
  // Preview only: hooks for editing straight on the phone (click text, drag photos).
  const edit = (key: string) => (preview ? ` data-edit="${esc(key)}"` : "");
  const frame = (x = 50, y = 50, z = 1) => `background-position:${x}% ${y}%;transform:scale(${z});transform-origin:${x}% ${y}%`;
  // The cover keeps a fixed frame (393.6 × 356.11); the creator picks the focus point and zoom.
  const heroImg = p.coverUrl ? `<div class="lp-hi" style="${bgImage(p.coverUrl)};${frame(p.coverX, p.coverY, p.coverZoom)}"></div>` : "";
  const heroHint = preview
    ? p.coverUrl
      ? `<span class="lp-tip">✥ Drag to move · ✎ tap text to edit</span><span class="lp-nudge"><i data-act="cover:up" title="Move photo up">↑</i><i data-act="cover:down" title="Move photo down">↓</i></span>`
      : `<span class="lp-addc" data-add="cover">＋ Add cover photo</span>`
    : "";
  const hero = `<div class="lp-hero"${preview && p.coverUrl ? ` data-drag="cover"` : ""}${p.coverUrl ? "" : ` style="background:linear-gradient(160deg,${p.accent},${vars.bg})"`}>${heroImg}${heroHint}</div>`;
  const heading = preview ? "p" : "h1";
  const nf = p.nameFont ? NAME_FONTS[p.nameFont] : null;
  const nameFontStyle = nf || !p.nameBold ? ` style="${fontCss(p.nameFont, p.nameBold)}"` : "";
  // Live page: load only the letters of the name (tiny download). The preview loads the fonts itself.
  const fontKeys = [p.nameFont, ...p.sections.map((s) => s.font ?? "")].filter(Boolean);
  const fontText = [name, ...p.sections.map((s) => s.title)].join("");
  const nameFontLink = fontKeys.length && !preview ? `<link rel="stylesheet" href="${esc(nameFontsHref(fontKeys, fontText + fontText.toUpperCase()))}">` : "";
  const socials = p.socials.filter((s) => s.handle);
  const head =
    `<div class="lp-head">` +
    `<${heading} class="lp-name${p.nameStyle === "wide" ? " wide" : ""}"${nameFontStyle}><span${edit("name")}>${esc(name)}</span>${p.verified ? VERIFIED(p.nameStyle === "wide" ? 26 : 24) : ""}</${heading}>` +
    (p.handle || preview ? `<p class="lp-handle"${edit("handle")}>${esc(p.handle || "@username")}</p>` : "") +
    (p.availableNow ? `<p class="lp-on"><i aria-hidden="true"></i>Available now</p>` : "") +
    (p.bio || preview ? `<p class="lp-bio"${edit("bio")}>${esc(p.bio || "Add a bio")}</p>` : "") +
    (socials.length
      ? `<div class="lp-soc">${socials
          .map((s) => {
            const m = socialMeta(s.network);
            const href = /^https?:\/\//i.test(s.handle) ? s.handle : m.href(s.handle);
            return link(href, "lp-si", glyph(s.network, 20, vars.text), ` aria-label="${esc(m.label)}"${preview ? "" : " data-tap=\"\""}`);
          })
          .join("")}</div>`
      : "") +
    `</div>`;

  const sel = (s: LandingSection) => (preview && selected === s.id ? " lp-sel" : "");
  // Preview only: a small toolbar on the selected section.
  const tools = (s: LandingSection) =>
    preview && selected === s.id
      ? `<span class="lp-tools"><i data-act="up:${esc(s.id)}" title="Move up">↑</i><i data-act="down:${esc(s.id)}" title="Move down">↓</i><i data-act="style:${esc(s.id)}" title="Style">🎨</i><i data-act="dup:${esc(s.id)}" title="Duplicate">⧉</i><i data-act="del:${esc(s.id)}" title="Delete">✕</i></span>`
      : "";
  const secAttr = (s: LandingSection) => (preview ? ` data-sec="${esc(s.id)}"` : "");
  // Text size: scales the block's text from its normal size.
  const ts = (s: LandingSection) => {
    const size = s.textSize && s.textSize !== "m" ? `font-size:${TEXT_SCALE[s.textSize]}em;` : "";
    const font = s.font || s.bold === false ? fontCss(s.font, s.bold) : "";
    return size || font ? ` style="${size}${font}"` : "";
  };
  const zc = (s: LandingSection) => (s.scale === "s" ? " z-s" : s.scale === "l" ? " z-l" : "");
  const card = (s: LandingSection) => {
    if (!s.url && !preview) return "";
    const href = s.url ?? "";
    const anim = s.anim && s.anim !== "none" ? ` a-${s.anim}` : "";
    if (!s.imageUrl) {
      if (!s.title && !preview) return "";
      // A section's own style (or just its colors) overrides the page's link-button look.
      const own =
        s.style || s.color || s.textColor
          ? look(s.style || p.btnStyle, s.color || (s.style ? "" : p.btnColor), s.textColor || (s.style ? "" : p.btnText))
          : null;
      const ownVars = own ? ` style="--lb:${own.bg};--lt:${own.text};--lbd:${own.border}"` : "";
      return link(
        href,
        `lp-btn lp-link${zc(s)}${anim}${sel(s)}`,
        `${tools(s)}<span${edit(`sec:${s.id}:title`)}${ts(s)}>${blockIconHtml(s.icon, s.url)}${esc(s.title || "Link title")}</span>`,
        `${ownVars}${secAttr(s)}${s.deep && !preview ? ` data-deep="${esc(s.deep)}"` : ""}${!s.deep && !preview ? ` data-tap=""` : ""}`,
      );
    }
    const net = networkOfUrl(href);
    const inner =
      tools(s) +
      `<div class="lp-ci" style="${bgImage(s.imageUrl)};${frame(s.imgX, s.imgY, s.imgZoom)}"${preview ? ` data-drag="sec:${esc(s.id)}"` : ""}></div>` +
      (preview ? `<span class="lp-tip">✥ Drag to move</span>` : "") +
      (net ? `<span class="lp-pi">${glyph(net, 16, "#ffffff")}</span>` : "") +
      (s.title || preview
        ? `<span class="lp-ct"${s.textColor ? ` style="color:${s.textColor}"` : ""}>${s.icon && s.icon !== "auto" ? blockIconHtml(s.icon, s.url, 18) : ""}<span${edit(`sec:${s.id}:title`)}${ts(s)}>${esc(s.title || "Title")}</span></span>`
        : "");
    const cardStyle = s.color ? ` style="--accent:${s.color}"` : "";
    return link(
      href,
      `lp-card${zc(s)}${s.size === "small" ? " sm" : ""}${s.highlight || s.color ? " hl" : ""}${anim}${sel(s)}`,
      inner,
      `${cardStyle}${secAttr(s)}${preview ? "" : ` data-tap=""`}`,
    );
  };
  const boxStyle = (s: LandingSection) =>
    s.color || s.textColor
      ? ` style="${s.color ? `background:${s.color};border-color:${s.color};` : ""}${s.textColor ? `color:${s.textColor};--muted:${s.textColor}cc` : ""}"`
      : "";

  // Consecutive small photo cards sit two per row.
  const blocks: string[] = [];
  let row: string[] = [];
  const flush = () => {
    if (row.length) blocks.push(`<div class="lp-grid">${row.join("")}</div>`);
    row = [];
  };
  for (const s of p.sections) {
    if (s.kind === "link" && s.imageUrl && s.size === "small") {
      const html = card(s);
      if (html) row.push(html);
      continue;
    }
    flush();
    if (s.kind === "link") blocks.push(card(s));
    else if (s.kind === "text") {
      if (s.title || s.body || preview)
        blocks.push(
          `<div class="lp-text${zc(s)}${sel(s)}"${boxStyle(s)}${secAttr(s)}>${tools(s)}${s.title || preview ? `<b>${blockIconHtml(s.icon ?? "none", undefined, 18)}<span${edit(`sec:${s.id}:title`)}${ts(s)}>${esc(s.title || "Heading")}</span></b>` : ""}${s.body || preview ? `<p${edit(`sec:${s.id}:body`)}${ts(s)}>${esc(s.body || "Write something")}</p>` : ""}</div>`,
        );
    } else {
      const [h, m, sec] = countdownParts(s.endsAt, now);
      blocks.push(
        `<div class="lp-cd${zc(s)}${sel(s)}"${s.endsAt ? ` data-end="${esc(s.endsAt)}"` : ""}${secAttr(s)}${s.textColor ? ` style="color:${s.textColor};--muted:${s.textColor}cc"` : ""}>${tools(s)}${s.title || preview ? `<b${edit(`sec:${s.id}:title`)}${ts(s)}>${esc(s.title || "Countdown title")}</b>` : ""}<div class="lp-cdb"${s.color ? ` style="background:${s.color};border-color:${s.color}"` : ""}>` +
          `<span data-u="h">${h}<small>HOURS</small></span><i>:</i><span data-u="m">${m}<small>MINUTES</small></span><i>:</i><span data-u="s">${sec}<small>SECONDS</small></span></div></div>`,
      );
    }
  }
  flush();

  // "Made with" sits right under the content; Report · Privacy stay at the very bottom.
  const madeWith = showBadge
    ? preview
      ? `<span class="lp-mark">Made with ${esc(brand.name)}</span>`
      : `<a class="lp-mark" href="https://${brand.domain}" target="_blank" rel="noopener">Made with ${esc(brand.name)}</a>`
    : "";
  const footer =
    `<div class="lp-foot">` +
    (preview
      ? `<div class="lp-legal"><span>Report</span><span>Privacy</span></div>`
      : `<div class="lp-legal"><button type="button" data-pop="lp-report">Report</button><button type="button" data-pop="lp-privacy">Privacy</button></div>`) +
    `</div>`;
  // Live page only: the Report and Privacy popups.
  const sheets = preview
    ? ""
    : `<div class="lp-pop" role="dialog" aria-modal="true" aria-label="Report this page" hidden id="lp-report"><div class="lp-box lp-sheet"><form class="lp-form" data-slug="${esc(slug ?? "")}">` +
      `<h2>Report this page</h2><p>Tell us what's wrong. Reports are anonymous and reviewed by the ${esc(brand.name)} team.</p><div class="lp-reasons">` +
      REPORT_REASONS.map((r, i) => `<label><input type="radio" name="reason" value="${esc(r)}"${i === 0 ? " required" : ""}> ${esc(r)}</label>`).join("") +
      `</div><textarea name="details" maxlength="500" placeholder="Anything else? (optional)"></textarea><button type="submit" class="lp-btn lp-main">Send report</button><button type="button" class="lp-no" data-close>Cancel</button></form>` +
      `<div class="lp-done"><h2>Thanks for letting us know</h2><p>We'll review this page.</p><button type="button" class="lp-btn lp-main" data-close>Close</button></div></div></div>` +
      `<div class="lp-pop" role="dialog" aria-modal="true" aria-label="Privacy" hidden id="lp-privacy"><div class="lp-box lp-sheet"><h2>Privacy</h2>` +
      `<p>This page is hosted by ${esc(brand.name)} for its creator.</p><ul><li>No ads and no tracking cookies.</li><li>We count visits so the creator sees simple stats (country, device). Your IP address is never stored: it is turned into a code that changes every day.</li><li>Links take you to other sites, which have their own privacy rules.</li></ul>` +
      `<button type="button" class="lp-btn lp-main" data-close>Got it</button></div></div>`;
  const popupSection = preview && popupFor ? p.sections.find((s) => s.id === popupFor && s.adult) : null;
  const popup =
    !preview || popupSection
      ? `<div class="lp-pop${preview ? " pv" : ""}" role="dialog" aria-modal="true" aria-label="${esc(age.title)}"${preview ? "" : " hidden"} id="lp-age">` +
        `<div class="lp-box"><div class="lp-big">18+</div><h2>${esc(age.title)}</h2><p>${esc(age.message)}</p>` +
        (preview
          ? `<span class="lp-btn lp-main">${esc(age.button)}</span><span class="lp-no">${esc(age.leave)}</span>`
          : `<a class="lp-btn lp-main" id="lp-yes" rel="nofollow noopener" href="#">${esc(age.button)}</a><button type="button" class="lp-no" id="lp-no">${esc(age.leave)}</button>`) +
        `</div></div>`
      : "";

  return (
    nameFontLink +
    `<div class="lp${preview ? " pv" : ""}"${!preview && slug ? ` data-slug="${esc(slug)}"` : ""} style="${style}">` +
    `<div class="lp-bd" style="${backdrop ? bgImage(backdrop) : `background:radial-gradient(circle at 30% 20%,${p.accent}66,${vars.bg} 70%)`}"></div>` +
    `<div class="lp-col">${backdrop ? `<div class="lp-cbg" style="${bgImage(backdrop)}"></div>` : ""}<div class="lp-tint"></div>${hero}${head}<div class="lp-list">${blocks.map((b) => `<div class="lp-it">${b}</div>`).join("")}${preview ? (step === 1 ? (p.sections.length ? "" : ADD_BAR_STEP1) : ADD_BAR) : ""}${step === 1 && p.sections.length ? `<p class="lp-hint">Press and hold, then choose Open Link.</p>` : ""}</div>` +
    madeWith +
    footer +
    `</div>${popup}${sheets}</div>`
  );
}

const ADD_BAR_STEP1 = `<div class="lp-add lp-add1"><p>Step 1 has one button</p><span data-add="link"><b>🔗</b>Add button</span></div>`;
const ADD_BAR = `<div class="lp-add"><p>Add a section</p><span data-add="link"><b>🔗</b>Link</span><span data-add="photo"><b>🖼️</b>Photo</span><span data-add="text"><b>✏️</b>Text</span><span data-add="countdown"><b>⏱️</b>Timer</span></div>`;

/** In section titles, replaced by the page's name ("Continue to {NAME}"). */
export const NAME_TOKEN = "{NAME}";

/** Step 1's default button. */
/** Step 1's default button: light, "Hold to open" (a long press in the app offers Open Link). */
export const defaultIntroSection = () =>
  newSection("link", { title: "Hold to open", style: "solid", color: "#e8e8ea", textColor: "#111113", icon: "hand" });

export type Profile = Pick<LandingPage, "name" | "handle" | "bio" | "coverUrl" | "coverX" | "coverY" | "coverZoom">;

/** The profile fields a step edits: Step 2 uses the page's, Step 1 its own (intro*) ones. */
export function profileOf(p: LandingPage, step: 1 | 2): Profile {
  return step === 1
    ? {
        name: p.introName,
        handle: p.introHandle,
        bio: p.introBio,
        coverUrl: p.introCoverUrl,
        coverX: p.introCoverX,
        coverY: p.introCoverY,
        coverZoom: p.introCoverZoom,
      }
    : { name: p.name, handle: p.handle, bio: p.bio, coverUrl: p.coverUrl, coverX: p.coverX, coverY: p.coverY, coverZoom: p.coverZoom };
}

/** Turns a profile change into a page change for that step. */
export function profilePatch(step: 1 | 2, patch: Partial<Profile>): Partial<LandingPage> {
  if (step === 2) return patch;
  const map = {
    name: "introName",
    handle: "introHandle",
    bio: "introBio",
    coverUrl: "introCoverUrl",
    coverX: "introCoverX",
    coverY: "introCoverY",
    coverZoom: "introCoverZoom",
  } as const;
  return Object.fromEntries(Object.entries(patch).map(([k, v]) => [map[k as keyof Profile], v])) as Partial<LandingPage>;
}

/** A new, empty section of a kind (used by the settings and the phone preview). */
export function newSection(kind: LandingSection["kind"], extra: Partial<LandingSection> = {}): LandingSection {
  const id = Math.random().toString(36).slice(2, 10);
  const base = { id, kind, title: "" };
  const s: LandingSection =
    kind === "link"
      ? { ...base, url: "", imageUrl: "", size: "large", highlight: false, adult: false, anim: "none", icon: "auto" }
      : kind === "text"
        ? { ...base, body: "" }
        : { ...base, title: "50% off ends in", endsAt: new Date(Date.now() + 86_400_000).toISOString() };
  return { ...s, ...extra };
}

export const REPORT_REASONS = ["Content involving minors", "Scam or fraud", "Impersonation", "Hate or harassment", "Spam or malware", "Something else"];

/** Live page only: Report and Privacy popups (reports are sent to /api/link-report). */
export const LANDING_SHEETS_JS = `(function(){var d=document;d.addEventListener("click",function(e){var o=e.target.closest&&e.target.closest("[data-pop]");if(o){var p=d.getElementById(o.getAttribute("data-pop"));if(p){p.hidden=false;p.classList.remove("lp-sent")}return}var c=e.target.closest&&e.target.closest("[data-close]");if(c||(e.target.classList&&e.target.classList.contains("lp-pop")&&e.target.id!=="lp-age")){var q=(c||e.target).closest(".lp-pop");if(q){q.hidden=true;var f=q.querySelector("form");if(f)f.reset()}}});d.addEventListener("submit",function(e){var f=e.target;if(!f.classList||!f.classList.contains("lp-form"))return;e.preventDefault();var b=f.querySelector("[type=submit]");b.disabled=true;var r=f.querySelector("input[name=reason]:checked");fetch("/api/link-report",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slug:f.getAttribute("data-slug"),reason:r?r.value:"",details:f.details.value})}).then(function(x){if(!x.ok)throw 0;b.disabled=false;f.closest(".lp-pop").classList.add("lp-sent")}).catch(function(){b.disabled=false;b.textContent="Couldn’t send. Try again"})})})();`;

/** Live page only: countdowns tick, and 18+ links ask first. */
export const LANDING_JS = `(function(){document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("a[data-tap]"),r=document.querySelector(".lp[data-slug]");if(t&&r&&navigator.sendBeacon)navigator.sendBeacon("/api/link-tap",JSON.stringify({slug:r.getAttribute("data-slug")}))});document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[data-deep]");if(a){e.preventDefault();location.href=a.getAttribute("data-deep")}});var d=document,pop=d.getElementById("lp-age"),yes=d.getElementById("lp-yes");function pad(n){return(n<10?"0":"")+n}function tick(){var now=Date.now(),day=864e5;d.querySelectorAll(".lp-cd[data-end]").forEach(function(c){var e=Date.parse(c.getAttribute("data-end")),l=e-now;if(l<=0)l=day-((now-e)%day);var s=Math.floor(l/1e3),v={h:pad(Math.min(99,Math.floor(s/3600))),m:pad(Math.floor(s%3600/60)),s:pad(s%60)};c.querySelectorAll("[data-u]").forEach(function(x){x.firstChild.nodeValue=v[x.getAttribute("data-u")]})})}tick();setInterval(tick,1e3);d.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[data-adult]");if(a&&pop){e.preventDefault();yes.href=a.href;pop.hidden=false;return}if(e.target.id==="lp-no"||e.target===pop)pop.hidden=true})})();`;
