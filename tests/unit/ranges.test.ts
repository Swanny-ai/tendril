import { describe, expect, it } from "vitest";
import { bucketKeys, isValidTimeZone, previousPeriod, resolveRange, startOfDay, zonedTime } from "@/lib/analytics/ranges";

// Wednesday 2026-10-14 15:30 UTC
const NOW = new Date("2026-10-14T15:30:00Z");

describe("time zones", () => {
  it("validates IANA names", () => {
    expect(isValidTimeZone("Africa/Casablanca")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
  it("finds local midnight", () => {
    expect(startOfDay(NOW, "UTC").toISOString()).toBe("2026-10-14T00:00:00.000Z");
    expect(startOfDay(NOW, "America/New_York").toISOString()).toBe("2026-10-14T04:00:00.000Z"); // EDT
    expect(startOfDay(NOW, "Asia/Tokyo").toISOString()).toBe("2026-10-14T15:00:00.000Z"); // already Oct 15 00:30 in Tokyo
  });
  it("handles DST changes", () => {
    // US clocks fall back on 2026-11-01
    expect(zonedTime(2026, 11, 1, 0, "America/New_York").toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(zonedTime(2026, 11, 2, 0, "America/New_York").toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
});

describe("resolveRange", () => {
  it("defaults to the last 24 hours with hourly buckets", () => {
    const r = resolveRange({}, "UTC", NOW, 365);
    expect(r.key).toBe("24h");
    expect(r.to).toEqual(NOW);
    expect(r.from.toISOString()).toBe("2026-10-13T15:30:00.000Z");
    expect(r.bucket).toBe("hour");
  });
  it("today and yesterday follow the chosen time zone", () => {
    expect(resolveRange({ range: "today" }, "UTC", NOW, 365).from.toISOString()).toBe("2026-10-14T00:00:00.000Z");
    const y = resolveRange({ range: "yesterday" }, "America/New_York", NOW, 365);
    expect([y.from.toISOString(), y.to.toISOString()]).toEqual(["2026-10-13T04:00:00.000Z", "2026-10-14T04:00:00.000Z"]);
  });
  it("last N days include today and use daily buckets", () => {
    const r = resolveRange({ range: "7d" }, "UTC", NOW, 365);
    expect(r.from.toISOString()).toBe("2026-10-08T00:00:00.000Z");
    expect(r.bucket).toBe("day");
  });
  it("last week is the previous Monday to Monday", () => {
    const r = resolveRange({ range: "last-week" }, "UTC", NOW, 365);
    expect([r.from.toISOString(), r.to.toISOString()]).toEqual(["2026-10-05T00:00:00.000Z", "2026-10-12T00:00:00.000Z"]);
  });
  it("last month and this year use calendar boundaries", () => {
    const m = resolveRange({ range: "last-month" }, "UTC", NOW, 365);
    expect([m.from.toISOString(), m.to.toISOString()]).toEqual(["2026-09-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z"]);
    expect(resolveRange({ range: "this-year" }, "UTC", NOW, 365).from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
  it("custom ranges include the end day and accept reversed dates", () => {
    const r = resolveRange({ range: "custom", from: "2026-10-10", to: "2026-10-01" }, "UTC", NOW, 365);
    expect([r.from.toISOString(), r.to.toISOString()]).toEqual(["2026-10-01T00:00:00.000Z", "2026-10-11T00:00:00.000Z"]);
  });
  it("falls back on invalid custom dates", () => {
    expect(resolveRange({ range: "custom", from: "2026-02-30", to: "x" }, "UTC", NOW, 365).key).toBe("24h");
  });
  it("clamps to the plan's history limit", () => {
    const r = resolveRange({ range: "90d" }, "UTC", NOW, 30);
    expect(r.clamped).toBe(true);
    expect(r.from.toISOString()).toBe("2026-09-14T15:30:00.000Z");
  });
});

describe("buckets", () => {
  it("lists hourly and daily keys", () => {
    expect(bucketKeys(new Date("2026-10-14T10:20:00Z"), new Date("2026-10-14T13:00:00Z"), "UTC", "hour")).toEqual([
      "2026-10-14T10", "2026-10-14T11", "2026-10-14T12",
    ]);
    expect(bucketKeys(new Date("2026-10-12T00:00:00Z"), new Date("2026-10-14T15:00:00Z"), "UTC", "day")).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
  });
  it("previous period has the same length", () => {
    const p = previousPeriod({ from: new Date("2026-10-08T00:00:00Z"), to: new Date("2026-10-15T00:00:00Z") });
    expect(p.from.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});
