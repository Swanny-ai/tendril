"use client";

import { useEffect, useRef, useState } from "react";
import { useBrowserEscape } from "@/components/browser-escape";
import { openInBrowserUrl, platformFromUserAgent } from "@/lib/deeplink";
import { detectInAppBrowser } from "@/lib/in-app";

export type PopupStyle = { card: string; border: string; text: string; muted: string; buttonBg: string; buttonText: string; radius: number };
export type PopupCopy = { title: string; message: string; button: string; cancel: string; owner: string };

/**
 * 18+ links on a bio page open this popup over the page (the address stays the page's own),
 * instead of a separate warning page. Confirming goes on to the destination, and inside
 * Instagram/TikTok/... it opens the phone's default browser. /go/<id>/warning stays as the
 * fallback for direct visits and visitors without JavaScript.
 */
export function WarningPopup({ copy, style, openInBrowser }: { copy: PopupCopy; style: PopupStyle; openInBrowser: boolean }) {
  const [open, setOpen] = useState<{ href: string; message: string; continueHref: string } | null>(null);
  const confirmRef = useRef<HTMLAnchorElement>(null);
  const escape = useBrowserEscape();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.('a[href^="/go/"][data-warning]') as HTMLAnchorElement | null;
      if (!a) return;
      e.preventDefault();
      const href = a.getAttribute("href") ?? "";
      const confirmed = `${href}?ok=1`;
      // Inside a social app, confirming opens the default browser (Safari on iPhone).
      const ua = navigator.userAgent;
      const platform = platformFromUserAgent(ua);
      const deepLink = openInBrowser && detectInAppBrowser(ua) && platform !== "other" ? openInBrowserUrl(new URL(confirmed, location.origin).toString(), platform, ua) : null;
      setOpen({ href, message: a.dataset.warningText || copy.message, continueHref: deepLink ?? confirmed });
      // Count the warning view, like the warning page does.
      navigator.sendBeacon?.(`${href}/seen`);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [copy.message, openInBrowser]);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return escape.sheet;
  const opensApp = !open.continueHref.startsWith("/");
  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="warning-popup-title"
        className="w-full max-w-sm p-6 text-center shadow-2xl"
        style={{ background: style.card, color: style.text, border: `1px solid ${style.border}`, borderRadius: style.radius }}
      >
        <p className="text-xs font-medium" style={{ color: style.muted }}>
          {copy.owner}
        </p>
        <h2 id="warning-popup-title" className="mt-2 flex items-center justify-center gap-2 text-lg font-bold">
          <span className="rounded-md border px-1.5 text-xs leading-5 font-extrabold" style={{ borderColor: style.text }}>
            18+
          </span>
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: style.muted }}>
          {open.message}
        </p>
        <div className="mt-5 grid grid-cols-[auto_1fr] gap-2.5">
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
            style={{ borderColor: style.border, color: style.text }}
          >
            {copy.cancel}
          </button>
          <a
            ref={confirmRef}
            href={open.continueHref}
            rel="nofollow"
            onClick={(e) => {
              const stay = `${open.href}?ok=1`;
              const target = new URL(stay, location.origin).toString();
              if (opensApp) {
                escape.watch(target, stay);
              } else if (openInBrowser && escape.holdOnly()) {
                // Facebook / Messenger / TikTok on iPhone: press and hold instead.
                e.preventDefault();
                setOpen(null);
                escape.hold(target, stay);
              }
            }}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ background: style.buttonBg, color: style.buttonText }}
          >
            {copy.button}
          </a>
        </div>
      </div>
    </div>
    {escape.sheet}
    </>
  );
}
