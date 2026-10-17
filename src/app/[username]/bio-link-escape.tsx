"use client";

import { useEffect } from "react";
import { useBrowserEscape } from "@/components/browser-escape";
import { openInBrowserUrl, platformFromUserAgent } from "@/lib/deeplink";
import { detectInAppBrowser } from "@/lib/in-app";

/**
 * Deep links for the bio page: inside Instagram, TikTok, Facebook... tapping a link button
 * opens it in the phone's default browser instead of the app's built-in one. Apps with no way
 * to do that from a link (Facebook, Messenger, TikTok on iPhone) get a press-and-hold button.
 * The page HTML is cached and identical for everyone; this only changes behaviour on the phone.
 */
export function BioLinkEscape() {
  const escape = useBrowserEscape();
  const { watch, hold, holdOnly } = escape;

  useEffect(() => {
    const ua = navigator.userAgent;
    if (!detectInAppBrowser(ua)) return;
    const platform = platformFromUserAgent(ua);
    if (platform === "other") return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // Links with a content warning open the 18+ popup first (see warning-popup.tsx).
      const a = (e.target as Element).closest?.('a[href^="/go/"]:not([data-warning])') as HTMLAnchorElement | null;
      if (!a) return;
      const stay = a.getAttribute("href") ?? "/";
      if (holdOnly()) {
        e.preventDefault();
        hold(a.href, stay);
        return;
      }
      const deepLink = openInBrowserUrl(a.href, platform, ua);
      if (!deepLink) return;
      e.preventDefault();
      window.location.href = deepLink;
      watch(a.href, stay);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [watch, hold, holdOnly]);

  return escape.sheet;
}
