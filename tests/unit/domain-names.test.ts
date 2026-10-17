import { describe, expect, it } from "vitest";
import { isApex, isAppHost, isClaimable, normalizeHostname } from "@/lib/domain-names";

describe("normalizeHostname", () => {
  it("cleans up what people paste", () => {
    expect(normalizeHostname("https://Links.Example.com/vip?x=1")).toBe("links.example.com");
    expect(normalizeHostname("example.com.")).toBe("example.com");
    expect(normalizeHostname("shop.example.co.uk:443")).toBe("shop.example.co.uk");
  });
  it("rejects things that aren't domains", () => {
    for (const bad of ["", "localhost", "exa mple.com", "-bad.com", "a..com", "example", "http://"]) expect(normalizeHostname(bad)).toBeNull();
  });
});

describe("hosts", () => {
  const app = "tendril-swanny.netlify.app";
  it("knows the app's own hosts", () => {
    expect(isAppHost("tendril-swanny.netlify.app", app)).toBe(true);
    expect(isAppHost("localhost:3000", app)).toBe(true);
    expect(isAppHost("deploy-preview-3--tendril-swanny.netlify.app", app)).toBe(true);
    expect(isAppHost("links.example.com", app)).toBe(false);
    expect(isAppHost("viewlink.me", "viewlink.me")).toBe(true);
    expect(isAppHost("www.viewlink.me", "viewlink.me")).toBe(true);
    expect(isClaimable("www.viewlink.me", "viewlink.me")).toBe(false);
  });
  it("won't let anyone claim the app's or Netlify's domains", () => {
    expect(isClaimable("links.example.com", app)).toBe(true);
    expect(isClaimable("other.netlify.app", app)).toBe(false);
    expect(isClaimable("8.8.8.8", app)).toBe(false);
  });
  it("tells apex domains from subdomains", () => {
    expect(isApex("example.com")).toBe(true);
    expect(isApex("example.co.uk")).toBe(true);
    expect(isApex("links.example.com")).toBe(false);
    expect(isApex("links.example.co.uk")).toBe(false);
  });
});
