import type { Metadata } from "next";
import { PublicPage, type RenderPage } from "@/components/public-page/public-page";
import { appHost, appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { pageUrl } from "@/lib/link-targets";
import { getShowcases, showcasePage } from "@/lib/showcase";
import { requireAccount } from "@/lib/session";
import { PageLinkBar } from "../page-link-bar";
import { PageCardActions } from "./page-card-actions";
import { PAGE_TEMPLATES, type PageTemplate } from "@/templates/link-in-bio";
import { THEME_PRESETS } from "@/themes/presets";
import { UseTemplateButton } from "./use-template-button";

export const instant = false;
export const metadata: Metadata = { title: "Templates" };

function samplePage(t: PageTemplate): RenderPage {
  return {
    username: t.sample.username,
    displayName: t.sample.displayName,
    bio: t.sample.bio,
    tagline: t.sample.tagline,
    avatarUrl: null,
    heroUrl: null,
    layout: t.key,
    showBadge: false,
    theme: THEME_PRESETS[0].tokens,
    blocks: t.sample.blocks.map((b, i) => ({
      id: `${t.key}-${i}`,
      type: b.type,
      title: b.title ?? "",
      url: b.url ?? null,
      data: b.data ?? {},
      contentWarning: b.contentWarning ?? false,
    })),
  };
}

export default async function TemplatesPage() {
  const { userId, page: current } = await requireAccount();
  const [pages, domains] = await Promise.all([
    db.page.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, displayName: true, layout: true, domainId: true, atRoot: true, domain: { select: { hostname: true } } },
    }),
    db.domain.findMany({ where: { userId, verifiedAt: { not: null } }, select: { id: true, hostname: true }, orderBy: { createdAt: "asc" } }),
  ]);
  // Suggested name for a new page: the current page's, else the start of the account's email.
  const email = current ? "" : ((await db.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email ?? "");
  const nameBase = current?.username ?? (email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "") || "mypage");
  const layoutName = (key: string) => PAGE_TEMPLATES.find((t) => t.key === key)?.name ?? "Classic";
  // Template previews are the same for everyone: the frozen showcase for the template (set by the
  // site owner with scripts/showcase-page.mjs), else the built-in sample.
  const showcases = await getShowcases();

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <section className="space-y-4" aria-labelledby="your-pages">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-muted-foreground">Your bio pages. Each one has its own link; open one to edit it.</p>
        </div>
        <h2 id="your-pages" className="sr-only">
          Your pages
        </h2>
        <ul className="grid gap-4 md:grid-cols-2" aria-label="Your pages">
          {pages.map((p) => {
            const url = pageUrl(p, p.domain, appUrl);
            return (
              <li key={p.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.displayName || `/${p.username}`}</p>
                    <p className="text-sm text-muted-foreground">
                      {layoutName(p.layout)} template{p.id === current?.id ? " · last edited" : ""}
                    </p>
                  </div>
                  {p.domain ? (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{p.atRoot ? "Root" : "Path"}</span>
                  ) : null}
                </div>
                <PageLinkBar url={url} />
                <PageCardActions page={p} appHost={appHost} domains={domains} canDelete />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="new-page">
        <div>
          <h2 id="new-page" className="text-xl font-semibold">
            Create a page from a template
          </h2>
          <p className="text-muted-foreground">Pick a template, then choose its domain and whether it opens at the root or at a path.</p>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-label="Link-in-bio templates">
          {PAGE_TEMPLATES.map((t) => (
            <li key={t.key} className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="relative flex h-80 items-start justify-center overflow-hidden bg-gradient-to-b from-[#151515] to-[#151b12] pt-6">
                {t.isNew ? <span className="absolute top-3 right-3 z-10 rounded-full bg-[var(--sage)] px-2.5 py-0.5 text-xs font-bold text-white">NEW</span> : null}
                {/* Live, scaled-down render of the template with sample content. */}
                <div aria-hidden className="pointer-events-none h-[640px] w-[340px] origin-top scale-[.5] overflow-hidden rounded-[32px] border-[6px] border-black/80 shadow-2xl" inert>
                  <PublicPage page={showcases.has(t.key) ? showcasePage(t.key, showcases.get(t.key)!) : samplePage(t)} preview />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
                <div className="mt-5">
                  <UseTemplateButton
                    templateKey={t.key}
                    name={t.name}
                    appHost={appHost}
                    domains={domains}
                    suggestion={`${nameBase.slice(0, 18)}_${t.key.split("-")[0]}`}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">Photos in the previews are sample art. Add your own cover photo and link images in the editor.</p>
      </section>
    </div>
  );
}
