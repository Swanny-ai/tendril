import { describe, expect, it } from "vitest";
import { classifySource, normalizeReferrer, referrerLabel } from "@/lib/analytics/referrer";
import { detectInAppBrowser } from "@/lib/in-app";

const IG = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.28.85";
const TT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 musical_ly_40.5.0 BytedanceWebview/d8a21c6";
const FB = "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/140.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]";
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1";

describe("normalizeReferrer", () => {
  it("strips www and lowercases", () => expect(normalizeReferrer("https://WWW.Example.com/a?b")).toBe("example.com"));
  it("returns null for empty, invalid, or own host", () => {
    expect(normalizeReferrer("")).toBeNull();
    expect(normalizeReferrer("not a url")).toBeNull();
    expect(normalizeReferrer("https://tendril.app/x", "tendril.app")).toBeNull();
  });
  it("supports android-app referrers", () => expect(normalizeReferrer("android-app://com.google.android.googlequicksearchbox/")).toBe("com.google.android.googlequicksearchbox"));
});

describe("classifySource", () => {
  it.each([
    ["l.instagram.com", "social"], ["t.co", "social"], ["m.facebook.com", "social"], ["youtube.com", "social"],
    ["google.com", "search"], ["google.co.uk", "search"], ["duckduckgo.com", "search"], ["com.google.android.googlequicksearchbox", "search"],
    ["someblog.net", "web"],
  ])("%s → %s", (host, source) => expect(classifySource(host, null).source).toBe(source));
  it("is direct when there is no referrer and no app", () => expect(classifySource(null, null)).toEqual({ source: "direct", referrerHost: null }));
  it("attributes empty-referrer webview visits to the app", () => expect(classifySource(null, "tiktok")).toEqual({ source: "social", referrerHost: "tiktok.com" }));
});

describe("referrerLabel", () => {
  it.each([["l.instagram.com", "Instagram"], ["instagram.com", "Instagram"], ["t.co", "X"], ["google.de", "Google"], [null, "Direct"], ["blog.dev", "blog.dev"]])("%s → %s", (h, l) => {
    expect(referrerLabel(h)).toBe(l);
  });
});

describe("detectInAppBrowser", () => {
  it.each([[IG, "instagram"], [TT, "tiktok"], [FB, "facebook"], [SAFARI, null]])("detects %#", (ua, app) => expect(detectInAppBrowser(ua)).toBe(app));
});
