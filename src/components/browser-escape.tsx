"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MoreHorizontal, MoreVertical, X } from "lucide-react";
import { DEEP_LINK_SELECTOR, platformFromUserAgent, pressAndHoldOnly } from "@/lib/deeplink";
import { watchHandoff } from "@/lib/handoff-watch";

type Sheet = { mode: "hold" | "failed"; target: string; stay: string; android: boolean };

/**
 * Getting a visitor from a social app's built-in browser into their real one:
 *  - watch(): after a tap on an "open in browser" link, if the visitor is still here the app
 *    ignored it, so offer the manual ways (menu steps, press-and-hold) and "continue here";
 *  - hold(): for apps with no such link (Facebook, Messenger, TikTok on iPhone), show a
 *    press-and-hold button straight away: iOS's long-press menu has "Open in browser".
 */
export function useBrowserEscape() {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const android = () => platformFromUserAgent(navigator.userAgent) === "android";
  return {
    holdOnly: () => pressAndHoldOnly(navigator.userAgent),
    watch: (target: string, stay: string) => watchHandoff(() => setSheet({ mode: "failed", target, stay, android: android() })),
    hold: (target: string, stay: string) => setSheet({ mode: "hold", target, stay, android: false }),
    sheet: sheet ? <EscapeSheet {...sheet} onClose={() => setSheet(null)} /> : null,
  };
}

/** A link the visitor presses and holds; tapping it does nothing (it would stay in the app). */
export function PressAndHoldLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      rel="nofollow"
      onClick={(e) => e.preventDefault()}
      className={className}
      style={{ WebkitTouchCallout: "default", WebkitUserSelect: "none", userSelect: "none", touchAction: "manipulation" }}
      data-press-and-hold=""
    >
      {children}
    </a>
  );
}

function EscapeSheet({ mode, target, stay, android, onClose }: Sheet & { onClose: () => void }) {
  return (
    <div role="dialog" aria-label="Open in your browser" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-sm rounded-2xl bg-[#1c1a24] p-4 text-sm text-white shadow-2xl">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute top-2 right-2 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white">
        <X className="size-4" />
      </button>
      {mode === "hold" ? (
        <p className="pr-6 font-semibold">Open it in your browser</p>
      ) : (
        <>
          <p className="pr-6 font-semibold">Didn&apos;t open in {android ? "your browser" : "Safari"}?</p>
          <p className="mt-1 flex flex-wrap items-center gap-1 text-white/80">
            Tap {android ? <MoreVertical className="inline size-4" aria-label="the menu button" /> : <MoreHorizontal className="inline size-4" aria-label="the menu button" />} in the
            top corner, then &ldquo;Open in {android ? "Chrome" : "external browser"}&rdquo;.
          </p>
        </>
      )}
      {!android ? (
        <>
          <PressAndHoldLink href={target} className="mt-3 block rounded-xl bg-white py-3 text-center font-semibold text-[#1c1a24]">
            Press and hold here
          </PressAndHoldLink>
          <p className="mt-2 text-center text-xs text-white/70">Keep your finger on the button, then choose &ldquo;Open in browser&rdquo;.</p>
        </>
      ) : null}
      <a href={stay} rel="nofollow" className="mt-3 block rounded-xl bg-white/10 py-2 text-center font-medium hover:bg-white/15">
        Continue here instead
      </a>
    </div>
  );
}

/**
 * For server-rendered warning pages: watches the "open in browser" link the page rendered, and
 * on press-and-hold-only apps turns a tap on the continue link (continueHref) into the hold sheet.
 */
export function BrowserEscape({ target, stayHref, continueHref }: { target: string; stayHref: string; continueHref: string }) {
  const escape = useBrowserEscape();
  const { watch, hold, holdOnly } = escape;
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.matches(DEEP_LINK_SELECTOR)) {
        watch(target, stayHref);
      } else if (holdOnly() && a.getAttribute("href") === continueHref) {
        e.preventDefault();
        hold(target, stayHref);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [watch, hold, holdOnly, target, stayHref, continueHref]);
  return escape.sheet;
}
