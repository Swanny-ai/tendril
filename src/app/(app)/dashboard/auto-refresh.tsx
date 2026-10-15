"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the dashboard's server data in the background, so totals, charts, the map and
 * the country list stay current without a page reload. Pauses while the tab is hidden and
 * catches up as soon as it's visible again. Client state (open menus, live feed) is kept.
 */
export function AutoRefresh({ enabled, seconds = 15 }: { enabled: boolean; seconds?: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      last = Date.now();
      startTransition(() => router.refresh());
    };
    const id = window.setInterval(refresh, seconds * 1000);
    const onVisible = () => {
      if (Date.now() - last > seconds * 1000) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, seconds, router]);

  return null;
}
