import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPage } from "@/components/public-page/public-page";
import { appUrl, brand } from "@/config/brand";
import { getPublicPage } from "@/lib/pages";
import { InAppHint } from "./in-app-hint";
import { ViewBeacon } from "./view-beacon";

// Await params outside Suspense on purpose: the first visit to a username waits for
// the full page (blocking ISR), so unknown names get a real 404 and crawlers get
// complete HTML. Data is cached with "use cache" and refreshed on every save.
export const instant = false;
// Unlisted usernames: wait for the complete page instead of streaming a shell first,
// so unknown names return a real 404 status.
export const ensureStatic = "navigation";

export async function generateStaticParams() {
  // Pages are generated on first visit and cached (ISR), then refreshed on every save.
  return [{ username: "demo" }];
}

export async function generateMetadata(props: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await props.params;
  const page = await getPublicPage(username.toLowerCase());
  if (!page) return { title: "Page not found", robots: { index: false } };
  const title = page.seoTitle || page.displayName || `@${page.username}`;
  const description = page.seoDescription || page.bio || `${title} on ${brand.name}`;
  const url = `${appUrl}/${page.username}`;
  return {
    title: { absolute: `${title} | ${brand.name}` },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "profile", siteName: brand.name },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicProfilePage(props: PageProps<"/[username]">) {
  const { username } = await props.params;
  const page = await getPublicPage(username.toLowerCase());
  if (!page) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: page.displayName || page.username,
      alternateName: `@${page.username}`,
      description: page.bio || undefined,
      image: page.avatarUrl ? new URL(page.avatarUrl, appUrl).toString() : undefined,
      url: `${appUrl}/${page.username}`,
    },
  };

  return (
    <main className="flex min-h-svh flex-1 flex-col" style={{ background: page.theme.background }}>
      <InAppHint />
      <PublicPage page={page} />
      <ViewBeacon pageId={page.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </main>
  );
}
