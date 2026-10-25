import { createHmac, timingSafeEqual } from "node:crypto";

// Paddle webhook signatures (pure, so it can be unit tested). The Paddle-Signature header looks
// like "ts=1671552777;h1=<hex>": h1 is HMAC-SHA256 of "<ts>:<raw body>" keyed with the
// notification destination's secret key. Old timestamps are refused so a captured request can't be replayed.

export function paddleSignature(raw: string, ts: string, secret: string): string {
  return createHmac("sha256", secret).update(`${ts}:${raw}`, "utf8").digest("hex");
}

export function verifyPaddleSignature(raw: string, header: string | null | undefined, secret: string, now = Date.now(), maxAgeSeconds = 300): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(";").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const ts = parts.ts;
  if (!ts || !/^\d+$/.test(ts) || Math.abs(now / 1000 - Number(ts)) > maxAgeSeconds) return false;
  // Paddle may send several h1 values while a secret is being rotated.
  const given = header
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.startsWith("h1="))
    .map((p) => p.slice(3).toLowerCase());
  const expected = Buffer.from(paddleSignature(raw, ts, secret), "utf8");
  return given.some((h) => {
    const b = Buffer.from(h, "utf8");
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}
