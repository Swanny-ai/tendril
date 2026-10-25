import { describe, expect, it } from "vitest";
import { allowedLinkIds, clampAnalyticsDays, countLimitError, linkLimitError, planFromSubscription, visibleBlockIds, PLAN_LIMITS } from "@/lib/plan-rules";

describe("planFromSubscription", () => {
  it("is FREE without a subscription", () => expect(planFromSubscription(null)).toBe("FREE"));
  it.each(["active", "trialing", "past_due"])("is PRO when status is %s", (status) => {
    expect(planFromSubscription({ plan: "PRO", status })).toBe("PRO");
  });
  it("keeps the BUSINESS plan while active or prepaid", () => {
    const now = new Date("2026-10-25T00:00:00Z");
    expect(planFromSubscription({ plan: "BUSINESS", status: "active" }, now)).toBe("BUSINESS");
    expect(planFromSubscription({ plan: "BUSINESS", status: "prepaid", currentPeriodEnd: new Date("2026-11-25T00:00:00Z") }, now)).toBe("BUSINESS");
    expect(planFromSubscription({ plan: "BUSINESS", status: "canceled" }, now)).toBe("FREE");
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

describe("link limits", () => {
  const links = (kinds: string) => [...kinds].map((k, i) => ({ id: `l${i}`, twoSteps: k === "T" }));

  it("Pro: 3 links in total, any mix", () => {
    expect([...allowedLinkIds("PRO", links("TTCC"))]).toEqual(["l0", "l1", "l2"]);
    expect(linkLimitError("PRO", { twoSteps: 2, classic: 0 }, false)).toBeNull();
    expect(linkLimitError("PRO", { twoSteps: 2, classic: 1 }, true)).toMatch(/3 links in total.*Business/);
  });

  it("Business: 10 of each kind", () => {
    expect(allowedLinkIds("BUSINESS", links("T".repeat(12) + "C".repeat(3))).size).toBe(13);
    expect(linkLimitError("BUSINESS", { twoSteps: 10, classic: 2 }, true)).toMatch(/10 Two-Steps/);
    expect(linkLimitError("BUSINESS", { twoSteps: 10, classic: 2 }, false)).toBeNull();
    expect(linkLimitError("BUSINESS", { twoSteps: 10, classic: 10 }, false)).toMatch(/20 links in total/);
  });

  it("Free: 1 link", () => {
    expect(allowedLinkIds("FREE", links("CC")).size).toBe(1);
    expect(linkLimitError("FREE", { twoSteps: 0, classic: 1 }, false)).toMatch(/Upgrade to Pro/);
  });
});

describe("page and domain limits", () => {
  it("Pro has 3 pages and 1 domain; Business 10 of each", () => {
    expect(countLimitError("PRO", "maxPages", 2)).toBeNull();
    expect(countLimitError("PRO", "maxPages", 3)).toMatch(/3 bio pages.*Business for up to 10/);
    expect(countLimitError("PRO", "customDomains", 1)).toMatch(/1 custom domain\..*Business/);
    expect(countLimitError("BUSINESS", "customDomains", 9)).toBeNull();
    expect(countLimitError("BUSINESS", "customDomains", 10)).toMatch(/10 custom domains\.$/);
    expect(countLimitError("FREE", "customDomains", 0)).toMatch(/Upgrade to Pro for up to 1/);
  });
});
