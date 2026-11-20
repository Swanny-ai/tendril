import { describe, expect, it } from "vitest";
import { inAppDeepLink } from "@/lib/deeplink";
import { detectInAppRequest } from "@/lib/in-app";

// X's built-in browser sends the plain Safari / Chrome user agent; its t.co referrer gives it away.
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

describe("X (Twitter) in-app browser", () => {
  it("spots X from a t.co / x.com referrer on phones", () => {
    expect(detectInAppRequest(SAFARI, "https://t.co/abc123")).toBe("twitter");
    expect(detectInAppRequest(SAFARI, "https://t.co/")).toBe("twitter");
    expect(detectInAppRequest(CHROME_ANDROID, "https://x.com/someone/status/1")).toBe("twitter");
    expect(detectInAppRequest(SAFARI, "https://mobile.twitter.com/")).toBe("twitter");
  });
  it("ignores other referrers, no referrer, desktops and look-alike hosts", () => {
    expect(detectInAppRequest(SAFARI, null)).toBeNull();
    expect(detectInAppRequest(SAFARI, "https://google.com/")).toBeNull();
    expect(detectInAppRequest(SAFARI, "https://notx.com/")).toBeNull();
    expect(detectInAppRequest(SAFARI, "https://t.co.evil.com/")).toBeNull();
    expect(detectInAppRequest(DESKTOP, "https://t.co/abc")).toBeNull();
  });
  it("gives an open-in-Safari link for X on iPhone", () => {
    expect(inAppDeepLink(SAFARI, "https://viewlink.me/l/a?ok=1&ib=1", "https://t.co/x")).toBe("x-safari-https://viewlink.me/l/a?ok=1&ib=1");
    expect(inAppDeepLink(SAFARI, "https://viewlink.me/l/a?ok=1&ib=1", null)).toBeNull();
  });
});
