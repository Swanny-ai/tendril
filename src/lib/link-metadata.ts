import type { Metadata } from "next";
import { headers } from "next/headers";
import { brand } from "@/config/brand";

// Metadata for pages a visitor reaches through a creator's link (deep links, 18+ pages).
// The browser tab shows only the brand, but link previews (WhatsApp, iMessage, X…) show the
// creator's own words or their domain, never ViewLink's tagline.

/** `name`: shown in previews when given (a bio page's name); otherwise the domain the link is on. */
export async function creatorLinkMetadata(name: string | null | undefined): Promise<Metadata> {
  const host = ((await headers()).get("host") ?? "").replace(/:\d+$/, "");
  const title = name?.trim() || host || brand.name;
  return {
    title: { absolute: brand.name },
    description: null,
    openGraph: { title, description: undefined, siteName: undefined, url: undefined },
    twitter: { card: "summary", title },
    robots: { index: false, follow: false },
  };
}
