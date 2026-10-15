// Public-page theme presets (original designs, docs/spec.md §11).
// A page stores `themeKey` plus optional Pro `themeOverrides`.

export type FontKey = "sans" | "display" | "serif" | "mono";
export type ButtonStyle = "filled" | "outline" | "soft";

export type ThemeTokens = {
  background: string; // any CSS background value
  text: string;
  muted: string;
  buttonBg: string;
  buttonText: string;
  buttonBorder: string;
  buttonStyle: ButtonStyle;
  radius: number; // px
  font: FontKey;
};

export type ThemePreset = { key: string; name: string; pro: boolean; tokens: ThemeTokens };

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: "paper",
    name: "Paper",
    pro: false,
    tokens: {
      background: "#fbf8f2",
      text: "#1c1a24",
      muted: "#5f5a6b",
      buttonBg: "#ffffff",
      buttonText: "#1c1a24",
      buttonBorder: "#1c1a24",
      buttonStyle: "outline",
      radius: 14,
      font: "sans",
    },
  },
  {
    key: "midnight",
    name: "Midnight",
    pro: false,
    tokens: {
      background: "radial-gradient(120% 80% at 50% 0%, #2b1f63 0%, #120f24 60%)",
      text: "#f4f1ea",
      muted: "#b9b2d6",
      buttonBg: "#9a86ff",
      buttonText: "#120f24",
      buttonBorder: "#9a86ff",
      buttonStyle: "filled",
      radius: 999,
      font: "display",
    },
  },
  {
    key: "orchard",
    name: "Orchard",
    pro: false,
    tokens: {
      background: "linear-gradient(170deg, #e6f1e8 0%, #c9e2d2 100%)",
      text: "#173326",
      muted: "#3f5e4f",
      buttonBg: "#2f6b4d",
      buttonText: "#ffffff",
      buttonBorder: "#2f6b4d",
      buttonStyle: "filled",
      radius: 12,
      font: "sans",
    },
  },
  {
    key: "sunset",
    name: "Sunset",
    pro: false,
    tokens: {
      background: "linear-gradient(160deg, #ffb48a 0%, #f2643d 45%, #b8325e 100%)",
      text: "#ffffff",
      muted: "#ffe4d6",
      buttonBg: "rgba(255,255,255,0.18)",
      buttonText: "#ffffff",
      buttonBorder: "rgba(255,255,255,0.55)",
      buttonStyle: "soft",
      radius: 18,
      font: "display",
    },
  },
  {
    key: "mono",
    name: "Mono",
    pro: true,
    tokens: {
      background: "#0e0e10",
      text: "#ededed",
      muted: "#9a9a9f",
      buttonBg: "#0e0e10",
      buttonText: "#ededed",
      buttonBorder: "#ededed",
      buttonStyle: "outline",
      radius: 0,
      font: "mono",
    },
  },
  {
    key: "candyfloss",
    name: "Candyfloss",
    pro: true,
    tokens: {
      background: "linear-gradient(180deg, #fde2f3 0%, #e4e0ff 100%)",
      text: "#3b1f4f",
      muted: "#6c5480",
      buttonBg: "#ffffff",
      buttonText: "#3b1f4f",
      buttonBorder: "#f3c6e4",
      buttonStyle: "filled",
      radius: 999,
      font: "display",
    },
  },
  {
    key: "forest",
    name: "Forest",
    pro: true,
    tokens: {
      background: "#13261d",
      text: "#eef3e9",
      muted: "#a9bfa9",
      buttonBg: "#e9c46a",
      buttonText: "#13261d",
      buttonBorder: "#e9c46a",
      buttonStyle: "filled",
      radius: 6,
      font: "serif",
    },
  },
  {
    key: "neon",
    name: "Neon",
    pro: true,
    tokens: {
      background: "#07070c",
      text: "#f2f2ff",
      muted: "#9fa3c7",
      buttonBg: "rgba(0,255,200,0.08)",
      buttonText: "#00ffc8",
      buttonBorder: "#00ffc8",
      buttonStyle: "outline",
      radius: 10,
      font: "mono",
    },
  },
];

export const DEFAULT_THEME_KEY = "paper";

export type ThemeOverrides = Partial<Pick<ThemeTokens, "background" | "text" | "buttonBg" | "buttonText" | "font">>;

const HEX = /^#[0-9a-f]{6}$/i;

/** Accepts only hex colors and known fonts from user overrides. */
export function sanitizeOverrides(input: unknown): ThemeOverrides {
  if (!input || typeof input !== "object") return {};
  const src = input as Record<string, unknown>;
  const out: ThemeOverrides = {};
  for (const k of ["background", "text", "buttonBg", "buttonText"] as const) {
    if (typeof src[k] === "string" && HEX.test(src[k] as string)) out[k] = src[k] as string;
  }
  if (src.font === "sans" || src.font === "display" || src.font === "serif" || src.font === "mono") out.font = src.font;
  return out;
}

export function resolveTheme(themeKey: string, overrides: unknown, allowCustom: boolean): ThemeTokens {
  const preset = THEME_PRESETS.find((t) => t.key === themeKey && (allowCustom || !t.pro)) ?? THEME_PRESETS[0];
  if (!allowCustom) return preset.tokens;
  const o = sanitizeOverrides(overrides);
  return {
    ...preset.tokens,
    ...o,
    buttonBorder: o.buttonBg && preset.tokens.buttonStyle !== "soft" ? o.buttonBg : preset.tokens.buttonBorder,
  };
}

// --- WCAG contrast helpers (used by tests and the editor's contrast warning) ---
function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
