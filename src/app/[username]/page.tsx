import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPage } from "@/components/public-page/public-page";
import { appUrl, brand } from "@/config/brand";
import { getPublicPage } from "@/lib/pages";
import { BioLinkEscape } from "./bio-link-escape";
import { InAppHint } from "./in-app-hint";
import { ViewBeacon } from "./view-beacon";
import { WarningPopup, type PopupCopy, type PopupStyle } from "./warning-popup";
import { templateCopy } from "@/warning-templates/copy";
import { getWarningTemplate } from "@/warning-templates/templates";

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
  const description = page.seoDescription || page.bio || undefined;
  const url = `${appUrl}/${page.username}`;
  return {
    // The tab shows only the brand; link previews (Open Graph) keep the page's own title.
    title: { absolute: brand.name },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "profile" },
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

  // 18+ links open a popup over the page: styled like the creator's chosen warning design, or
  // like the page itself. The page is cached for everyone, so the wording is English.
  const owner = `A link from ${page.displayName || `@${page.username}`}`;
  let popupCopy: PopupCopy;
  let popupStyle: PopupStyle;
  if (page.warningTemplate) {
    const t = getWarningTemplate(page.warningTemplate);
    const c = templateCopy(t, "en");
    popupCopy = { title: c.title, message: c.message, button: c.button, cancel: "Cancel", owner };
    popupStyle = { card: t.surface, border: t.cardBorder, text: t.text, muted: t.muted, buttonBg: t.buttonBg, buttonText: t.buttonText, radius: Math.min(t.radius, 24) };
  } else {
    const t = page.theme;
    popupCopy = { title: "Adult content warning", message: "This content is intended for adults only (18+). Do you want to continue?", button: "I'm 18+, continue", cancel: "Cancel", owner };
    popupStyle = { card: t.background, border: `${t.muted}55`, text: t.text, muted: t.muted, buttonBg: t.buttonBg, buttonText: t.buttonText, radius: 20 };
  }

  return (
    <main className="flex min-h-svh flex-1 flex-col" style={page.layout === "classic" ? { background: page.theme.background } : undefined}>
      <InAppHint />
      <PublicPage page={page} />
      <ViewBeacon pageId={page.id} />
      {page.openInBrowser ? <BioLinkEscape /> : null}
      <WarningPopup copy={popupCopy} style={popupStyle} openInBrowser={page.openInBrowser} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </main>
  );
}
