import Link from "next/link";
import { appUrl } from "@/config/brand";
import { pageUrl } from "@/lib/link-targets";
import { PageLinkBar } from "../page-link-bar";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import type { Page } from "@/generated/prisma/client";
import { sanitizeOverrides } from "@/themes/presets";
import type { EditorBlock } from "./actions";
import { DeletePage } from "./delete-page";
import { Editor } from "./editor";

/** The page editor for one of the creator's pages (opened at /edit/template/<its link>). */
export async function EditorScreen({ userId, page }: { userId: string; page: Page }) {
  const domain = page.domainId ? await db.domain.findUnique({ where: { id: page.domainId }, select: { hostname: true } }) : null;
  const url = pageUrl(page, domain, appUrl);
  const [plan, blocks, pageCount] = await Promise.all([
    getPlan(userId),
    db.block.findMany({
      where: { pageId: page.id },
      orderBy: { position: "asc" },
    }),
    db.page.count({ where: { userId } }),
  ]);

  return (
    <>
      <div className="mx-auto mb-5 flex max-w-6xl flex-wrap items-center gap-3">
        <Link href="/dashboard/templates" className="text-sm text-muted-foreground hover:text-foreground">
          ← Templates
        </Link>
        <div className="min-w-0">
          <PageLinkBar url={url} />
        </div>
      </div>
      <Editor
        key={
          page.id /* remount when switching pages so the editor loads that page */
        }
        publicUrl={url}
        plan={plan}
        limits={PLAN_LIMITS[plan]}
        initial={{
          username: page.username,
          profile: {
            displayName: page.displayName,
            bio: page.bio,
            avatarUrl: page.avatarUrl,
            heroUrl: page.heroUrl,
            tagline: page.tagline,
            handle: page.handle ?? "",
            showHandle: page.showHandle,
          verified: !!page.verifiedAt,
          showVerified: page.showVerified,
            seoTitle: page.seoTitle ?? "",
            seoDescription: page.seoDescription ?? "",
            published: page.published,
          },
          theme: {
            themeKey: page.themeKey,
            overrides: sanitizeOverrides(page.themeOverrides),
            showBadge: page.showBadge,
            warningTemplate: page.warningTemplate,
            openInBrowser: page.openInBrowser,
            layout: page.layout,
          },
          blocks: blocks.map((b): EditorBlock => ({
            id: b.id,
            type: b.type,
            position: b.position,
            enabled: b.enabled,
            title: b.title,
            url: b.url,
            data: (b.data ?? {}) as EditorBlock["data"],
            contentWarning: b.contentWarning,
            contentWarningText: b.contentWarningText,
          })),
        }}
      />
      {pageCount > 1 ? (
        <DeletePage
          key={`delete-${page.id}`}
          pageId={page.id}
          username={page.username}
        />
      ) : null}
    </>
  );
}
