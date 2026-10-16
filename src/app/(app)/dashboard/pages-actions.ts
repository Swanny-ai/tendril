"use server";

import { Prisma } from "@/generated/prisma/client";
import { getCurrentPage, rememberCurrentPage } from "@/lib/current-page";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkLinkTarget } from "@/lib/link-targets";
import { expireUsername, invalidatePageFromAction } from "@/lib/pages";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireUserId } from "@/lib/session";
import { STARTER_BLOCKS } from "@/lib/starter-blocks";
import { usernameSchema } from "@/lib/validation";
import { getPageTemplate, isLayoutKey } from "@/templates/link-in-bio";

export type PageActionResult = { ok: true; username?: string } | { ok: false; error: string; field?: "username" | "domain" };

/** Open one of the account's pages in the editor. */
export async function editPageAction(pageId: string) {
  const userId = await requireUserId();
  const page = await db.page.findFirst({ where: { id: pageId, userId }, select: { id: true } });
  if (page) await rememberCurrentPage(page.id);
  redirect("/dashboard/editor");
}

/** Change where a page lives: the Tendril domain or a custom domain, at a path or the root. */
export async function updatePageLinkAction(pageId: string, input: { domainId: string | null; atRoot: boolean }): Promise<PageActionResult> {
  const userId = await requireUserId();
  const page = await db.page.findFirst({ where: { id: pageId, userId }, select: { id: true, username: true } });
  if (!page) return { ok: false, error: "That page no longer exists." };
  const target = await checkLinkTarget(userId, input, page.username, { pageId: page.id });
  if (!target.ok) return { ok: false, field: "domain", error: target.error };
  await db.page.update({ where: { id: page.id }, data: target.target });
  await invalidatePageFromAction(page.id);
  return { ok: true, username: page.username };
}

/** Switch which page the dashboard edits. */
export async function switchPageAction(pageId: string): Promise<PageActionResult> {
  const userId = await requireUserId();
  const page = await db.page.findFirst({ where: { id: pageId, userId }, select: { id: true } });
  if (!page) return { ok: false, error: "That page no longer exists." };
  await rememberCurrentPage(page.id);
  return { ok: true };
}

/**
 * Create another bio page with its own link (tendril.link/<username>), optionally from a
 * template: the page gets the template's layout and sample content to edit.
 */
export async function createPageAction(input: { username: string; template?: string; domainId?: string | null; atRoot?: boolean }): Promise<PageActionResult> {
  const userId = await requireUserId();
  const parsed = usernameSchema.safeParse(input.username);
  if (!parsed.success) return { ok: false, field: "username", error: parsed.error.issues[0].message };
  const username = parsed.data;

  const plan = await getPlan(userId);
  const count = await db.page.count({ where: { userId } });
  if (count >= PLAN_LIMITS[plan].maxPages) {
    return { ok: false, error: plan === "FREE" ? `Free accounts can have ${PLAN_LIMITS.FREE.maxPages} pages. Upgrade to Pro for more.` : "You've reached the page limit." };
  }
  if (await db.page.findUnique({ where: { username }, select: { id: true } })) return { ok: false, field: "username", error: "That link is taken. Try another one." };
  const target = await checkLinkTarget(userId, { domainId: input.domainId, atRoot: input.atRoot }, username);
  if (!target.ok) return { ok: false, field: "domain", error: target.error };

  const template = input.template && isLayoutKey(input.template) && input.template !== "classic" ? getPageTemplate(input.template) : null;
  const current = await getCurrentPage(userId);
  const blocks = template
    ? template.sample.blocks.slice(0, PLAN_LIMITS[plan].maxBlocks).map((b, position) => ({
        type: b.type,
        position,
        title: b.title ?? "",
        url: b.url ?? null,
        data: (b.data ?? {}) as Prisma.InputJsonValue,
        contentWarning: b.contentWarning ?? false,
      }))
    : STARTER_BLOCKS.map((b, position) => ({ type: b.type, position, title: b.title, url: b.url }));

  try {
    const page = await db.page.create({
      data: {
        userId,
        username,
        // Start from the creator's existing identity so the new page already looks like them.
        displayName: current?.displayName ?? "",
        avatarUrl: current?.avatarUrl ?? null,
        layout: template?.key ?? "classic",
        tagline: "",
        ...target.target,
        blocks: { create: blocks },
      },
    });
    await rememberCurrentPage(page.id);
    expireUsername(username);
    return { ok: true, username };
  } catch {
    return { ok: false, field: "username", error: "That link was just taken. Try another one." };
  }
}

/** Delete one of the account's pages (never the last one). */
export async function deletePageAction(pageId: string): Promise<PageActionResult> {
  const userId = await requireUserId();
  const pages = await db.page.findMany({ where: { userId }, select: { id: true, username: true }, orderBy: { createdAt: "asc" } });
  const page = pages.find((p) => p.id === pageId);
  if (!page) return { ok: false, error: "That page no longer exists." };
  if (pages.length <= 1) return { ok: false, error: "You need at least one page." };
  await invalidatePageFromAction(page.id);
  await db.$transaction([
    db.pageView.deleteMany({ where: { pageId: page.id } }),
    db.warningView.deleteMany({ where: { pageId: page.id } }),
    db.dailyStat.deleteMany({ where: { pageId: page.id } }),
    db.media.deleteMany({ where: { pageId: page.id } }),
    db.page.delete({ where: { id: page.id } }),
  ]);
  expireUsername(page.username);
  await rememberCurrentPage(pages.find((p) => p.id !== page.id)!.id);
  return { ok: true };
}
