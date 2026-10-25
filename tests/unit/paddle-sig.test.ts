import { describe, expect, it } from "vitest";
import { paddleSignature, verifyPaddleSignature } from "@/lib/paddle-sig";

const secret = "pdl_ntfset_test_secret";
const body = JSON.stringify({ event_id: "evt_1", event_type: "subscription.created", data: { id: "sub_1" } });
const now = 1_760_000_000_000;
const ts = String(now / 1000);
const header = `ts=${ts};h1=${paddleSignature(body, ts, secret)}`;

describe("verifyPaddleSignature", () => {
  it("accepts a correctly signed body", () => {
    expect(verifyPaddleSignature(body, header, secret, now)).toBe(true);
  });
  it("rejects a changed body", () => {
    expect(verifyPaddleSignature(body.replace("sub_1", "sub_2"), header, secret, now)).toBe(false);
  });
  it("rejects the wrong secret", () => {
    expect(verifyPaddleSignature(body, header, "other", now)).toBe(false);
  });
  it("rejects an old timestamp (replay)", () => {
    expect(verifyPaddleSignature(body, header, secret, now + 10 * 60_000)).toBe(false);
  });
  it("rejects a missing or malformed header", () => {
    expect(verifyPaddleSignature(body, null, secret, now)).toBe(false);
    expect(verifyPaddleSignature(body, "h1=abc", secret, now)).toBe(false);
  });
  it("accepts any of several h1 values (secret rotation)", () => {
    expect(verifyPaddleSignature(body, `ts=${ts};h1=deadbeef;h1=${paddleSignature(body, ts, secret)}`, secret, now)).toBe(true);
  });
});
