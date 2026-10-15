// Referrer normalization and traffic-source classification (pure, unit-tested).

export type TrafficSource = "social" | "search" | "web" | "direct";

const SOCIAL_HOSTS = [
  "instagram.com", "l.instagram.com", "facebook.com", "m.facebook.com", "l.facebook.com", "lm.facebook.com",
  "fb.com", "messenger.com", "threads.net", "threads.com", "tiktok.com", "t.co", "x.com", "twitter.com",
  "snapchat.com", "youtube.com", "m.youtube.com", "youtu.be", "linkedin.com", "lnkd.in", "pinterest.com",
  "reddit.com", "old.reddit.com", "discord.com", "t.me", "telegram.org", "whatsapp.com", "twitch.tv", "bsky.app",
];
const SEARCH_HOSTS = ["google.", "bing.com", "duckduckgo.com", "search.yahoo.com", "yandex.", "baidu.com", "ecosia.org", "search.brave.com"];

/** Lowercased host without "www.", or null for empty/invalid/self referrers. */
export function normalizeReferrer(referrer: string | null | undefined, ownHost?: string): string | null {
  if (!referrer) return null;
  try {
    const u = new URL(referrer);
    if (u.protocol !== "http:" && u.protocol !== "https:" && u.protocol !== "android-app:") return null;
    const host = (u.protocol === "android-app:" ? u.hostname : u.host).toLowerCase().replace(/^www\./, "");
    if (!host || (ownHost && host === ownHost.replace(/^www\./, ""))) return null;
    return host;
  } catch {
    return null;
  }
}

function matches(host: string, list: string[]) {
  return list.some((d) => (d.endsWith(".") ? host.startsWith(d) || host.includes(`.${d}`) : host === d || host.endsWith(`.${d}`)));
}

/**
 * Classifies a visit. When the referrer is empty but the visitor is inside a social
 * app's webview (apps often strip the referrer), the visit counts as social.
 */
export function classifySource(referrerHost: string | null, inAppBrowser: string | null): { source: TrafficSource; referrerHost: string | null } {
  if (!referrerHost) {
    if (inAppBrowser) return { source: "social", referrerHost: appHost(inAppBrowser) };
    return { source: "direct", referrerHost: null };
  }
  if (matches(referrerHost, SOCIAL_HOSTS) || /^com\.(instagram|facebook|zhiliaoapp|ss\.android|twitter|snapchat)/.test(referrerHost)) {
    return { source: "social", referrerHost };
  }
  if (matches(referrerHost, SEARCH_HOSTS) || referrerHost.startsWith("com.google.android")) return { source: "search", referrerHost };
  return { source: "web", referrerHost };
}

function appHost(app: string): string {
  switch (app) {
    case "instagram": return "instagram.com";
    case "facebook": return "facebook.com";
    case "tiktok": return "tiktok.com";
    case "snapchat": return "snapchat.com";
    case "linkedin": return "linkedin.com";
    case "twitter": return "x.com";
    default: return app;
  }
}

/** Groups hosts like l.instagram.com / instagram.com under one label for display. */
export function referrerLabel(host: string | null): string {
  if (!host) return "Direct";
  const h = host.replace(/^(l|lm|m|old)\./, "");
  const known: Record<string, string> = {
    "instagram.com": "Instagram", "facebook.com": "Facebook", "fb.com": "Facebook", "messenger.com": "Messenger",
    "tiktok.com": "TikTok", "t.co": "X", "x.com": "X", "twitter.com": "X", "youtube.com": "YouTube", "youtu.be": "YouTube",
    "linkedin.com": "LinkedIn", "lnkd.in": "LinkedIn", "reddit.com": "Reddit", "snapchat.com": "Snapchat",
    "threads.net": "Threads", "threads.com": "Threads", "pinterest.com": "Pinterest", "t.me": "Telegram", "bsky.app": "Bluesky",
  };
  if (known[h]) return known[h];
  if (/^google\./.test(h) || h.startsWith("com.google")) return "Google";
  return h;
}
