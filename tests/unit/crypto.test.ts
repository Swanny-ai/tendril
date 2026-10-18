import { describe, expect, it } from "vitest";
import { nowpaymentsSignature, verifyNowpaymentsSignature } from "@/lib/crypto-sig";
import { extendPrepaid, planFromSubscription } from "@/lib/plan-rules";

describe("NOWPayments signatures", () => {
  const secret = "test-ipn-secret";
  const body = { payment_status: "finished", order_id: "abc", price_amount: 6, fee: { currency: "usdt", depositFee: 0 } };

  it("accepts a correctly signed body, whatever its key order", () => {
    const sig = nowpaymentsSignature(body, secret);
    const reordered = { order_id: "abc", fee: { depositFee: 0, currency: "usdt" }, price_amount: 6, payment_status: "finished" };
    expect(verifyNowpaymentsSignature(reordered, sig, secret)).toBe(true);
    expect(verifyNowpaymentsSignature(body, sig.toUpperCase(), secret)).toBe(true);
  });

  it("rejects tampered bodies, wrong secrets and missing signatures", () => {
    const sig = nowpaymentsSignature(body, secret);
    expect(verifyNowpaymentsSignature({ ...body, price_amount: 600 }, sig, secret)).toBe(false);
    expect(verifyNowpaymentsSignature(body, sig, "other-secret")).toBe(false);
    expect(verifyNowpaymentsSignature(body, null, secret)).toBe(false);
    expect(verifyNowpaymentsSignature(body, sig, "")).toBe(false);
  });
});

describe("prepaid Pro", () => {
  const now = new Date("2026-10-19T12:00:00Z");

  it("adds a month or a year from today, or from a later end date", () => {
    expect(extendPrepaid(null, "month", now).toISOString()).toBe("2026-11-19T12:00:00.000Z");
    expect(extendPrepaid(null, "year", now).toISOString()).toBe("2027-10-19T12:00:00.000Z");
    expect(extendPrepaid(new Date("2026-12-01T00:00:00Z"), "month", now).toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(extendPrepaid(new Date("2026-01-01T00:00:00Z"), "month", now).toISOString()).toBe("2026-11-19T12:00:00.000Z"); // expired end
  });

  it("is Pro until the end date, then Free", () => {
    const sub = { plan: "PRO" as const, status: "prepaid", currentPeriodEnd: new Date("2026-11-01T00:00:00Z") };
    expect(planFromSubscription(sub, now)).toBe("PRO");
    expect(planFromSubscription(sub, new Date("2026-11-02T00:00:00Z"))).toBe("FREE");
    expect(planFromSubscription({ ...sub, currentPeriodEnd: null }, now)).toBe("FREE");
    expect(planFromSubscription({ plan: "PRO", status: "active" }, now)).toBe("PRO");
  });
});
