"use server";

import { appHost } from "@/config/brand";
import { embedSource, type BlockData, type BlockKind } from "@/lib/blocks";
import { db } from "@/lib/db";
import { getCurrentPage } from "@/lib/current-page";
import { checkImage, saveImage } from "@/lib/media";
import { blockTag, invalidatePageFromAction } from "@/lib/pages";
import { updateTag } from "next/cache";
import { assertBlockCapacity, assertCan, getPlan, PlanError } from "@/lib/plans";
import { requireUserId } from "@/lib/session";
import { blockTypeSchema, blockUpdateSchema, normalizeDestinationUrl, profileSchema } from "@/lib/validation";
import { sanitizeOverrides, THEME_PRESETS } from "@/themes/presets";
import { isLayoutKey } from "@/templates/link-in-bio";
import { isWarningTemplateKey } from "@/warning-templates/templates";
import { Prisma } from "@/generated/prisma/client";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function ownPage() {
  const userId = await requireUserId();
  const page = await getCurrentPage(userId);
  if (!page) throw new Error("No page");
  return { userId, page };
}

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof PlanError) return { ok: false, error: e.message };
  console.error(e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const { page } = await ownPage();
    const data = profileSchema.parse(input);
    await db.page.update({
      where: { id: page.id },
      data: {
        displayName: data.displayName,
        bio: data.bio,
        ...(data.tagline === undefined ? {} : { tagline: data.tagline }),
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        ...(data.published === undefined ? {} : { published: data.published }),
      },
    });
    await invalidatePageFromAction(page.id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export type EditorBlock = {
  id: string;
  type: BlockKind;
  position: number;
  enabled: boolean;
  title: string;
  url: string | null;
  data: BlockData;
  contentWarning: boolean;
  contentWarningText: string | null;
};

const DEFAULTS: Record<EditorBlock["type"], Partial<EditorBlock>> = {
  LINK: { title: "New link", url: null },
  HEADER: { title: "New section" },
  TEXT: { data: { text: "Write something here." } },
  SOCIAL_ROW: { data: { socials: [] } },
  EMBED: { title: "", url: null },
  COUNTDOWN: { title: "Offer ends in", data: { until: new Date(Date.now() + 3 * 86_400_000).toISOString() } },
};

export async function createBlockAction(type: unknown): Promise<ActionResult<EditorBlock>> {
  try {
    const { userId, page } = await ownPage();
    const t = blockTypeSchema.parse(type);
    await assertBlockCapacity(userId, page.id);
    const last = await db.block.findFirst({ where: { pageId: page.id }, orderBy: { position: "desc" }, select: { position: true } });
    const d = DEFAULTS[t];
    const block = await db.block.create({
      data: {
        pageId: page.id,
        type: t,
        position: (last?.position ?? -1) + 1,
        title: d.title ?? "",
        url: d.url ?? null,
        data: (d.data ?? {}) as Prisma.InputJsonValue,
        // A LINK without a URL stays off the public page until it has one.
        enabled: true,
      },
    });
    await invalidatePageFromAction(page.id);
    return { ok: true, data: toEditorBlock(block) };
  } catch (e) {
    return fail(e);
  }
}

export async function updateBlockAction(id: string, patch: unknown): Promise<ActionResult<EditorBlock>> {
  try {
    const { userId, page } = await ownPage();
    const block = await db.block.findFirst({ where: { id, pageId: page.id } });
    if (!block) return { ok: false, error: "That block no longer exists." };
    const p = blockUpdateSchema.parse(patch);

    const data: Prisma.BlockUpdateInput = {};
    if (p.title !== undefined) data.title = p.title;
    if (p.enabled !== undefined) data.enabled = p.enabled;
    if (p.contentWarning !== undefined) data.contentWarning = p.contentWarning;
    if (p.contentWarningText !== undefined) {
      if (p.contentWarningText) await assertCan(userId, "customWarningText");
      data.contentWarningText = p.contentWarningText || null;
    }
    if (p.url !== undefined) {
      if (block.type !== "LINK" && block.type !== "EMBED") return { ok: false, error: "Only links and embeds have a URL." };
      if (!p.url) {
        data.url = null;
      } else if (block.type === "EMBED") {
        if (!embedSource(p.url)) return { ok: false, error: "Paste a YouTube or Spotify link." };
        data.url = p.url.trim();
      } else if (!p.url) {
        data.url = null;
      } else {
        const n = normalizeDestinationUrl(p.url, appHost);
        if (!n.ok) return { ok: false, error: n.error };
        data.url = n.url;
      }
    }
    if (p.data !== undefined) data.data = { ...(block.data as object), ...p.data } as Prisma.InputJsonValue;

    const updated = await db.block.update({ where: { id }, data });
    await invalidatePageFromAction(page.id);
    return { ok: true, data: toEditorBlock(updated) };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBlockAction(id: string): Promise<ActionResult> {
  try {
    const { page } = await ownPage();
    await db.$transaction(async (tx) => {
      await tx.block.deleteMany({ where: { id, pageId: page.id } });
      const rest = await tx.block.findMany({ where: { pageId: page.id }, orderBy: { position: "asc" }, select: { id: true } });
      for (const [i, b] of rest.entries()) await tx.block.update({ where: { id: b.id }, data: { position: i } });
    });
    updateTag(blockTag(id));
    await invalidatePageFromAction(page.id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function reorderBlocksAction(ids: string[]): Promise<ActionResult> {
  try {
    const { page } = await ownPage();
    const existing = await db.block.findMany({ where: { pageId: page.id }, select: { id: true } });
    const set = new Set(existing.map((b) => b.id));
    if (ids.length !== set.size || !ids.every((id) => set.has(id))) {
      return { ok: false, error: "Your blocks changed in another tab. Reload to continue." };
    }
    await db.$transaction(ids.map((id, i) => db.block.update({ where: { id }, data: { position: i } })));
    await invalidatePageFromAction(page.id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setThemeAction(input: { themeKey: string; overrides?: unknown; showBadge?: boolean }): Promise<ActionResult> {
  try {
    const { userId, page } = await ownPage();
    const preset = THEME_PRESETS.find((t) => t.key === input.themeKey);
    if (!preset) return { ok: false, error: "Unknown theme." };
    const plan = await getPlan(userId);
    if (preset.pro && plan !== "PRO") throw new PlanError(`${preset.name} is a Pro theme. Upgrade to use it.`);
    const overrides = sanitizeOverrides(input.overrides);
    if (Object.keys(overrides).length) await assertCan(userId, "customTheme");
    if (input.showBadge === false) await assertCan(userId, "removeBadge");
    await db.page.update({
      where: { id: page.id },
      data: {
        themeKey: preset.key,
        themeOverrides: Object.keys(overrides).length ? overrides : Prisma.DbNull,
        ...(input.showBadge === undefined ? {} : { showBadge: input.showBadge }),
      },
    });
    await invalidatePageFromAction(page.id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setWarningTemplateAction(key: string | null): Promise<ActionResult> {
  try {
    const { page } = await ownPage();
    if (key !== null && !isWarningTemplateKey(key)) return { ok: false, error: "Unknown design." };
    await db.page.update({ where: { id: page.id }, data: { warningTemplate: key } });
    await invalidatePageFromAction(page.id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Show or hide the verified badge. Only possible on pages the site owner has verified. */
export async function setShowVerifiedAction(show: boolean): Promise<ActionResult> {
  try {
    const { page } = await ownPage();
    if (!page.verifiedAt) return { ok: false, error: "This page isn't verified." };
    await db.page.update({ where: { id: page.id }, data: { showVerified: show === true } });
    await invalidatePageFromAction(page.id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setLayoutAction(layout: string): Promise<ActionResult> {
  try {
    const { page } = await ownPage();
    if (!isLayoutKey(layout)) return { ok: false, error: "Unknown template." };
    await db.page.update({ where: { id: page.id }, data: { layout } });
    await invalidatePageFromAction(page.id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setOpenInBrowserAction(enabled: boolean): Promise<ActionResult> {
  try {
    const { page } = await ownPage();
    await db.page.update({ where: { id: page.id }, data: { openInBrowser: enabled === true } });
    await invalidatePageFromAction(page.id);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function uploadAvatarAction(form: FormData): Promise<ActionResult<{ url: string | null }>> {
  try {
    const { page } = await ownPage();
    if (form.get("remove") === "1") {
      await db.page.update({ where: { id: page.id }, data: { avatarUrl: null } });
      await invalidatePageFromAction(page.id);
      return { ok: true, data: { url: null } };
    }
    const file = form.get("file");
    const check = checkImage(file);
    if (!check.ok) return { ok: false, error: check.error };
    const url = await saveImage(page.id, file as File, check.ext);
    await db.page.update({ where: { id: page.id }, data: { avatarUrl: url } });
    await invalidatePageFromAction(page.id);
    return { ok: true, data: { url } };
  } catch (e) {
    return fail(e);
  }
}

/** Cover/background photo for the photo templates. */
export async function uploadHeroAction(form: FormData): Promise<ActionResult<{ url: string | null }>> {
  try {
    const { page } = await ownPage();
    if (form.get("remove") === "1") {
      await db.page.update({ where: { id: page.id }, data: { heroUrl: null } });
      await invalidatePageFromAction(page.id);
      return { ok: true, data: { url: null } };
    }
    const file = form.get("file");
    const check = checkImage(file);
    if (!check.ok) return { ok: false, error: check.error };
    const url = await saveImage(page.id, file as File, check.ext);
    await db.page.update({ where: { id: page.id }, data: { heroUrl: url } });
    await invalidatePageFromAction(page.id);
    return { ok: true, data: { url } };
  } catch (e) {
    return fail(e);
  }
}

/** Image for a link shown as an image card. Returns the URL; the block is saved separately. */
export async function uploadBlockImageAction(form: FormData): Promise<ActionResult<{ url: string }>> {
  try {
    const { page } = await ownPage();
    const file = form.get("file");
    const check = checkImage(file);
    if (!check.ok) return { ok: false, error: check.error };
    return { ok: true, data: { url: await saveImage(page.id, file as File, check.ext) } };
  } catch (e) {
    return fail(e);
  }
}

function toEditorBlock(b: {
  id: string;
  type: EditorBlock["type"];
  position: number;
  enabled: boolean;
  title: string;
  url: string | null;
  data: unknown;
  contentWarning: boolean;
  contentWarningText: string | null;
}): EditorBlock {
  return {
    id: b.id,
    type: b.type,
    position: b.position,
    enabled: b.enabled,
    title: b.title,
    url: b.url,
    data: (b.data ?? {}) as EditorBlock["data"],
    contentWarning: b.contentWarning,
    contentWarningText: b.contentWarningText,
  };
}
