import { describe, expect, it } from "vitest";
import { platformCounts, platformLabel } from "@/lib/analytics/platform";
import { parseUserAgent } from "@/lib/ua";

const IG = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.28.85";
const TT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 musical_ly_40.5.0 BytedanceWebview/d8a21c6";
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1";
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

describe("platformLabel", () => {
  it("names social apps' in-app browsers", () => {
    expect(platformLabel("instagram-webview")).toBe("Instagram");
    expect(platformLabel("tiktok-webview")).toBe("TikTok");
    expect(platformLabel("facebook-webview")).toBe("Facebook");
    expect(platformLabel("snapchat-webview")).toBe("Snapchat");
    expect(platformLabel("linkedin-webview")).toBe("LinkedIn");
    expect(platformLabel("twitter-webview")).toBe("X");
  });
  it("names regular browsers and falls back to Other", () => {
    expect(platformLabel("safari")).toBe("Safari");
    expect(platformLabel("chrome")).toBe("Chrome");
    expect(platformLabel("chrome webview")).toBe("Chrome");
    expect(platformLabel("yandex")).toBe("Other");
    expect(platformLabel(null)).toBe("Other");
  });
  it("matches what the user-agent parser stores", () => {
    expect(platformLabel(parseUserAgent(IG).browser)).toBe("Instagram");
    expect(platformLabel(parseUserAgent(TT).browser)).toBe("TikTok");
    expect(platformLabel(parseUserAgent(SAFARI).browser)).toBe("Safari");
    expect(platformLabel(parseUserAgent(CHROME).browser)).toBe("Chrome");
  });
});

describe("platformCounts", () => {
  it("merges browsers into platforms, biggest first, Other last", () => {
    expect(
      platformCounts([
        { browser: null, count: 9 },
        { browser: "safari", count: 2 },
        { browser: "mobile safari", count: 3 },
        { browser: "instagram-webview", count: 4 },
        { browser: "opera", count: 1 },
      ]),
    ).toEqual([
      { label: "Safari", count: 5 },
      { label: "Instagram", count: 4 },
      { label: "Other", count: 10 },
    ]);
  });
});
