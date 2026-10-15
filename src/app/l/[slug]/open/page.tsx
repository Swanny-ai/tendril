import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { OpenInBrowserCard } from "@/components/open-in-browser-card";
import { appUrl } from "@/config/brand";
import { getSmartLink } from "@/lib/smart-links";

export const instant = false;
export const metadata: Metadata = { title: "Open in your browser", robots: { index: false, follow: false } };

// Step 2 of the deep link flow: visitors inside a social app's browser land here from
// /l/<slug> and tap through to their phone's default browser.
export default async function OpenInBrowserPage(props: PageProps<"/l/[slug]/open">) {
  await connection();
  const { slug } = await props.params;
  const link = await getSmartLink(slug);
  if (!link || !link.openInBrowser) notFound();

  return (
    <OpenInBrowserCard
      target={`${appUrl}/l/${slug}?ib=1`}
      stayHref={`/l/${slug}?ib=1`}
      name={link.owner?.name ?? link.label ?? slug}
      username={link.owner?.username ?? null}
      avatarUrl={link.owner?.avatarUrl ?? null}
      label={link.label}
    />
  );
}
