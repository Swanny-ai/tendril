// Optional color overrides a creator (Pro) can put on top of any 18+ design.
// Stored as SmartLink.warningColors (JSON); only valid hex colors are kept.
import type { WarningTemplate } from "./templates";

export const WARNING_COLOR_KEYS = ["pageBg", "cardBg", "text", "buttonBg", "buttonText"] as const;
export type WarningColorKey = (typeof WARNING_COLOR_KEYS)[number];
export type WarningColors = Partial<Record<WarningColorKey, string>>;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export const isHexColor = (s: unknown): s is string => typeof s === "string" && HEX.test(s);

/** "#abc" / "#AABBCC" → "#aabbcc". */
export function normalizeHex(s: string): string {
  const h = s.toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
}

/** Keeps only known keys with valid hex values; null when nothing is left. */
export function parseWarningColors(value: unknown): WarningColors | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: WarningColors = {};
  for (const k of WARNING_COLOR_KEYS) {
    const c = (value as Record<string, unknown>)[k];
    if (isHexColor(c)) out[k] = normalizeHex(c);
  }
  return Object.keys(out).length ? out : null;
}

/** The design with the creator's colors applied (secondary text follows the text color). */
export function applyWarningColors(t: WarningTemplate, colors: WarningColors | null | undefined): WarningTemplate {
  const c = parseWarningColors(colors);
  if (!c) return t;
  return {
    ...t,
    ...(c.pageBg ? { pageBg: c.pageBg, surface: t.layout === "fullbleed" || t.layout === "bigtype" ? c.pageBg : t.surface } : {}),
    ...(c.cardBg ? { cardBg: c.cardBg, surface: c.cardBg } : {}),
    ...(c.text ? { text: c.text, muted: `${c.text}b3` } : {}),
    ...(c.buttonBg ? { buttonBg: c.buttonBg, buttonSolid: c.buttonBg } : {}),
    ...(c.buttonText ? { buttonText: c.buttonText } : {}),
  };
}
