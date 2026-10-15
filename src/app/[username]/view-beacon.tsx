"use client";

import { useEffect } from "react";

/** Records one page view per load. The page HTML is cached, so views are counted client-side. */
export function ViewBeacon({ pageId }: { pageId: string }) {
  useEffect(() => {
    const body = JSON.stringify({ p: pageId, r: document.referrer || "" });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/v", blob)) {
      void fetch("/api/v", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    }
  }, [pageId]);

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/v?p=${encodeURIComponent(pageId)}`} alt="" width={1} height={1} style={{ position: "absolute", left: -9999 }} />
    </noscript>
  );
}
