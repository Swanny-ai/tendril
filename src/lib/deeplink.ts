// "Open in browser" deep links: move a visitor from a social app's built-in browser
// (Instagram, TikTok, Facebook...) to the phone's default browser. Pure and client-safe.
//
// Android: an intent:// URL with no package lets Android open the link in the default
// browser; S.browser_fallback_url covers the rare case where nothing handles it.
// iOS 17+: the x-safari-https:// scheme opens Safari. Older iOS versions and some app
// versions ignore it, so callers should always offer a manual fallback.

export type MobilePlatform = "android" | "ios" | "other";

export function platformFromUserAgent(ua: string): MobilePlatform {
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) return "ios";
  return "other";
}

/** URL that asks the OS to open `target` (an absolute http(s) URL) in the default browser, or null. */
export function openInBrowserUrl(target: string, platform: MobilePlatform): string | null {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const scheme = url.protocol.slice(0, -1);
  if (platform === "android") {
    const rest = `${url.host}${url.pathname}${url.search}`;
    return `intent://${rest}#Intent;scheme=${scheme};S.browser_fallback_url=${encodeURIComponent(url.toString())};end`;
  }
  if (platform === "ios") {
    return `x-safari-${url.toString()}`;
  }
  return null;
}
