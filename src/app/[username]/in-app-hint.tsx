"use client";

import { useState, useSyncExternalStore } from "react";
import { detectInAppBrowser, type InAppBrowser } from "@/lib/in-app";

const APP_NAMES: Record<Exclude<InAppBrowser, null>, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  linkedin: "LinkedIn",
  twitter: "X",
};

const DISMISS_KEY = "tendril-hint-dismissed";
const noopSubscribe = () => () => {};

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Social apps open links in a limited built-in browser. We show a short, dismissible
 * tip on how to open the page in the phone's real browser. Detection runs client-side
 * (server snapshot = null) so the cached HTML stays the same for every visitor.
 */
export function InAppHint() {
  const app = useSyncExternalStore(noopSubscribe, () => detectInAppBrowser(navigator.userAgent), () => null);
  const isIOS = useSyncExternalStore(noopSubscribe, () => /iPhone|iPad|iPod/i.test(navigator.userAgent), () => false);
  const storedDismissed = useSyncExternalStore(noopSubscribe, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);

  if (!app || dismissed || storedDismissed) return null;
  const steps =
    app === "tiktok" || (app === "facebook" && isIOS)
      ? "Tap ••• in the corner, then choose “Open in browser”."
      : isIOS
        ? "Tap ••• in the corner, then “Open in external browser”."
        : "Tap ⋮ in the corner, then “Open in Chrome”.";

  return (
    <div role="note" className="sticky top-0 z-20 flex items-start gap-3 bg-[#1c1a24] px-4 py-3 text-sm text-white shadow-md">
      <p className="flex-1 leading-snug">
        <strong className="font-semibold">You&apos;re in {APP_NAMES[app]}&apos;s browser.</strong> For logins, payments and saved passwords to work,
        open this page in your browser. {steps}
      </p>
      <button
        type="button"
        className="rounded-md px-2 py-1 text-white/80 hover:bg-white/10 hover:text-white"
        aria-label="Dismiss tip"
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* storage blocked */
          }
        }}
      >
        ✕
      </button>
    </div>
  );
}
