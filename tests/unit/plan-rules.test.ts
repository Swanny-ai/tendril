import { describe, expect, it } from "vitest";
import { clampAnalyticsDays, planFromSubscription, visibleBlockIds, PLAN_LIMITS } from "@/lib/plan-rules";

describe("planFromSubscription", () => {
  it("is FREE without a subscription", () => expect(planFromSubscription(null)).toBe("FREE"));
  it.each(["active", "trialing", "past_due"])("is PRO when status is %s", (status) => {
    expect(planFromSubscription({ plan: "PRO", status })).toBe("PRO");
  });
  it.each(["canceled", "unpaid", "incomplete_expired", "incomplete"])("is FREE when status is %s", (status) => {
    expect(planFromSubscription({ plan: "PRO", status })).toBe("FREE");
  });
});

describe("clampAnalyticsDays", () => {
  it("caps free plans at 30 days", () => expect(clampAnalyticsDays("FREE", 365)).toBe(30));
  it("allows pro up to 365 days", () => expect(clampAnalyticsDays("PRO", 365)).toBe(365));
  it("never returns less than 1", () => expect(clampAnalyticsDays("PRO", 0)).toBe(1));
});

describe("visibleBlockIds", () => {
  const blocks = Array.from({ length: 15 }, (_, i) => ({ id: `b${i}`, position: i, enabled: i !== 2 }));
  it("hides blocks past the free limit and disabled blocks", () => {
    const ids = visibleBlockIds("FREE", blocks);
    expect(ids.size).toBe(PLAN_LIMITS.FREE.maxBlocks - 1);
    expect(ids.has("b2")).toBe(false);
    expect(ids.has("b12")).toBe(false);
    expect(ids.has("b11")).toBe(true);
  });
  it("shows everything enabled on pro", () => {
    expect(visibleBlockIds("PRO", blocks).size).toBe(14);
  });
});
