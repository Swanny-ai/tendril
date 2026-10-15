// Original, minimal social glyphs: a monogram in a rounded tile. No brand logos.
import type { SocialNetwork } from "@/lib/validation";

const META: Record<SocialNetwork, { label: string; mark: string; href: (h: string) => string }> = {
  instagram: { label: "Instagram", mark: "IG", href: (h) => `https://instagram.com/${h.replace(/^@/, "")}` },
  tiktok: { label: "TikTok", mark: "TT", href: (h) => `https://www.tiktok.com/@${h.replace(/^@/, "")}` },
  youtube: { label: "YouTube", mark: "YT", href: (h) => `https://www.youtube.com/${h.startsWith("@") ? h : `@${h}`}` },
  x: { label: "X", mark: "X", href: (h) => `https://x.com/${h.replace(/^@/, "")}` },
  twitch: { label: "Twitch", mark: "TW", href: (h) => `https://twitch.tv/${h.replace(/^@/, "")}` },
  spotify: { label: "Spotify", mark: "SP", href: (h) => (h.startsWith("http") ? h : `https://open.spotify.com/artist/${h}`) },
  github: { label: "GitHub", mark: "GH", href: (h) => `https://github.com/${h.replace(/^@/, "")}` },
  linkedin: { label: "LinkedIn", mark: "in", href: (h) => (h.startsWith("http") ? h : `https://www.linkedin.com/in/${h}`) },
  email: { label: "Email", mark: "@", href: (h) => `mailto:${h}` },
};

export function socialMeta(network: string) {
  return META[network as SocialNetwork] ?? { label: network, mark: network.slice(0, 2).toUpperCase(), href: (h: string) => h };
}

export const SOCIAL_LABELS = Object.fromEntries(Object.entries(META).map(([k, v]) => [k, v.label])) as Record<SocialNetwork, string>;
