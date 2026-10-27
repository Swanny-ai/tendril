import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Cloudflare Turnstile: a privacy-friendly "are you human?" check shown before a visitor reaches a
// protected link, to keep bots out. Needs two keys from the Cloudflare dashboard (Turnstile):
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY   the widget's public site key
//   TURNSTILE_SECRET_KEY             the secret key, used to verify the token server-side
// Once a visitor passes, a short-lived signed cookie lets them through the link's steps without
// being asked again.

export const HUMAN_COOKIE = "vl_human";
const PASS_TTL_MS = 30 * 60_000; // a pass is good for 30 minutes
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

export function turnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
}

/** Checks a widget token with Cloudflare. Returns true only when the challenge was really passed. */
export async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body, cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

// The pass cookie is just a signed expiry time (HMAC with AUTH_SECRET), so it can't be forged and
// stops working after 30 minutes.
function sign(value: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret").update(value).digest("base64url");
}

export function makeHumanCookie(now = Date.now()): string {
  const exp = String(now + PASS_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function hasHumanPass(cookieValue: string | undefined | null, now = Date.now()): boolean {
  if (!cookieValue) return false;
  const dot = cookieValue.lastIndexOf(".");
  if (dot < 1) return false;
  const exp = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < now) return false;
  const expected = Buffer.from(sign(exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const humanCookieMaxAge = Math.floor(PASS_TTL_MS / 1000);
