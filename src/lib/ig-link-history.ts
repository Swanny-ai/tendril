// Instagram link history: finds the outside links in an Instagram "Download your information"
// export (bio website now and before, links in posts and stories). Pure, runs in the browser.

export type LinkPlace = "profile-now" | "profile-before" | "posts" | "stories" | "other";

export type FoundLink = {
  /** Cleaned address, e.g. "https://viewlink.me/maria". */
  url: string;
  host: string;
  places: LinkPlace[];
  /** Unix seconds, when the export says when (null = no date in the export). */
  firstSeen: number | null;
  lastSeen: number | null;
  /** How many times it shows up in the export. */
  count: number;
};

type Hit = { url: string; place: LinkPlace; ts: number | null };

// Meta's own addresses (profile links, image servers, redirect wrappers) aren't "your links".
const META_HOST = /(^|\.)(instagram\.com|cdninstagram\.com|facebook\.com|fb\.com|fb\.me|fbcdn\.net|fbsbx\.com|meta\.com|threads\.net|whatsapp\.com|messenger\.com|oculus\.com)$/;
const URL_RE = /https?:\/\/[^\s"'<>\\)\]}]+/gi;
const BARE_DOMAIN = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/i;
const TRACKING = /^(utm_\w+|fbclid|igshid|igsh|si|ref)$/i;

/** Which part of the export a file is, from its path inside the zip. */
export function placeOf(path: string): LinkPlace {
  const p = path.toLowerCase();
  if (p.includes("profile_changes")) return "profile-before";
  if (p.includes("personal_information")) return "profile-now";
  if (p.includes("stories")) return "stories";
  if (p.includes("posts") || p.includes("/media/") || p.includes("reels") || p.includes("content/")) return "posts";
  return "other";
}

/** Files worth reading: JSON or HTML, not messages (other people's links) and not media. */
export function shouldRead(path: string, size: number): boolean {
  const p = path.toLowerCase();
  return (p.endsWith(".json") || p.endsWith(".html")) && !p.includes("messages/") && size < 25_000_000;
}

/** A clean, comparable address, or null when it isn't an outside link. Unwraps l.instagram.com/?u=… */
export function cleanUrl(raw: string): string | null {
  let s = raw.trim().replace(/[.,;:!?'"]+$/, "");
  if (!/^https?:\/\//i.test(s)) {
    if (!BARE_DOMAIN.test(s)) return null;
    s = `https://${s}`;
  }
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  // Instagram and Facebook wrap outside links: the real address is in ?u=
  if ((host === "l.instagram.com" || host === "l.facebook.com" || host === "lm.facebook.com") && u.searchParams.get("u")) {
    return cleanUrl(u.searchParams.get("u")!);
  }
  if (META_HOST.test(host) || !host.includes(".")) return null;
  for (const key of [...u.searchParams.keys()]) if (TRACKING.test(key)) u.searchParams.delete(key);
  const path = u.pathname.replace(/\/+$/, "");
  const query = u.searchParams.toString();
  return `https://${host}${path}${query ? `?${query}` : ""}`;
}

/** A plausible Unix time (seconds) in a JSON value, or null. */
function asTimestamp(v: unknown): number | null {
  return typeof v === "number" && v > 946_684_800 && v < 4_102_444_800 ? v : null;
}

/** The first timestamp directly on this object or in its Instagram "string_map_data" entries. */
function timestampOf(o: Record<string, unknown>): number | null {
  for (const key of ["timestamp", "creation_timestamp", "taken_at"]) {
    const t = asTimestamp(o[key]);
    if (t) return t;
  }
  const map = o.string_map_data;
  if (map && typeof map === "object") {
    for (const entry of Object.values(map as Record<string, unknown>)) {
      const t = entry && typeof entry === "object" ? asTimestamp((entry as Record<string, unknown>).timestamp) : null;
      if (t) return t;
    }
  }
  return null;
}

/** Every outside link in one exported file. */
export function extractLinks(path: string, text: string): Hit[] {
  const place = placeOf(path);
  const hits: Hit[] = [];
  const add = (raw: string, ts: number | null) => {
    const url = cleanUrl(raw);
    if (url) hits.push({ url, place, ts });
  };

  if (path.toLowerCase().endsWith(".json")) {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    if (data !== null) {
      // Profile fields may hold a bare domain ("viewlink.me/maria"); elsewhere only full links count.
      const bareOk = place === "profile-now" || place === "profile-before";
      const walk = (node: unknown, ts: number | null) => {
        if (typeof node === "string") {
          const found = node.match(URL_RE);
          if (found) for (const f of found) add(f, ts);
          else if (bareOk && BARE_DOMAIN.test(node.trim())) add(node, ts);
        } else if (Array.isArray(node)) {
          for (const n of node) walk(n, ts);
        } else if (node && typeof node === "object") {
          const own = timestampOf(node as Record<string, unknown>) ?? ts;
          for (const v of Object.values(node)) walk(v, own);
        }
      };
      walk(data, null);
      return hits;
    }
  }
  // HTML exports (and JSON that didn't parse): plain search, without dates.
  for (const f of text.match(URL_RE) ?? []) add(f.replace(/&amp;/g, "&"), null);
  return hits;
}

const PLACE_ORDER: LinkPlace[] = ["profile-now", "profile-before", "posts", "stories", "other"];

/** One row per address, newest first, with where it showed up and when. */
export function mergeLinks(hits: Hit[]): FoundLink[] {
  const byUrl = new Map<string, FoundLink>();
  for (const h of hits) {
    const row = byUrl.get(h.url) ?? { url: h.url, host: new URL(h.url).hostname, places: [], firstSeen: null, lastSeen: null, count: 0 };
    row.count++;
    if (!row.places.includes(h.place)) row.places.push(h.place);
    if (h.ts) {
      row.firstSeen = row.firstSeen === null ? h.ts : Math.min(row.firstSeen, h.ts);
      row.lastSeen = row.lastSeen === null ? h.ts : Math.max(row.lastSeen, h.ts);
    }
    byUrl.set(h.url, row);
  }
  for (const r of byUrl.values()) r.places.sort((a, b) => PLACE_ORDER.indexOf(a) - PLACE_ORDER.indexOf(b));
  return [...byUrl.values()].sort(
    (a, b) => Number(b.places.includes("profile-now")) - Number(a.places.includes("profile-now")) || (b.lastSeen ?? 0) - (a.lastSeen ?? 0) || b.count - a.count,
  );
}
