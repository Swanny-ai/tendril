import { describe, expect, it } from "vitest";
import { generateRawToken, hashToken, isWellFormedToken, TOKEN_TTL_MS } from "@/lib/token-crypto";

describe("auth tokens", () => {
  it("are 256-bit, URL-safe and unique", () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(isWellFormedToken(a)).toBe(true);
  });
  it("are stored as a stable SHA-256 hash, never the raw value", () => {
    const raw = generateRawToken();
    expect(hashToken(raw)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).not.toContain(raw);
  });
  it.each(["", "short", "x".repeat(44), "has space in it and is forty-three chars!!", null, 42])("rejects malformed %s", (v) => {
    expect(isWellFormedToken(v)).toBe(false);
  });
  it("expire after 1 hour (reset) and 24 hours (verify)", () => {
    expect(TOKEN_TTL_MS.PASSWORD_RESET).toBe(3_600_000);
    expect(TOKEN_TTL_MS.EMAIL_VERIFY).toBe(86_400_000);
  });
});
