import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseUserAgent } from "@/lib/ua";

describe("parseUserAgent", () => {
  it("parses an iPhone in Instagram", () => {
    expect(parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.28.85")).toEqual({
      device: "mobile", os: "ios", browser: "instagram-webview",
    });
  });
  it("parses desktop Chrome on Windows", () => {
    expect(parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36")).toEqual({
      device: "desktop", os: "windows", browser: "chrome",
    });
  });
  it("parses an iPad as a tablet", () => {
    expect(parseUserAgent("Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1").device).toBe("tablet");
  });
  it("handles an empty user agent", () => expect(parseUserAgent("")).toEqual({ device: "desktop", os: null, browser: null }));
});
