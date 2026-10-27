import { describe, expect, it } from "vitest";
import { accessBlock, accessError, DEFAULT_ACCESS, isDefaultAccess, parseAccess } from "@/lib/link-access";

const now = new Date("2026-10-26T12:00:00Z");

describe("parseAccess", () => {
  it("falls back to no limits", () => {
    expect(parseAccess(null)).toEqual(DEFAULT_ACCESS);
    expect(parseAccess({ devices: "tv", blockedCountries: "US" })).toEqual(DEFAULT_ACCESS);
  });
  it("cleans country codes and dates", () => {
    const a = parseAccess({ blockedCountries: ["us", "US", "fr", "xxx", 3], devices: "mobile", startsAt: "2026-10-01T00:00:00Z", endsAt: "nope" });
    expect(a).toEqual({ blockedCountries: ["US", "FR"], devices: "mobile", startsAt: "2026-10-01T00:00:00.000Z", endsAt: null, botProtection: false });
    expect(isDefaultAccess(a)).toBe(false);
  });
  it("keeps bot protection and counts it as non-default", () => {
    const a = parseAccess({ botProtection: true });
    expect(a.botProtection).toBe(true);
    expect(isDefaultAccess(a)).toBe(false);
    expect(parseAccess({ botProtection: "yes" }).botProtection).toBe(false);
  });
});

describe("accessBlock", () => {
  const visit = (country: string | null, device = "mobile") => ({ country, device, now });
  it("lets everyone in by default", () => expect(accessBlock(DEFAULT_ACCESS, visit("US"))).toBeNull());
  it("blocks listed countries only", () => {
    const a = parseAccess({ blockedCountries: ["US"] });
    expect(accessBlock(a, visit("US"))).toBe("country");
    expect(accessBlock(a, visit("MA"))).toBeNull();
    expect(accessBlock(a, visit(null))).toBeNull();
  });
  it("checks devices", () => {
    expect(accessBlock(parseAccess({ devices: "mobile" }), visit("MA", "desktop"))).toBe("device");
    expect(accessBlock(parseAccess({ devices: "mobile" }), visit("MA", "tablet"))).toBeNull();
    expect(accessBlock(parseAccess({ devices: "desktop" }), visit("MA", "mobile"))).toBe("device");
  });
  it("checks the schedule", () => {
    expect(accessBlock(parseAccess({ startsAt: "2026-10-27T00:00:00Z" }), visit("MA"))).toBe("not-started");
    expect(accessBlock(parseAccess({ endsAt: "2026-10-26T11:00:00Z" }), visit("MA"))).toBe("ended");
    expect(accessBlock(parseAccess({ startsAt: "2026-10-25T00:00:00Z", endsAt: "2026-10-27T00:00:00Z" }), visit("MA"))).toBeNull();
  });
  it("refuses an end before the start", () => {
    expect(accessError(parseAccess({ startsAt: "2026-10-27T00:00:00Z", endsAt: "2026-10-26T00:00:00Z" }))).toMatch(/after the start/);
  });
});
