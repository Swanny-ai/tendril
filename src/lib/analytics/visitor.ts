import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";

// Visitors are identified only by sha256(dailySalt + ip + userAgent), truncated.
// The salt rotates every UTC day and old salts are deleted, so hashes cannot be
// linked across days and raw IPs are never stored.

let cached: { day: string; salt: string } | null = null;

function utcDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function dailySalt(): Promise<string> {
  const day = utcDay();
  if (cached?.day === day) return cached.salt;
  const date = new Date(`${day}T00:00:00.000Z`);
  const fresh = crypto.randomBytes(32).toString("hex");
  const row = await db.dailySalt.upsert({ where: { day: date }, create: { day: date, salt: fresh }, update: {} });
  // Best-effort cleanup of older salts.
  void db.dailySalt.deleteMany({ where: { day: { lt: date } } }).catch(() => {});
  cached = { day, salt: row.salt };
  return row.salt;
}

export async function visitorHash(ip: string, userAgent: string): Promise<string> {
  const salt = await dailySalt();
  return crypto.createHash("sha256").update(`${salt}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

/** Client IP from common proxy headers (falls back to a constant for local dev). */
export function clientIp(headers: Headers): string {
  const netlify = headers.get("x-nf-client-connection-ip")?.trim();
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return netlify || fwd || headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "0.0.0.0";
}

/** Netlify geo header: base64-encoded JSON like {"country":{"code":"US"}}. */
function netlifyGeoCountry(headers: Headers): string | null {
  const raw = headers.get("x-nf-geo");
  if (!raw) return null;
  try {
    const geo = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as { country?: { code?: unknown } };
    return typeof geo.country?.code === "string" ? geo.country.code.toUpperCase() : null;
  } catch {
    return null;
  }
}

/** ISO country from edge/CDN headers, if the host provides one. */
export function countryFromHeaders(headers: Headers): string | null {
  const c =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country") || // Netlify
    netlifyGeoCountry(headers) ||
    headers.get("x-country-code");
  return c && /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1" ? c : null;
}
