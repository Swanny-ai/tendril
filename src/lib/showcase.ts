import "server-only";
import type { RenderPage } from "@/components/public-page/public-page";
import { db } from "@/lib/db";
import type { BlockData, BlockKind } from "@/lib/blocks";
import { resolveTheme } from "@/themes/presets";

// Frozen template previews (see the TemplateShowcase model and scripts/showcase-page.mjs).

export type ShowcaseBlock = { type: BlockKind; title: string; url: string | null; data: BlockData; contentWarning: boolean };
export type ShowcaseData = {
  displayName: string;
  bio: string;
  tagline: string;
  avatarUrl: string | null;
  heroUrl: string | null;
  themeKey: string;
  themeOverrides: unknown;
  warningTemplate: string | null;
  verified: boolean;
  blocks: ShowcaseBlock[];
};

export async function getShowcases(): Promise<Map<string, ShowcaseData>> {
  const rows = await db.templateShowcase.findMany();
  return new Map(rows.map((r) => [r.layout, r.data as unknown as ShowcaseData]));
}

export async function getShowcase(layout: string): Promise<ShowcaseData | null> {
  const row = await db.templateShowcase.findUnique({ where: { layout } });
  return row ? (row.data as unknown as ShowcaseData) : null;
}

/** The preview render of a showcase (no @username shown). */
export function showcasePage(layout: string, d: ShowcaseData): RenderPage {
  return {
    username: "preview",
    displayName: d.displayName,
    bio: d.bio,
    tagline: d.tagline,
    avatarUrl: d.avatarUrl,
    heroUrl: d.heroUrl,
    layout,
    showBadge: false,
    verified: d.verified,
    handle: null,
    theme: resolveTheme(d.themeKey, d.themeOverrides, true),
    blocks: d.blocks.map((b, i) => ({ id: `${layout}-${i}`, type: b.type, title: b.title, url: b.url, data: b.data ?? {}, contentWarning: b.contentWarning })),
  };
}
