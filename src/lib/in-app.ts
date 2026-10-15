// Tiny, dependency-free in-app browser detection (safe to ship to the client).
export type InAppBrowser = "instagram" | "facebook" | "tiktok" | "snapchat" | "linkedin" | "twitter" | null;

/** Detects social apps' built-in browsers from the user agent. Order matters. */
export function detectInAppBrowser(ua: string): InAppBrowser {
  if (/Instagram|Barcelona/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS|MessengerForiOS/i.test(ua)) return "facebook";
  if (/musical_ly|Bytedance|TikTok/i.test(ua)) return "tiktok";
  if (/Snapchat/i.test(ua)) return "snapchat";
  if (/LinkedInApp/i.test(ua)) return "linkedin";
  if (/Twitter|TwitterAndroid/i.test(ua)) return "twitter";
  return null;
}
