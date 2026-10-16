import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after, connection } from "next/server";
import { OpenInBrowserCard } from "@/components/open-in-browser-card";
import { appHost, appUrl } from "@/config/brand";
import { isAppHost } from "@/lib/domain-names";
import { isLinkEntry, publicLinkBase } from "@/lib/link-paths";
import { getSmartLink, recordSmartLinkEvent } from "@/lib/smart-links";

export const instant = false;
export const metadata: Metadata = { title: "Open in your browser", robots: { index: false, follow: false } };

// Step 2 of the deep link flow: visitors inside a social app's browser land here from
// /l/<slug> and tap through to their phone's default browser.
export default async function OpenInBrowserPage(props: PageProps<"/l/[slug]/open">) {
  await connection();
  const { slug } = await props.params;
  const link = await getSmartLink(slug);
  if (!link || !link.openInBrowser) notFound();
  const h = new Headers(await headers());
  const host = h.get("host");
  const origin = isAppHost(host, appHost) ? appUrl : `https://${host}`;
  const base = publicLinkBase(h, slug, appHost);
  // On a custom domain this page can be the first thing a visitor sees: count the visit.
  if (isLinkEntry(h, appHost)) after(() => recordSmartLinkEvent(h, link.id, "hit").catch(() => {}));

  return (
    <OpenInBrowserCard
      target={`${origin}${base}?ib=1`}
      stayHref={`${base}?ib=1`}
      name={link.owner?.name ?? link.label ?? slug}
      username={link.owner?.username ?? null}
      avatarUrl={link.owner?.avatarUrl ?? null}
      label={link.label}
    />
  );
}
