import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited, rateLimit, recordAttempt, resetRateLimits } from "@/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => {
    delete process.env.DISABLE_RATE_LIMITS;
    resetRateLimits();
  });

  it("allows up to the limit within a window, then blocks", () => {
    const t = 1_000_000;
    expect([1, 2, 3].map(() => rateLimit("k", 3, 60_000, t))).toEqual([true, true, true]);
    expect(rateLimit("k", 3, 60_000, t + 1)).toBe(false);
  });

  it("resets after the window", () => {
    const t = 2_000_000;
    for (let i = 0; i < 5; i++) rateLimit("w", 2, 1000, t);
    expect(rateLimit("w", 2, 1000, t + 1001)).toBe(true);
  });

  it("separates keys", () => {
    rateLimit("a", 1, 1000, 0);
    expect(rateLimit("a", 1, 1000, 1)).toBe(false);
    expect(rateLimit("b", 1, 1000, 1)).toBe(true);
  });

  it("can count only failures", () => {
    const t = 3_000_000;
    expect(isRateLimited("f", 2, 1000, t)).toBe(false);
    recordAttempt("f", 1000, t);
    recordAttempt("f", 1000, t);
    expect(isRateLimited("f", 2, 1000, t + 1)).toBe(true);
  });

  it("can be disabled for local testing", () => {
    process.env.DISABLE_RATE_LIMITS = "true";
    for (let i = 0; i < 10; i++) expect(rateLimit("d", 1, 1000)).toBe(true);
  });
});
