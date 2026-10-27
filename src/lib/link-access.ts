// A deep link's "Advanced" access rules (pure, shared by the editor and the link routes):
// countries it's blocked in, the devices it works on, and the dates it's active between.
// Every visitor (person or bot) from a blocked country, on another device, or outside the
// dates gets the same "This link isn't available" page.

export type LinkDevices = "all" | "mobile" | "desktop";

export type LinkAccess = {
  /** ISO 3166-1 alpha-2 codes, e.g. ["US", "FR"]. */
  blockedCountries: string[];
  devices: LinkDevices;
  /** ISO dates; null = no limit. */
  startsAt: string | null;
  endsAt: string | null;
  /** Show a Cloudflare Turnstile "are you human?" check before the link (blocks bots). */
  botProtection: boolean;
};

export const DEFAULT_ACCESS: LinkAccess = { blockedCountries: [], devices: "all", startsAt: null, endsAt: null, botProtection: false };

const isoDate = (v: unknown): string | null => {
  if (typeof v !== "string" || !v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

/** Cleans stored or submitted access rules (anything unknown falls back to "no limit"). */
export function parseAccess(v: unknown): LinkAccess {
  if (!v || typeof v !== "object") return { ...DEFAULT_ACCESS };
  const o = v as Record<string, unknown>;
  const countries = Array.isArray(o.blockedCountries)
    ? [...new Set(o.blockedCountries.filter((c): c is string => typeof c === "string").map((c) => c.toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))].slice(0, 250)
    : [];
  return {
    blockedCountries: countries,
    devices: o.devices === "mobile" || o.devices === "desktop" ? o.devices : "all",
    startsAt: isoDate(o.startsAt),
    endsAt: isoDate(o.endsAt),
    botProtection: o.botProtection === true,
  };
}

export const isDefaultAccess = (a: LinkAccess) =>
  !a.blockedCountries.length && a.devices === "all" && !a.startsAt && !a.endsAt && !a.botProtection;

/** Why the rules may be refused when saving (end before start), or null. */
export function accessError(a: LinkAccess): string | null {
  if (a.startsAt && a.endsAt && Date.parse(a.endsAt) <= Date.parse(a.startsAt)) return "The end date must be after the start date.";
  return null;
}

export type AccessBlock = "country" | "device" | "not-started" | "ended";

/** Why this visit is blocked, or null when the link works for it. */
export function accessBlock(a: LinkAccess, visit: { country: string | null; device: string; now: Date }): AccessBlock | null {
  if (a.startsAt && visit.now < new Date(a.startsAt)) return "not-started";
  if (a.endsAt && visit.now >= new Date(a.endsAt)) return "ended";
  if (visit.country && a.blockedCountries.includes(visit.country)) return "country";
  const phone = visit.device === "mobile" || visit.device === "tablet";
  if ((a.devices === "mobile" && !phone) || (a.devices === "desktop" && phone)) return "device";
  return null;
}

export const ACCESS_MESSAGES: Record<AccessBlock, string> = {
  country: "It isn't available in your country.",
  device: "It isn't available on this device.",
  "not-started": "It isn't open yet. Please come back later.",
  ended: "It has ended.",
};
