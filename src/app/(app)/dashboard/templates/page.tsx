import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, type RenderPage } from "@/components/public-page/public-page";
import { buttonVariants } from "@/components/ui/button";
import { appHost } from "@/config/brand";
import { requirePage } from "@/lib/session";
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
  const { page } = await requirePage();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-muted-foreground">
            Each template becomes its own page with its own link, filled with sample content you can edit.
          </p>
        </div>
        {page.layout !== "classic" ? (
          <form
            action={async () => {
              "use server";
              const { applyTemplateAction } = await import("./actions");
              await applyTemplateAction("classic");
            }}
          >
            <button type="submit" className={buttonVariants({ variant: "outline" })}>
              Back to the classic layout
            </button>
          </form>
        ) : null}
      </div>

      <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-label="Link-in-bio templates">
        {PAGE_TEMPLATES.map((t) => (
          <li key={t.key} className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="relative flex h-80 items-start justify-center overflow-hidden bg-gradient-to-b from-[#1c1a24] to-[#3a3550] pt-6">
              {t.isNew ? <span className="absolute top-3 right-3 z-10 rounded-full bg-[var(--sage)] px-2.5 py-0.5 text-xs font-bold text-white">NEW</span> : null}
              {/* Live, scaled-down render of the template with sample content. */}
              <div aria-hidden className="pointer-events-none h-[640px] w-[340px] origin-top scale-[.5] overflow-hidden rounded-[32px] border-[6px] border-black/80 shadow-2xl" inert>
                <PublicPage page={samplePage(t)} preview />
              </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="text-lg font-semibold">{t.name}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
              <div className="mt-5">
                <UseTemplateButton
                  templateKey={t.key}
                  name={t.name}
                  active={page.layout === t.key}
                  appHost={appHost}
                  suggestion={`${page.username.slice(0, 18)}_${t.key.split("-")[0]}`}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted-foreground">
        Photos in the previews are sample art. Add your own cover photo and link images in the{" "}
        <Link href="/dashboard/editor" className="text-primary underline-offset-4 hover:underline">
          editor
        </Link>
        .
      </p>
    </div>
  );
}
