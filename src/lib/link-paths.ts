import { isAppHost } from "@/lib/domain-names";

// On custom domains the proxy renders a smart link's steps at its clean address ("/" for a Root
// link, "/vip" for a path) and tells the page so with these request headers. It strips any
// copies a visitor sends, and pages only trust them on custom domains.
export const LINK_BASE_HEADER = "x-tendril-link-base";
export const LINK_ENTRY_HEADER = "x-tendril-link-entry";

/** The address visitors use for this link: "/" or "/<slug>" on a custom domain, else /l/<slug>. */
export function publicLinkBase(headers: Headers, slug: string, appHost: string): string {
  if (!isAppHost(headers.get("host"), appHost)) {
    const base = headers.get(LINK_BASE_HEADER);
    if (base === "/" || base === `/${slug}`) return base;
  }
  return `/l/${slug}`;
}

/** True when this page is the visitor's first stop on a custom domain (so it counts the visit). */
export function isLinkEntry(headers: Headers, appHost: string): boolean {
  return !isAppHost(headers.get("host"), appHost) && headers.get(LINK_ENTRY_HEADER) === "1";
}
