"use server";

import { Prisma } from "@/generated/prisma/client";
import { getCurrentPage } from "@/lib/current-page";
import { db } from "@/lib/db";
import { invalidatePageFromAction } from "@/lib/pages";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { isStarterPage } from "@/lib/starter-blocks";
import { requireUserId } from "@/lib/session";
import { getPageTemplate, isLayoutKey } from "@/templates/link-in-bio";

export type ApplyResult = { ok: true; addedSamples: boolean } | { ok: false; error: string };

/**
 * Switches the page to a template layout. If the page is still fresh (no blocks, or only the
 * untouched starter blocks), the template's sample blocks are added so it looks complete
 * straight away (easy to edit or delete). Pages with real content keep it.
 */
export async function applyTemplateAction(key: string): Promise<ApplyResult> {
  const userId = await requireUserId();
  if (!isLayoutKey(key)) return { ok: false, error: "Unknown template." };
  const current = await getCurrentPage(userId);
  const page = current && (await db.page.findUnique({
    where: { id: current.id },
    select: { id: true, blocks: { orderBy: { position: "asc" }, select: { type: true, title: true, url: true } } },
  }));
  if (!page) return { ok: false, error: "Create a page first." };

  const template = key === "classic" ? null : getPageTemplate(key);
  let addedSamples = false;
  await db.$transaction(async (tx) => {
    await tx.page.update({ where: { id: page.id }, data: { layout: key } });
    // Fresh pages (nothing yet, or only the untouched starter blocks) get the template's sample content.
    if (template && isStarterPage(page.blocks)) {
      await tx.block.deleteMany({ where: { pageId: page.id } });
      const max = PLAN_LIMITS[await getPlan(userId)].maxBlocks;
      const blocks = template.sample.blocks.slice(0, max);
      await tx.block.createMany({
        data: blocks.map((b, i) => ({
          pageId: page.id,
          type: b.type,
          position: i,
          title: b.title ?? "",
          url: b.url ?? null,
          data: (b.data ?? {}) as Prisma.InputJsonValue,
          contentWarning: b.contentWarning ?? false,
        })),
      });
      addedSamples = blocks.length > 0;
    }
  });
  await invalidatePageFromAction(page.id);
  return { ok: true, addedSamples };
}
