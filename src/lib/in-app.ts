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

// Every link tapped on X goes through its t.co shortener, so a phone arriving from t.co (or x.com)
// came from X. Needed because X's built-in browser (Safari View on iPhone, a Chrome tab on Android)
// sends the plain Safari / Chrome user agent, with nothing that names X.
const X_REFERRER = /^https?:\/\/(?:[^/?#]*\.)?(?:t\.co|x\.com|twitter\.com)(?:[/:?#]|$)/i;

/** detectInAppBrowser, plus X: a phone whose request came from t.co / x.com (the Referer header). */
export function detectInAppRequest(ua: string, referer: string | null | undefined): InAppBrowser {
  const app = detectInAppBrowser(ua);
  if (app) return app;
  if (referer && X_REFERRER.test(referer) && /iPhone|iPad|iPod|Android/i.test(ua)) return "twitter";
  return null;
}
