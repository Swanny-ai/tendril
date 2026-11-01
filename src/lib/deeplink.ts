// "Open in browser" deep links: move a visitor from a social app's built-in browser
// (Instagram, TikTok, Facebook...) to the phone's default browser. Pure and client-safe.
//
// Android: a chain of intent:// URLs, each naming a browser. Without a package, Chromium-based
//   in-app browsers (Facebook's among them) treat an https intent as a normal page load and
//   stay inside the app; naming a browser makes them hand it over. When that browser isn't
//   installed, Android loads the intent's S.browser_fallback_url instead, which is our
//   /api/open-hop redirect to the next intent in the chain:
//     1. Chrome  2. Samsung Internet  3. the phone's default browser (any)  4. stay here.
// iPhone, Instagram/Threads: Meta's own instagram://extbrowser/?url=... (barcelona:// for
//   Threads). Instagram asks "open outside Instagram?" and then opens the default browser.
//   It must come from a tap (a link the visitor presses), not a script on page load.
// iPhone, Facebook / Messenger: x-safari-https:// (works on many iOS versions, not all). When
//   it doesn't, the page's "Didn't open?" sheet shows the press-and-hold steps.
// iPhone, TikTok: ignores all of the above, so there is no link to tap. Instead the visitor
//   presses and holds a link to the destination: iOS's own long-press menu has "Open in
//   browser" (see pressAndHoldOnly and components/browser-escape).
// iPhone, other apps (X, LinkedIn, Snapchat...): x-safari-https:// opens Safari on iOS 17+.
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

/** iPhone apps with no way to open the browser from a link (TikTok): use press-and-hold instead. */
export function pressAndHoldOnly(ua: string): boolean {
  return platformFromUserAgent(ua) === "ios" && /musical_ly|Bytedance|TikTok/i.test(ua) && !/Instagram|Barcelona/i.test(ua);
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
  if (platform === "android") return androidIntent(url, ANDROID_CHAIN[0], hopUrl(url, 1));
  if (platform === "ios") {
    const meta = metaScheme(userAgent);
    if (meta) return `${meta}://extbrowser/?url=${encodeURIComponent(url.toString())}`;
    if (pressAndHoldOnly(userAgent)) return null;
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

// ---------- Android browser chain ----------

/** Browsers tried in order; null = whichever browser the phone uses by default. */
export const ANDROID_CHAIN: (string | null)[] = ["com.android.chrome", "com.sec.android.app.sbrowser", null];

/** Our redirect to step `step` of the chain for `target` (always on the target's own host). */
function hopUrl(target: URL, step: number): string {
  return `${target.origin}/api/open-hop?u=${encodeURIComponent(target.toString())}&s=${step}`;
}

/** An intent opening `target` in `pkg` (or the default browser), loading `fallback` when that fails. */
function androidIntent(target: URL, pkg: string | null, fallback: string): string {
  const scheme = target.protocol.slice(0, -1);
  const rest = `${target.host}${target.pathname}${target.search}`;
  const app = pkg ? `package=${pkg};` : "action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;";
  return `intent://${rest}#Intent;scheme=${scheme};${app}S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

/**
 * Where /api/open-hop sends the phone for step `step` of the chain: the next browser's intent,
 * or the page itself once every browser was tried. Null when `target` isn't an http(s) page on
 * `host` (the hop only ever redirects to its own site, so it can't be used as an open redirect).
 */
export function openHopLocation(target: string, step: number, host: string): string | null {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.host.toLowerCase() !== host.toLowerCase()) return null;
  if (!Number.isInteger(step) || step < 1 || step >= ANDROID_CHAIN.length) return url.toString();
  const last = step === ANDROID_CHAIN.length - 1;
  return androidIntent(url, ANDROID_CHAIN[step], last ? url.toString() : hopUrl(url, step + 1));
}

/** Link prefixes produced by openInBrowserUrl (used to spot deep-link taps). */
export const DEEP_LINK_SELECTOR = 'a[href^="intent:"], a[href^="x-safari-"], a[href^="instagram:"], a[href^="barcelona:"]';
