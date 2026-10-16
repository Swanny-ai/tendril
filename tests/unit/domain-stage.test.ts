import { describe, expect, it } from "vitest";
import { apexOf, apexOfWww, domainStage, wwwOf } from "@/lib/domain-names";

describe("domainStage", () => {
  it("follows DNS, then hosting, then HTTPS", () => {
    expect(domainStage({ dns: false, http: false, https: false })).toBe("dns");
    expect(domainStage({ dns: true, http: false, https: false })).toBe("connecting");
    expect(domainStage({ dns: true, http: true, https: false })).toBe("https");
    expect(domainStage({ dns: true, http: true, https: true })).toBe("connected");
  });
});

describe("www helpers", () => {
  it("pairs apex domains with their www form", () => {
    expect(wwwOf("sarahjames.me")).toBe("www.sarahjames.me");
    expect(wwwOf("shop.co.uk")).toBe("www.shop.co.uk");
    expect(wwwOf("links.sarahjames.me")).toBeNull();
    expect(apexOfWww("www.sarahjames.me")).toBe("sarahjames.me");
    expect(apexOfWww("www.links.sarahjames.me")).toBeNull();
    expect(apexOfWww("sarahjames.me")).toBeNull();
  });
});

describe("apexOf", () => {
  it("finds the registrable domain", () => {
    expect(apexOf("tendril-test.sarahjames.me")).toBe("sarahjames.me");
    expect(apexOf("sarahjames.me")).toBe("sarahjames.me");
    expect(apexOf("links.shop.co.uk")).toBe("shop.co.uk");
    expect(apexOf("a.b.example.com")).toBe("example.com");
  });
});
