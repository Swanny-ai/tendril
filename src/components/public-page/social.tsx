// Social networks: labels, profile URLs and real brand icons (from simple-icons, CC0).
import {
  siDiscord,
  siFacebook,
  siGithub,
  siGmail,
  siInstagram,
  siOnlyfans,
  siPatreon,
  siSnapchat,
  siSpotify,
  siTelegram,
  siThreads,
  siTiktok,
  siTwitch,
  siWhatsapp,
  siX,
  siYoutube,
} from "simple-icons";
import type { SocialNetwork } from "@/lib/validation";

type Icon = { path: string; hex: string };
// LinkedIn isn't in simple-icons; a plain "in" glyph in its brand colour.
const LINKEDIN: Icon = {
  hex: "0A66C2",
  path: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.6h.06c.53-1 1.84-2.05 3.8-2.05 4.06 0 4.84 2.6 4.84 6V21h-4v-5.1c0-1.22-.02-2.8-1.7-2.8-1.72 0-1.98 1.33-1.98 2.7V21h-4V9.75Z",
};

const META: Record<SocialNetwork, { label: string; mark: string; icon: Icon; href: (h: string) => string }> = {
  instagram: { label: "Instagram", mark: "IG", icon: siInstagram, href: (h) => `https://instagram.com/${h.replace(/^@/, "")}` },
  tiktok: { label: "TikTok", mark: "TT", icon: siTiktok, href: (h) => `https://www.tiktok.com/@${h.replace(/^@/, "")}` },
  youtube: { label: "YouTube", mark: "YT", icon: siYoutube, href: (h) => `https://www.youtube.com/${h.startsWith("@") ? h : `@${h}`}` },
  x: { label: "X", mark: "X", icon: siX, href: (h) => `https://x.com/${h.replace(/^@/, "")}` },
  facebook: { label: "Facebook", mark: "FB", icon: siFacebook, href: (h) => (h.startsWith("http") ? h : `https://facebook.com/${h.replace(/^@/, "")}`) },
  snapchat: { label: "Snapchat", mark: "SC", icon: siSnapchat, href: (h) => `https://snapchat.com/add/${h.replace(/^@/, "")}` },
  threads: { label: "Threads", mark: "TH", icon: siThreads, href: (h) => `https://www.threads.net/@${h.replace(/^@/, "")}` },
  telegram: { label: "Telegram", mark: "TG", icon: siTelegram, href: (h) => `https://t.me/${h.replace(/^@/, "")}` },
  whatsapp: { label: "WhatsApp", mark: "WA", icon: siWhatsapp, href: (h) => `https://wa.me/${h.replace(/[^\d]/g, "")}` },
  discord: { label: "Discord", mark: "DC", icon: siDiscord, href: (h) => (h.startsWith("http") ? h : `https://discord.gg/${h}`) },
  twitch: { label: "Twitch", mark: "TW", icon: siTwitch, href: (h) => `https://twitch.tv/${h.replace(/^@/, "")}` },
  spotify: { label: "Spotify", mark: "SP", icon: siSpotify, href: (h) => (h.startsWith("http") ? h : `https://open.spotify.com/artist/${h}`) },
  patreon: { label: "Patreon", mark: "PA", icon: siPatreon, href: (h) => `https://patreon.com/${h.replace(/^@/, "")}` },
  onlyfans: { label: "OnlyFans", mark: "OF", icon: siOnlyfans, href: (h) => `https://onlyfans.com/${h.replace(/^@/, "")}` },
  github: { label: "GitHub", mark: "GH", icon: siGithub, href: (h) => `https://github.com/${h.replace(/^@/, "")}` },
  linkedin: { label: "LinkedIn", mark: "in", icon: LINKEDIN, href: (h) => (h.startsWith("http") ? h : `https://www.linkedin.com/in/${h}`) },
  email: { label: "Email", mark: "@", icon: siGmail, href: (h) => `mailto:${h}` },
};

export function socialMeta(network: string) {
  return META[network as SocialNetwork] ?? { label: network, mark: network.slice(0, 2).toUpperCase(), icon: null, href: (h: string) => h };
}

/** Brand colour for a network (Instagram gets its gradient). */
export function socialColor(network: string) {
  if (network === "instagram") return "linear-gradient(135deg,#f9a03f,#e1306c 55%,#833ab4)";
  const m = META[network as SocialNetwork];
  return m ? `#${m.icon.hex}` : "#5b3fd1";
}

/** The network's real logo as an inline SVG (inherits text colour). */
export function SocialGlyph({ network, size = 18 }: { network: string; size?: number }) {
  const m = socialMeta(network);
  if (!m.icon) return <span className="text-[11px] font-bold">{m.mark}</span>;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden focusable="false">
      <path d={m.icon.path} />
    </svg>
  );
}

export const SOCIAL_LABELS = Object.fromEntries(Object.entries(META).map(([k, v]) => [k, v.label])) as Record<SocialNetwork, string>;
