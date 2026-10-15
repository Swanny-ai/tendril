import { UAParser } from "ua-parser-js";
import { detectInAppBrowser } from "@/lib/in-app";

export { detectInAppBrowser };

export type ParsedUA = { device: "mobile" | "tablet" | "desktop"; os: string | null; browser: string | null };

export function parseUserAgent(ua: string): ParsedUA {
  const r = new UAParser(ua).getResult();
  const type = r.device.type;
  const device = type === "mobile" || type === "wearable" ? "mobile" : type === "tablet" ? "tablet" : /Mobi|Android/i.test(ua) ? "mobile" : "desktop";
  const osName = (r.os.name ?? "").toLowerCase();
  const os = osName.includes("ios") || osName.includes("ipados")
    ? "ios"
    : osName.includes("android")
      ? "android"
      : osName.includes("windows")
        ? "windows"
        : osName.includes("mac")
          ? "macos"
          : osName.includes("linux") || osName.includes("ubuntu")
            ? "linux"
            : osName
              ? "other"
              : null;
  const inApp = detectInAppBrowser(ua);
  const browser = inApp ? `${inApp}-webview` : r.browser.name ? r.browser.name.toLowerCase().replace(/^mobile /, "") : null;
  return { device, os, browser };
}
