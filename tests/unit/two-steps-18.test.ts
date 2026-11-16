import { describe, expect, it } from "vitest";
import { DEFAULT_LANDING, parseLanding } from "@/lib/link-landing";

// Two-Steps 18+: a Two-Steps link whose Step 2 is the 18+ warning, stored as landingPage.step2.
describe("Two-Steps 18+ landing", () => {
  it("defaults to a Step 2 page", () => {
    expect(DEFAULT_LANDING.step2).toBe("page");
    expect(parseLanding({ enabled: true })?.step2).toBe("page");
  });
  it("keeps step2 = warning", () => {
    expect(parseLanding({ enabled: true, step2: "warning" })?.step2).toBe("warning");
  });
  it("ignores unknown values", () => {
    expect(parseLanding({ enabled: true, step2: "other" })?.step2).toBe("page");
  });
});
