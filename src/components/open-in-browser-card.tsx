"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ExternalLink, MoreHorizontal, MoreVertical } from "lucide-react";
import { openInBrowserUrl, platformFromUserAgent, type MobilePlatform } from "@/lib/deeplink";
import { detectInAppBrowser, type InAppBrowser } from "@/lib/in-app";

const APP_NAMES: Record<Exclude<InAppBrowser, null>, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  linkedin: "LinkedIn",
  twitter: "X",
};

const noop = () => () => {};

type Props = {
  /** Absolute URL to open in the real browser. */
  target: string;
  /** Where "continue here" goes (stays in the app). */
  stayHref: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  label: string;
};

export function OpenInBrowserCard({ target, stayHref, name, username, avatarUrl, label }: Props) {
  const platform = useSyncExternalStore<MobilePlatform>(noop, () => platformFromUserAgent(navigator.userAgent), () => "other");
  const app = useSyncExternalStore(noop, () => detectInAppBrowser(navigator.userAgent), () => null);
  const [showHelp, setShowHelp] = useState(false);
  const tried = useRef(false);
  const deepLink = openInBrowserUrl(target, platform);
  const browser = platform === "ios" ? "Safari" : "your browser";

  // If the app ignores the request (older iOS, some app versions), show the manual steps.
  const watchForFailure = () => {
    if (!deepLink) return;
    window.setTimeout(() => {
      if (document.visibilityState === "visible") setShowHelp(true);
    }, 1500);
  };

  // Android usually allows opening the browser straight away; try once on arrival.
  useEffect(() => {
    if (tried.current || platform !== "android" || !deepLink) return;
    tried.current = true;
    window.location.href = deepLink;
  }, [platform, deepLink]);

  return (
    <div className="relative flex min-h-svh flex-1 items-center justify-center overflow-hidden bg-[#fbf8f2] px-5 py-10">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_45%_at_15%_10%,rgba(91,63,209,.28),transparent),radial-gradient(55%_45%_at_90%_90%,rgba(242,100,61,.25),transparent)]" />
      <div aria-hidden className="absolute -top-16 -right-10 size-56 rounded-full bg-[#5b3fd1]/15 blur-2xl" />
      <div aria-hidden className="absolute -bottom-20 -left-10 size-64 rounded-full bg-[#f2643d]/15 blur-2xl" />

      <main className="relative w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-7 text-center text-[#1c1a24] shadow-[0_24px_60px_-20px_rgba(28,26,36,.35)] backdrop-blur">
        <div className="mx-auto size-24 overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-[#ffd2a8] via-[#f2643d] to-[#5b3fd1] shadow-lg">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center text-3xl font-semibold text-white">{name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{name}</h1>
        {username ? <p className="text-sm text-[#5c5866]">@{username}</p> : null}
        {label ? <p className="mx-auto mt-3 w-fit rounded-full bg-[#ece8fb] px-3 py-1 text-xs font-medium text-[#4a33b0]">{label}</p> : null}

        <a
          href={deepLink ?? target}
          onClick={watchForFailure}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#5b3fd1] text-base font-semibold text-white shadow-[0_10px_24px_-8px_rgba(91,63,209,.7)] transition hover:bg-[#4a33b0] focus-visible:ring-4 focus-visible:ring-[#5b3fd1]/40 focus-visible:outline-none active:scale-[.98]"
        >
          <ExternalLink className="size-5" /> Open in {platform === "ios" ? "Safari" : "browser"}
        </a>

        <p className="mt-4 text-sm leading-relaxed text-[#5c5866]">
          {app ? `You're in ${APP_NAMES[app]}'s built-in browser.` : "This link works best in your browser."} Opening in {browser} keeps you signed in and makes
          payments work.
        </p>

        {showHelp ? (
          <div role="status" className="mt-4 rounded-2xl bg-[#f6f2ea] p-4 text-left text-sm">
            <p className="font-semibold">Didn&apos;t open?</p>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-[#3b3846]">
              Tap
              {platform === "android" ? <MoreVertical className="inline size-4" aria-label="the menu button" /> : <MoreHorizontal className="inline size-4" aria-label="the menu button" />}
              in the top corner, then choose <strong>&ldquo;Open in {platform === "ios" ? "external browser" : "Chrome"}&rdquo;</strong>.
            </p>
          </div>
        ) : null}

        <a href={stayHref} className="mt-5 inline-block text-sm font-medium text-[#5c5866] underline-offset-4 hover:text-[#1c1a24] hover:underline">
          Continue here instead
        </a>
      </main>
    </div>
  );
}
