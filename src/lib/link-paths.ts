import { isAppHost } from "@/lib/domain-names";

// The proxy renders a smart link's steps at its clean address (<app domain>/vip, or on a custom
// domain "/" for a Root link and "/vip" for a path) and tells the page so with these request
// headers. It strips any copies a visitor sends.
export const LINK_BASE_HEADER = "x-tendril-link-base";
export const LINK_ENTRY_HEADER = "x-tendril-link-entry";

/** The address visitors use for this link: "/<slug>" (or "/" for a custom domain's Root), else /l/<slug>. */
export function publicLinkBase(headers: Headers, slug: string, appHost: string): string {
  const base = headers.get(LINK_BASE_HEADER);
  if (base === `/${slug}`) return base;
  if (base === "/" && !isAppHost(headers.get("host"), appHost)) return base;
  return `/l/${slug}`;
}

/** True when this page is the visitor's first stop at the link's clean address (so it counts the visit). */
export function isLinkEntry(headers: Headers): boolean {
  return headers.get(LINK_ENTRY_HEADER) === "1";
}
