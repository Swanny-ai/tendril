import crypto from "node:crypto";

// Pure helpers for single-use tokens (unit-tested). Raw tokens are 256-bit random
// values sent only by email; the database stores their SHA-256 hash.

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Rejects anything that can't be one of our tokens before touching the database. */
export function isWellFormedToken(raw: unknown): raw is string {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{43}$/.test(raw);
}

export const TOKEN_TTL_MS = {
  PASSWORD_RESET: 60 * 60 * 1000, // 1 hour
  EMAIL_VERIFY: 24 * 60 * 60 * 1000, // 24 hours
} as const;
