import { createHmac, timingSafeEqual } from "node:crypto";

// NOWPayments IPN signatures (pure, so it can be unit tested): HMAC-SHA512 of the JSON body with
// object keys sorted alphabetically at every level, keyed with the IPN secret from the dashboard.

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.keys(v as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]),
    );
  }
  return v;
}

export function nowpaymentsSignature(body: unknown, secret: string): string {
  return createHmac("sha512", secret).update(JSON.stringify(sortKeys(body)), "utf8").digest("hex");
}

/** True when `signature` (the x-nowpayments-sig header) matches `body` signed with `secret`. */
export function verifyNowpaymentsSignature(body: unknown, signature: string | null | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(nowpaymentsSignature(body, secret), "utf8");
  const given = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
