"use server";

import { Prisma } from "@/generated/prisma/client";
import { getCurrentPage, rememberCurrentPage } from "@/lib/current-page";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { editPagePath } from "@/lib/edit-paths";
import { checkLinkTarget } from "@/lib/link-targets";
import { expireUsername, invalidatePageFromAction } from "@/lib/pages";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireUserId } from "@/lib/session";
import { STARTER_BLOCKS } from "@/lib/starter-blocks";
import { usernameSchema } from "@/lib/validation";
import { copyUsername } from "@/lib/copy-names";
import { getShowcase } from "@/lib/showcase";
import { getPageTemplate, isLayoutKey } from "@/templates/link-in-bio";
import { THEME_PRESETS } from "@/themes/presets";

export type PageActionResult = { ok: true; username?: string; editPath?: string } | { ok: false; error: string; field?: "username" | "domain" };

/** Open one of the account's pages in the editor. */
export async function editPageAction(pageId: string) {
  const userId = await requireUserId();
  const page = await db.page.findFirst({ where: { id: pageId, userId }, select: { id: true, username: true, atRoot: true, domain: { select: { hostname: true } } } });
  if (!page) redirect("/dashboard/templates");
  await rememberCurrentPage(page.id);
  redirect(editPagePath(page, page.domain));
}

/** Change where a page lives: the ViewLink domain or a custom domain, at a path or the root. */
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
 * Create another bio page with its own link (viewlink.me/<username>), optionally from a
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
    return { ok: false, error: plan === "FREE" ? `Free accounts can have ${PLAN_LIMITS.FREE.maxPages} page${PLAN_LIMITS.FREE.maxPages === 1 ? "" : "s"}. Upgrade to Pro for more.` : "You've reached the page limit." };
  }
  if ((await db.page.findUnique({ where: { username }, select: { id: true } })) || (await db.smartLink.findUnique({ where: { slug: username }, select: { id: true } }))) {
    return { ok: false, field: "username", error: "That link is taken. Try another one." };
  }
  const target = await checkLinkTarget(userId, { domainId: input.domainId, atRoot: input.atRoot }, username);
  if (!target.ok) return { ok: false, field: "domain", error: target.error };

  const template = input.template && isLayoutKey(input.template) && input.template !== "classic" ? getPageTemplate(input.template) : null;
  const current = await getCurrentPage(userId);
  // A showcased template (its gallery preview) starts as a copy of that preview: same photos,
  // banner, blocks and theme, ready to replace. It keeps the creator's own name, and anything
  // their plan doesn't include is left off.
  const limits = PLAN_LIMITS[plan];
  const showcase = template ? await getShowcase(template.key) : null;
  const allowedTheme = (key: string) => (limits.customTheme || !THEME_PRESETS.find((t) => t.key === key)?.pro ? key : THEME_PRESETS[0].key);
  const blocks = showcase
    ? showcase.blocks.slice(0, limits.maxBlocks).map((b, position) => ({
        type: b.type,
        position,
        title: b.title ?? "",
        url: b.url ?? null,
        data: (b.data ?? {}) as Prisma.InputJsonValue,
        contentWarning: b.contentWarning ?? false,
      }))
    : template
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
        avatarUrl: showcase ? showcase.avatarUrl : (current?.avatarUrl ?? null),
        layout: template?.key ?? "classic",
        tagline: "",
        ...(showcase
          ? {
              bio: showcase.bio,
              tagline: showcase.tagline,
              heroUrl: showcase.heroUrl,
              themeKey: allowedTheme(showcase.themeKey),
              themeOverrides: limits.customTheme && showcase.themeOverrides ? (showcase.themeOverrides as Prisma.InputJsonValue) : Prisma.DbNull,
              warningTemplate: showcase.warningTemplate,
            }
          : {}),
        ...target.target,
        blocks: { create: blocks },
      },
    });
    await rememberCurrentPage(page.id);
    expireUsername(username);
    const domain = target.target.domainId ? await db.domain.findUnique({ where: { id: target.target.domainId }, select: { hostname: true } }) : null;
    return { ok: true, username, editPath: editPagePath(page, domain) };
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

/** A copy of a bio page (design, profile and blocks) at a new name, "<username>_copy". */
export async function duplicatePageAction(pageId: string): Promise<PageActionResult> {
  const userId = await requireUserId();
  const page = await db.page.findFirst({ where: { id: pageId, userId }, include: { blocks: { orderBy: { position: "asc" } } } });
  if (!page) return { ok: false, error: "That page no longer exists." };
  const plan = await getPlan(userId);
  if ((await db.page.count({ where: { userId } })) >= PLAN_LIMITS[plan].maxPages) {
    return { ok: false, error: plan === "FREE" ? `Free accounts can have ${PLAN_LIMITS.FREE.maxPages} page${PLAN_LIMITS.FREE.maxPages === 1 ? "" : "s"}. Upgrade to Pro for more.` : "You've reached the page limit." };
  }
  const username = await copyUsername(page.username);
  if (!username) return { ok: false, error: "Couldn't find a free name for the copy." };
  const copy = await db.page.create({
    data: {
      userId,
      username,
      displayName: page.displayName,
      bio: page.bio,
      avatarUrl: page.avatarUrl,
      themeKey: page.themeKey,
      themeOverrides: page.themeOverrides === null ? Prisma.DbNull : (page.themeOverrides as Prisma.InputJsonValue),
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      published: page.published,
      showBadge: page.showBadge,
      warningTemplate: page.warningTemplate,
      openInBrowser: page.openInBrowser,
      layout: page.layout,
      heroUrl: page.heroUrl,
      tagline: page.tagline,
      // A badge granted by the site owner (verifiedAt) belongs to the original page only.
      showVerified: page.showVerified,
      handle: page.handle,
      showHandle: page.showHandle,
      // Same domain, but always at a path: a domain has only one Root.
      domainId: page.domainId,
      atRoot: false,
      blocks: {
        create: page.blocks.map((b) => ({
          type: b.type,
          position: b.position,
          enabled: b.enabled,
          title: b.title,
          url: b.url,
          data: b.data as Prisma.InputJsonValue,
          contentWarning: b.contentWarning,
          contentWarningText: b.contentWarningText,
        })),
      },
    },
  });
  expireUsername(copy.username);
  return { ok: true, username: copy.username };
}
