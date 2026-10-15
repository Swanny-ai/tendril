import { describe, expect, it } from "vitest";
import { normalizeDestinationUrl, usernameSchema } from "@/lib/validation";

describe("usernameSchema", () => {
  it.each(["maya", "maya.ceramics", "a_b_c", "abc123"])("accepts %s", (u) => {
    expect(usernameSchema.safeParse(u).success).toBe(true);
  });
  it("lowercases input", () => {
    expect(usernameSchema.parse("MayaC")).toBe("mayac");
  });
  it.each(["ab", "has space", ".lead", "trail.", "dou..ble", "admin", "dashboard", "go", "x".repeat(31), "emoji😀"])("rejects %s", (u) => {
    expect(usernameSchema.safeParse(u).success).toBe(false);
  });
});

describe("normalizeDestinationUrl", () => {
  it("adds https when the scheme is missing", () => {
    expect(normalizeDestinationUrl("example.com/shop")).toEqual({ ok: true, url: "https://example.com/shop" });
  });
  it("keeps http and https", () => {
    expect(normalizeDestinationUrl("http://example.com").ok).toBe(true);
    expect(normalizeDestinationUrl("https://example.com/a?b=1#c")).toEqual({ ok: true, url: "https://example.com/a?b=1#c" });
  });
  it.each(["javascript:alert(1)", "data:text/html,hi", "ftp://example.com", "mailto:a@b.c"])("rejects %s", (u) => {
    expect(normalizeDestinationUrl(u).ok).toBe(false);
  });
  it("rejects empty and hostless input", () => {
    expect(normalizeDestinationUrl("").ok).toBe(false);
    expect(normalizeDestinationUrl("notaurl").ok).toBe(false);
  });
  it("rejects credentials in URLs", () => {
    expect(normalizeDestinationUrl("https://user:pass@example.com").ok).toBe(false);
  });
  it("rejects redirect loops into our own /go/ route", () => {
    expect(normalizeDestinationUrl("https://tendril.app/go/abc", "tendril.app").ok).toBe(false);
    expect(normalizeDestinationUrl("https://tendril.app/someone", "tendril.app").ok).toBe(true);
  });
});
