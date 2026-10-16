import { describe, expect, it } from "vitest";
import { domainStage } from "@/lib/domain-names";

describe("domainStage", () => {
  it("follows DNS, then hosting, then HTTPS", () => {
    expect(domainStage({ dns: false, http: false, https: false })).toBe("dns");
    expect(domainStage({ dns: true, http: false, https: false })).toBe("connecting");
    expect(domainStage({ dns: true, http: true, https: false })).toBe("https");
    expect(domainStage({ dns: true, http: true, https: true })).toBe("connected");
  });
});
