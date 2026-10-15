// Simple fixed-window, in-memory rate limiter. Good enough for a single instance;
// swap for a shared store (e.g. Redis/Upstash) when running multiple instances.
// DISABLE_RATE_LIMITS=true turns it off for local end-to-end testing only.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Never honoured on a production deploy (Vercel or Netlify), whatever the env says.
const disabled = () =>
  process.env.DISABLE_RATE_LIMITS === "true" && process.env.VERCEL_ENV !== "production" && process.env.CONTEXT !== "production";

function current(key: string, windowMs: number, now: number): Bucket {
  const b = buckets.get(key);
  if (b && b.resetAt > now) return b;
  const fresh = { count: 0, resetAt: now + windowMs };
  buckets.set(key, fresh);
  if (buckets.size > 50_000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
  return fresh;
}

/** Counts one attempt and returns true while the key is under its limit. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (disabled()) return true;
  const b = current(key, windowMs, now);
  b.count++;
  return b.count <= limit;
}

/** True if the key has already reached its limit (does not count an attempt). */
export function isRateLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (disabled()) return false;
  return current(key, windowMs, now).count >= limit;
}

/** Records one attempt without checking (e.g. count only failed logins). */
export function recordAttempt(key: string, windowMs: number, now = Date.now()): void {
  if (disabled()) return;
  current(key, windowMs, now).count++;
}

export function resetRateLimits() {
  buckets.clear();
}
