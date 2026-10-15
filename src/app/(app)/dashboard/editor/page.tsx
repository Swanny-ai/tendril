import type { Metadata } from "next";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requirePage } from "@/lib/session";
import { sanitizeOverrides } from "@/themes/presets";
import type { EditorBlock } from "./actions";
import { Editor } from "./editor";

export const instant = false;
export const metadata: Metadata = { title: "Editor" };

export default async function EditorPage() {
  const { userId, page } = await requirePage();
  const [plan, blocks] = await Promise.all([
    getPlan(userId),
    db.block.findMany({ where: { pageId: page.id }, orderBy: { position: "asc" } }),
  ]);

  return (
    <Editor
      publicUrl={`${appUrl}/${page.username}`}
      plan={plan}
      limits={PLAN_LIMITS[plan]}
      initial={{
        username: page.username,
        profile: {
          displayName: page.displayName,
          bio: page.bio,
          avatarUrl: page.avatarUrl,
          seoTitle: page.seoTitle ?? "",
          seoDescription: page.seoDescription ?? "",
          published: page.published,
        },
        theme: { themeKey: page.themeKey, overrides: sanitizeOverrides(page.themeOverrides), showBadge: page.showBadge, warningTemplate: page.warningTemplate, openInBrowser: page.openInBrowser },
        blocks: blocks.map(
          (b): EditorBlock => ({
            id: b.id,
            type: b.type,
            position: b.position,
            enabled: b.enabled,
            title: b.title,
            url: b.url,
            data: (b.data ?? {}) as EditorBlock["data"],
            contentWarning: b.contentWarning,
            contentWarningText: b.contentWarningText,
          }),
        ),
      }}
    />
  );
}
