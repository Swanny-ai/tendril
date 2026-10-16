// Block kinds and helpers shared by the editor, the public page and the templates. Pure.

export const BLOCK_KINDS = ["LINK", "HEADER", "TEXT", "SOCIAL_ROW", "EMBED", "COUNTDOWN"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];

export type BlockData = {
  text?: string;
  socials?: { network: string; handle: string }[];
  /** LINK: picture shown when the link is an image card. */
  imageUrl?: string;
  /** LINK: "card" shows the picture with the title; default is a plain button. */
  style?: "button" | "card";
  /** COUNTDOWN: end time (ISO 8601). */
  until?: string;
};

/** YouTube video id from a watch / youtu.be / shorts / embed link, or null. */
export function youtubeId(raw: string | null | undefined): string | null {
  const e = embedSource(raw);
  return e?.provider === "youtube" ? e.src.split("/").pop()! : null;
}

/** The video's cover image for YouTube links. */
export function youtubeThumbnail(raw: string | null | undefined): string | null {
  const id = youtubeId(raw);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/**
 * Picture for a link shown as an image card: the uploaded image, or a YouTube video's cover.
 * YouTube links are cards by default (until the creator switches them back to a button).
 */
export function cardImage(block: { type: string; url: string | null; data: BlockData }): string | null {
  if (block.type !== "LINK") return null;
  const style = block.data.style ?? (youtubeId(block.url) ? "card" : "button");
  if (style !== "card") return null;
  return block.data.imageUrl || youtubeThumbnail(block.url);
}

/** Player URL for a YouTube or Spotify page link, or null if it isn't one we can embed. */
export function embedSource(raw: string | null | undefined): { provider: "youtube" | "spotify"; src: string; aspect: string } | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] || null;
  else if (host === "youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      if (m) id = m[1];
    }
  }
  if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    return { provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}`, aspect: "16 / 9" };
  }
  if (host === "open.spotify.com") {
    const m = url.pathname.match(/^\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,40})/);
    if (m) return { provider: "spotify", src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, aspect: m[1] === "track" || m[1] === "episode" ? "auto" : "1 / 1" };
  }
  return null;
}

/** Days/hours/minutes/seconds left until `until` (all zero once it has passed). */
export function timeLeft(until: string | undefined, now: number): { days: number; hours: number; minutes: number; seconds: number; done: boolean } {
  const end = until ? Date.parse(until) : NaN;
  const ms = Number.isNaN(end) ? 0 : Math.max(0, end - now);
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86_400), hours: Math.floor((s % 86_400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, done: ms === 0 };
}
