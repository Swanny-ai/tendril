import { describe, expect, it } from "vitest";
import { availableAt, commissionCents, formatUsd, levelFor, maskEmail, normalizeCode } from "@/lib/affiliate-rules";

describe("affiliate rules", () => {
  it("grows the level with paying customers", () => {
    expect(levelFor(0)).toMatchObject({ level: { key: "seed", rate: 25 }, next: { key: "sprout", from: 5 } });
    expect(levelFor(4).level.key).toBe("seed");
    expect(levelFor(5)).toMatchObject({ level: { key: "sprout", rate: 30 }, next: { key: "bloom", from: 20 } });
    expect(levelFor(20)).toMatchObject({ level: { key: "bloom", rate: 35 }, next: null });
  });
  it("computes commissions in whole cents", () => {
    expect(commissionCents(600, 25)).toBe(150);
    expect(commissionCents(6000, 30)).toBe(1800);
    expect(commissionCents(599, 35)).toBe(209);
    expect(commissionCents(-100, 30)).toBe(0);
  });
  it("holds commissions for 30 days", () => {
    expect(availableAt(new Date("2026-10-01T00:00:00Z")).toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });
  it("masks referral emails", () => {
    expect(maskEmail("abdelhamid@gmail.com")).toBe("abd***@gmail.com");
    expect(maskEmail("ab@x.com")).toBe("a***@x.com");
    expect(maskEmail("nope")).toBe("***");
  });
  it("accepts tidy codes only", () => {
    expect(normalizeCode(" SwannyAI ")).toBe("swannyai");
    expect(normalizeCode("ab")).toBeNull();
    expect(normalizeCode("-bad")).toBeNull();
    expect(normalizeCode("has space")).toBeNull();
  });
  it("formats dollars", () => expect(formatUsd(123456)).toBe("$1,234.56"));
});
