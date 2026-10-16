// "Open in browser" deep links: move a visitor from a social app's built-in browser
// (Instagram, TikTok, Facebook...) to the phone's default browser. Pure and client-safe.
//
// Android: an intent:// URL with no package lets Android open the link in the default
// browser; S.browser_fallback_url covers the rare case where nothing handles it.
// iPhone, Instagram/Threads: Meta's own instagram://extbrowser/?url=... (barcelona:// for
//   Threads). Instagram asks "open outside Instagram?" and then opens the default browser.
//   It must come from a tap (a link the visitor presses), not a script on page load.
// iPhone, other apps (TikTok, X, LinkedIn...): x-safari-https:// opens Safari on iOS 17+.
// None of these are documented promises, so callers always offer a manual fallback.

import { detectInAppBrowser } from "./in-app";

export type MobilePlatform = "android" | "ios" | "other";

export function platformFromUserAgent(ua: string): MobilePlatform {
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) return "ios";
  return "other";
}

/** Meta's apps report "Instagram" or, for Threads, "Barcelona" in their user agent. */
function metaScheme(ua: string): "instagram" | "barcelona" | null {
  if (/Barcelona/i.test(ua)) return "barcelona";
  if (/Instagram/i.test(ua)) return "instagram";
  return null;
}

/**
 * URL that asks the phone to open `target` (an absolute http(s) URL) in the default browser,
 * or null when there's no way to do it. Pass the visitor's user agent so Instagram and
 * Threads on iPhone get their own scheme.
 */
export function openInBrowserUrl(target: string, platform: MobilePlatform, userAgent = ""): string | null {
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
    const meta = metaScheme(userAgent);
    if (meta) return `${meta}://extbrowser/?url=${encodeURIComponent(url.toString())}`;
    return `x-safari-${url.toString()}`;
  }
  return null;
}

/**
 * The "open in default browser" URL for `target`, but only for visitors inside a social
 * app's built-in browser on a phone. Everyone else gets null (use the normal link).
 */
export function inAppDeepLink(userAgent: string, target: string): string | null {
  if (!detectInAppBrowser(userAgent)) return null;
  return openInBrowserUrl(target, platformFromUserAgent(userAgent), userAgent);
}

/** Link prefixes produced by openInBrowserUrl (used to spot deep-link taps). */
export const DEEP_LINK_SELECTOR = 'a[href^="intent:"], a[href^="x-safari-"], a[href^="instagram:"], a[href^="barcelona:"]';
