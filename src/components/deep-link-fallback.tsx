"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, MoreVertical, X } from "lucide-react";

/**
 * Safety net for deep links. When the visitor taps a link that should open their default
 * browser (intent:// on Android, x-safari-https:// on iPhone) but the social app ignores it,
 * the page is still on screen a moment later: show the manual steps and a way to continue here.
 */
export function DeepLinkFallback({ stayHref }: { stayHref: string }) {
  const [show, setShow] = useState<null | { android: boolean }>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a[href^="intent:"], a[href^="x-safari-"]') as HTMLAnchorElement | null;
      if (!a) return;
      const android = a.getAttribute("href")!.startsWith("intent:");
      window.setTimeout(() => {
        if (document.visibilityState === "visible") setShow({ android });
      }, 1500);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!show) return null;
  return <DeepLinkHelp href={stayHref} android={show.android} onClose={() => setShow(null)} />;
}

export function DeepLinkHelp({ href, android, onClose }: { href: string; android: boolean; onClose: () => void }) {
  return (
    <div role="dialog" aria-label="Open in your browser" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-sm rounded-2xl bg-[#1c1a24] p-4 text-sm text-white shadow-2xl">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute top-2 right-2 rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white">
        <X className="size-4" />
      </button>
      <p className="pr-6 font-semibold">Didn&apos;t open in {android ? "your browser" : "Safari"}?</p>
      <p className="mt-1 flex flex-wrap items-center gap-1 text-white/80">
        Tap {android ? <MoreVertical className="inline size-4" aria-label="the menu button" /> : <MoreHorizontal className="inline size-4" aria-label="the menu button" />} in the top corner,
        then &ldquo;Open in {android ? "Chrome" : "external browser"}&rdquo;.
      </p>
      <a href={href} rel="nofollow" className="mt-3 block rounded-xl bg-white/10 py-2 text-center font-medium hover:bg-white/15">
        Continue here instead
      </a>
    </div>
  );
}
