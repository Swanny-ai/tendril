"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, MoreVertical, X } from "lucide-react";
import { openInBrowserUrl, platformFromUserAgent } from "@/lib/deeplink";
import { detectInAppBrowser } from "@/lib/in-app";

/**
 * Deep links for the bio page: inside Instagram, TikTok, Facebook... tapping a link button
 * opens it in the phone's default browser instead of the app's built-in one. The page HTML
 * is cached and identical for everyone; this only changes behaviour on the visitor's phone.
 */
export function BioLinkEscape() {
  const [help, setHelp] = useState<{ href: string; android: boolean } | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (!detectInAppBrowser(ua)) return;
    const platform = platformFromUserAgent(ua);
    if (platform === "other") return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // Links with a content warning stay in the app: the warning shows here and its confirm
      // button opens the default browser (see /go/[blockId]/warning).
      const a = (e.target as Element).closest?.('a[href^="/go/"]:not([data-warning])') as HTMLAnchorElement | null;
      if (!a) return;
      const deepLink = openInBrowserUrl(a.href, platform);
      if (!deepLink) return;
      e.preventDefault();
      window.location.href = deepLink;
      window.setTimeout(() => {
        if (document.visibilityState === "visible") setHelp({ href: a.getAttribute("href") ?? "/", android: platform === "android" });
      }, 1500);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!help) return null;
  return (
    <div role="dialog" aria-label="Open in your browser" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm rounded-2xl bg-[#1c1a24] p-4 text-sm text-white shadow-2xl">
      <button type="button" aria-label="Close" onClick={() => setHelp(null)} className="absolute top-2 right-2 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white">
        <X className="size-4" />
      </button>
      <p className="pr-6 font-semibold">Didn&apos;t open in your browser?</p>
      <p className="mt-1 flex flex-wrap items-center gap-1 text-white/80">
        Tap {help.android ? <MoreVertical className="inline size-4" aria-label="the menu button" /> : <MoreHorizontal className="inline size-4" aria-label="the menu button" />} in the top corner,
        then &ldquo;Open in {help.android ? "Chrome" : "external browser"}&rdquo;.
      </p>
      <a href={help.href} className="mt-3 block rounded-xl bg-white/10 py-2 text-center font-medium hover:bg-white/15">
        Continue here instead
      </a>
    </div>
  );
}
