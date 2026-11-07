"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { CreatedLink } from "./link-created-dialog";

// Lives in the dashboard layout, not the form: creating a link can use up the plan's last slot,
// and the "new link" page then replaces the form with the plan notice, which would close a popup
// inside it. The popup's code (QR, icons) only loads when a link has been created.
const LinkCreatedDialog = dynamic(() => import("./link-created-dialog").then((m) => m.LinkCreatedDialog), { ssr: false });

let current: CreatedLink | null = null;
const listeners = new Set<() => void>();

function set(link: CreatedLink | null) {
  current = link;
  for (const listener of listeners) listener();
}

/** Opens the "your link is ready" popup. */
export const showLinkCreated = (link: CreatedLink) => set(link);

export function LinkCreatedHost() {
  const link = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
  return link ? <LinkCreatedDialog link={link} onClose={() => set(null)} /> : null;
}
