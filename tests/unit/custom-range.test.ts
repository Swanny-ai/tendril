import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

const { customWindow } = await import("@/lib/analytics/queries");
const day = (d: Date) => d.toISOString().slice(0, 10);

describe("customWindow (analytics date picker)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T15:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("covers both days, whole UTC days", () => {
    const w = customWindow("2026-11-01", "2026-11-03", "PRO")!;
    expect(day(w.from)).toBe("2026-11-01");
    expect(w.days).toBe(3);
    expect(w.to.toISOString()).toBe("2026-11-04T00:00:00.000Z");
    // The period before it is just as long, for the "vs previous" numbers.
    expect(day(w.prevFrom)).toBe("2026-10-29");
  });

  it("accepts the days in either order", () => {
    expect(customWindow("2026-11-03", "2026-11-01", "PRO")!.days).toBe(3);
  });

  it("stops at today and at the plan's history", () => {
    const future = customWindow("2026-11-05", "2026-12-30", "PRO")!;
    expect(future.days).toBe(2); // Nov 5 and today, Nov 6
    expect(future.to.getTime()).toBeLessThanOrEqual(Date.now() + 60_000);
    // Free keeps 30 days: an older start is moved up to the oldest day it has.
    expect(day(customWindow("2025-01-01", "2026-11-06", "FREE")!.from)).toBe("2026-10-08");
  });

  it("ignores missing or malformed dates", () => {
    expect(customWindow(undefined, "2026-11-01", "PRO")).toBeNull();
    expect(customWindow("2026-13-40", "2026-11-01", "PRO")).toBeNull();
    expect(customWindow("yesterday", "today", "PRO")).toBeNull();
  });
});
