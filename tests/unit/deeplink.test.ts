import { describe, expect, it } from "vitest";
import { inAppDeepLink, openInBrowserUrl, platformFromUserAgent, pressAndHoldOnly } from "@/lib/deeplink";

const ANDROID_IG =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.0";
const IOS_IG = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

describe("platformFromUserAgent", () => {
  it("detects Android, iOS and others", () => {
    expect(platformFromUserAgent(ANDROID_IG)).toBe("android");
    expect(platformFromUserAgent(IOS_IG)).toBe("ios");
    expect(platformFromUserAgent(DESKTOP)).toBe("other");
  });
});

describe("openInBrowserUrl", () => {
  const target = "https://tendril.example/l/vip-page?ib=1";

  it("builds an Android intent with a browser fallback", () => {
    expect(openInBrowserUrl(target, "android")).toBe(
      "intent://tendril.example/l/vip-page?ib=1#Intent;scheme=https;S.browser_fallback_url=https%3A%2F%2Ftendril.example%2Fl%2Fvip-page%3Fib%3D1;end",
    );
  });

  it("uses the Safari scheme on iOS", () => {
    expect(openInBrowserUrl(target, "ios")).toBe("x-safari-https://tendril.example/l/vip-page?ib=1");
  });

  it("does nothing elsewhere or for unsafe URLs", () => {
    expect(openInBrowserUrl(target, "other")).toBeNull();
    expect(openInBrowserUrl("javascript:alert(1)", "android")).toBeNull();
    expect(openInBrowserUrl("not a url", "ios")).toBeNull();
  });
});

describe("inAppDeepLink", () => {
  it("only applies inside social apps on phones", () => {
    const target = "https://tendril.example/l/vip?ok=1&ib=1";
    expect(inAppDeepLink(IOS_IG, target)).toBe("instagram://extbrowser/?url=https%3A%2F%2Ftendril.example%2Fl%2Fvip%3Fok%3D1%26ib%3D1");
    expect(inAppDeepLink(ANDROID_IG, target)).toMatch(/^intent:\/\/tendril\.example\/l\/vip\?ok=1&ib=1#Intent;scheme=https;/);
    const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
    expect(inAppDeepLink(safari, target)).toBeNull();
    expect(inAppDeepLink(DESKTOP, target)).toBeNull();
  });
});

describe("iPhone apps", () => {
  const target = "https://tendril.example/l/vip?ok=1";
  it("uses Instagram's and Threads' own external-browser links", () => {
    expect(openInBrowserUrl(target, "ios", IOS_IG)).toBe("instagram://extbrowser/?url=https%3A%2F%2Ftendril.example%2Fl%2Fvip%3Fok%3D1");
    const threads = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 350.0.0";
    expect(openInBrowserUrl(target, "ios", threads)).toBe("barcelona://extbrowser/?url=https%3A%2F%2Ftendril.example%2Fl%2Fvip%3Fok%3D1");
  });
  it("has no link for Facebook, Messenger and TikTok on iPhone: they use press-and-hold", () => {
    const tiktok = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_35.0 BytedanceWebview";
    const facebook = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]";
    for (const ua of [tiktok, facebook]) {
      expect(pressAndHoldOnly(ua)).toBe(true);
      expect(inAppDeepLink(ua, target)).toBeNull();
    }
    expect(pressAndHoldOnly(IOS_IG)).toBe(false);
    expect(pressAndHoldOnly(ANDROID_IG)).toBe(false);
  });
  it("keeps the Safari scheme for other iPhone apps", () => {
    const x = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/10.60";
    expect(inAppDeepLink(x, target)).toBe("x-safari-https://tendril.example/l/vip?ok=1");
  });
});
