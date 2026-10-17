// Original 18+ warning-page templates (names, palettes and layouts are ViewLink's own).
// Pure data: shared by the public warning pages, the editor preview and unit tests.

export type WarningLayout = "card" | "split" | "fullbleed" | "bigtype";

export type WarningTemplate = {
  key: string;
  name: string;
  layout: WarningLayout;
  pageBg: string; // CSS background for the whole page
  cardBg: string; // card surface (layouts "card" and "split")
  cardBorder: string;
  text: string; // primary text (solid hex, contrast-tested)
  muted: string; // secondary text
  surface: string; // solid color the text sits on (for contrast tests)
  buttonBg: string; // CSS background (may be a gradient)
  buttonSolid: string; // solid approximation of buttonBg (for contrast tests)
  buttonText: string;
  iconBg: string;
  iconColor: string;
  accent: string; // split-layout band / big-type numerals
  radius: number;
  font: "sans" | "display" | "serif" | "mono" | "roboto";
  // Optional styling switches (used by templates that follow a specific reference look)
  icon?: "shield" | "lock";
  buttonRadius?: number;
  buttonFullWidth?: boolean;
  buttonUppercase?: boolean;
  hideLeave?: boolean;
  hideDestination?: boolean;
  cardShadow?: string;
  /** Tighter card: 400px wide, 40/32 padding, 22px title, 64px icon. */
  compact?: boolean;
  /** English wording that replaces the default copy for this template. */
  defaultCopyEn?: { title: string; message: string; button: string };
  /** false = colors intentionally match a reference and are below WCAG AA (tests list these). */
  meetsContrast?: boolean;
};

export const WARNING_TEMPLATES: WarningTemplate[] = [
  {
    key: "dusk", name: "Dusk", layout: "card",
    pageBg: "radial-gradient(120% 90% at 50% 0%, #3a1f4d 0%, #160f22 65%)",
    cardBg: "rgba(255,255,255,0.06)", cardBorder: "rgba(255,255,255,0.12)",
    text: "#f6f1ff", muted: "#cbbfe0", surface: "#221733",
    buttonBg: "linear-gradient(90deg, #ff7a59, #e8457c)", buttonSolid: "#b8325e", buttonText: "#ffffff",
    iconBg: "rgba(255,122,89,0.18)", iconColor: "#ff9a7f", accent: "#ff7a59", radius: 18, font: "display",
  },
  {
    key: "charcoal", name: "Charcoal", layout: "card",
    pageBg: "#141416", cardBg: "#1f1f23", cardBorder: "#2e2e34",
    text: "#f2f2f3", muted: "#b4b4bb", surface: "#1f1f23",
    buttonBg: "#ececee", buttonSolid: "#ececee", buttonText: "#141416",
    iconBg: "#2b2b31", iconColor: "#ececee", accent: "#ececee", radius: 12, font: "sans",
  },
  {
    key: "paper", name: "Paper", layout: "card",
    pageBg: "#f4f0e8", cardBg: "#ffffff", cardBorder: "#e4ddd0",
    text: "#1c1a24", muted: "#5c5866", surface: "#ffffff",
    buttonBg: "#1c1a24", buttonSolid: "#1c1a24", buttonText: "#ffffff",
    iconBg: "#f1ece2", iconColor: "#1c1a24", accent: "#1c1a24", radius: 14, font: "serif",
  },
  {
    key: "ember", name: "Ember Line", layout: "card",
    pageBg: "#0c0a09", cardBg: "#0c0a09", cardBorder: "#ff6b35",
    text: "#fff4ee", muted: "#d9c2b6", surface: "#0c0a09",
    buttonBg: "#ff6b35", buttonSolid: "#ff6b35", buttonText: "#0c0a09",
    iconBg: "rgba(255,107,53,0.14)", iconColor: "#ff8a5c", accent: "#ff6b35", radius: 4, font: "mono",
  },
  {
    key: "tidepool", name: "Tidepool", layout: "fullbleed",
    pageBg: "linear-gradient(180deg, #12355b 0%, #1f5f7f 60%, #2f8aa0 100%)",
    cardBg: "transparent", cardBorder: "transparent",
    text: "#ffffff", muted: "#d6ecf5", surface: "#1a4a6e",
    buttonBg: "#ffffff", buttonSolid: "#ffffff", buttonText: "#12355b",
    iconBg: "rgba(255,255,255,0.14)", iconColor: "#ffffff", accent: "#ffffff", radius: 999, font: "sans",
  },
  {
    key: "two-tone", name: "Two Tone", layout: "split",
    pageBg: "#fff7f2", cardBg: "#ffffff", cardBorder: "#f3d9cc",
    text: "#2a1710", muted: "#6b4a3d", surface: "#ffffff",
    buttonBg: "#c2410c", buttonSolid: "#c2410c", buttonText: "#ffffff",
    iconBg: "rgba(255,255,255,0.22)", iconColor: "#ffffff", accent: "#ea580c", radius: 22, font: "display",
  },
  {
    key: "big-print", name: "Big Print", layout: "bigtype",
    pageBg: "#ffffff", cardBg: "#ffffff", cardBorder: "#ffffff",
    text: "#0f0f10", muted: "#4b4b52", surface: "#ffffff",
    buttonBg: "#0f0f10", buttonSolid: "#0f0f10", buttonText: "#ffffff",
    iconBg: "#ffffff", iconColor: "#0f0f10", accent: "#e11d48", radius: 0, font: "display",
  },
  {
    key: "lagoon", name: "Lagoon", layout: "card",
    pageBg: "#e6f4f5", cardBg: "#ffffff", cardBorder: "#c7e3e6",
    text: "#0d2f33", muted: "#3f5f63", surface: "#ffffff",
    buttonBg: "#0e6f78", buttonSolid: "#0e6f78", buttonText: "#ffffff",
    iconBg: "#dff0f1", iconColor: "#0e6f78", accent: "#0e6f78", radius: 16, font: "sans",
  },
  {
    key: "frosted", name: "Frosted", layout: "card",
    pageBg: "linear-gradient(135deg, #4b32c3 0%, #8f4fd0 50%, #d06ab7 100%)",
    cardBg: "rgba(255,255,255,0.14)", cardBorder: "rgba(255,255,255,0.35)",
    text: "#ffffff", muted: "#efe6ff", surface: "#6d43c9",
    buttonBg: "#ffffff", buttonSolid: "#ffffff", buttonText: "#4b32c3",
    iconBg: "rgba(255,255,255,0.2)", iconColor: "#ffffff", accent: "#ffffff", radius: 24, font: "display",
  },
  {
    key: "night-gold", name: "Night & Gold", layout: "card",
    pageBg: "#0a0c16", cardBg: "#131828", cardBorder: "#262d45",
    text: "#f5f1e6", muted: "#b9b4a6", surface: "#131828",
    buttonBg: "#e9c46a", buttonSolid: "#e9c46a", buttonText: "#0a0c16",
    iconBg: "rgba(233,196,106,0.14)", iconColor: "#e9c46a", accent: "#e9c46a", radius: 10, font: "serif",
  },
  {
    key: "sorbet", name: "Sorbet", layout: "card",
    pageBg: "linear-gradient(180deg, #ffe3ec 0%, #ffd6e0 100%)",
    cardBg: "#ffffff", cardBorder: "#ffc2d4",
    text: "#3d1023", muted: "#7a4058", surface: "#ffffff",
    buttonBg: "#be185d", buttonSolid: "#be185d", buttonText: "#ffffff",
    iconBg: "#ffe3ec", iconColor: "#be185d", accent: "#be185d", radius: 28, font: "display",
  },
];

// Added on request to match a specific reference age gate as closely as possible.
// Its gray text and white-on-blue button are below WCAG AA, so it's marked meetsContrast: false.
// It's the first design and the default for new links.
WARNING_TEMPLATES.unshift({
  key: "clear-blue", name: "Clear Blue", layout: "card",
  pageBg: "#ffffff", cardBg: "#ffffff", cardBorder: "#f0f0f0",
  text: "#1a1a1a", muted: "#8a96a3", surface: "#ffffff",
  buttonBg: "#00aff0", buttonSolid: "#00aff0", buttonText: "#ffffff",
  iconBg: "#e8f4fd", iconColor: "#00aff0", accent: "#00aff0", radius: 12, font: "roboto",
  icon: "lock",
  buttonRadius: 1000,
  buttonFullWidth: true,
  buttonUppercase: true,
  hideLeave: true,
  hideDestination: true,
  cardShadow: "0 1px 3px rgba(0,0,0,0.08)",
  compact: true,
  defaultCopyEn: {
    title: "Age Restricted",
    message: "This platform is restricted to 18+ users. Confirm your age to continue.",
    button: "Yes, I'm 18+",
  },
  meetsContrast: false,
});

export const DEFAULT_WARNING_TEMPLATE = "clear-blue";

export function getWarningTemplate(key: string | null | undefined): WarningTemplate {
  return WARNING_TEMPLATES.find((t) => t.key === key) ?? WARNING_TEMPLATES[0];
}

export function isWarningTemplateKey(key: unknown): key is string {
  return typeof key === "string" && WARNING_TEMPLATES.some((t) => t.key === key);
}
