import "server-only";
import type { BlockData, BlockKind } from "@/lib/blocks";
import { cacheLife, cacheTag, updateTag, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { planFromSubscription, visibleBlockIds, PLAN_LIMITS } from "@/lib/plan-rules";
import { resolveTheme, type ThemeTokens } from "@/themes/presets";

export const pageTag = (username: string) => `page:${username}`;
export const blockTag = (blockId: string) => `block:${blockId}`;

export type PublicBlock = {
  id: string;
  type: BlockKind;
  title: string;
  url: string | null;
  data: BlockData;
  contentWarning: boolean;
  contentWarningText: string | null;
};

export type PublicPageData = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  showBadge: boolean;
  openInBrowser: boolean;
  /** 18+ popup style for the page's warning links (null = match the page theme) */
  warningTemplate: string | null;
  layout: string;
  heroUrl: string | null;
  tagline: string;
  verified: boolean;
  /** null = hidden */
  handle: string | null;
  theme: ThemeTokens;
  blocks: PublicBlock[];
};

async function loadPublicPage(username: string): Promise<PublicPageData | null> {
  const page = await db.page.findUnique({
    where: { username },
    include: {
      blocks: { orderBy: { position: "asc" } },
      user: { select: { subscription: { select: { plan: true, status: true } } } },
    },
  });
  if (!page || !page.published) return null;
  const plan = planFromSubscription(page.user.subscription);
  const visible = visibleBlockIds(plan, page.blocks);
  return {
    id: page.id,
    username: page.username,
    displayName: page.displayName,
    bio: page.bio,
    avatarUrl: page.avatarUrl,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    showBadge: PLAN_LIMITS[plan].removeBadge ? page.showBadge : true,
    openInBrowser: page.openInBrowser,
    warningTemplate: page.warningTemplate,
    layout: page.layout,
    heroUrl: page.heroUrl,
    tagline: page.tagline,
    handle: page.showHandle ? page.handle || page.username : null,
    // Pro creators switch it on themselves; pages the site owner verified keep it on any plan.
    verified: page.showVerified && (!!page.verifiedAt || PLAN_LIMITS[plan].verifiedBadge),
    theme: resolveTheme(page.themeKey, page.themeOverrides, PLAN_LIMITS[plan].customTheme),
    blocks: page.blocks
      .filter((b) => visible.has(b.id))
      .filter((b) => b.type !== "LINK" || !!b.url)
      .map((b) => ({
        id: b.id,
        type: b.type,
        title: b.title,
        url: b.url,
        data: (b.data ?? {}) as PublicBlock["data"],
        contentWarning: b.contentWarning,
        contentWarningText: b.contentWarningText,
      })),
  };
}

/** Cached per username; invalidated on every editor save via the page tag. */
export async function getPublicPage(username: string) {
  "use cache";
  cacheTag(pageTag(username));
  cacheLife("hours");
  return loadPublicPage(username);
}

export type RedirectTarget = {
  blockId: string;
  pageId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  url: string;
  contentWarning: boolean;
  contentWarningText: string | null;
  theme: ThemeTokens;
  warningTemplate: string | null;
  openInBrowser: boolean;
};

/** Uncached loader (used by the proxy, where "use cache" is not available). */
export async function loadRedirectTarget(blockId: string): Promise<RedirectTarget | null> {
  const block = await db.block.findUnique({
    where: { id: blockId },
    include: {
      page: {
        include: {
          blocks: { select: { id: true, enabled: true, position: true } },
          user: { select: { subscription: { select: { plan: true, status: true } } } },
        },
      },
    },
  });
  if (!block || block.type !== "LINK" || !block.url || !block.page.published) return null;
  const plan = planFromSubscription(block.page.user.subscription);
  if (!visibleBlockIds(plan, block.page.blocks).has(block.id)) return null;
  return {
    blockId: block.id,
    pageId: block.pageId,
    username: block.page.username,
    displayName: block.page.displayName,
    avatarUrl: block.page.avatarUrl,
    url: block.url,
    contentWarning: block.contentWarning,
    contentWarningText: PLAN_LIMITS[plan].customWarningText ? block.contentWarningText : null,
    theme: resolveTheme(block.page.themeKey, block.page.themeOverrides, PLAN_LIMITS[plan].customTheme),
    warningTemplate: block.page.warningTemplate,
    openInBrowser: block.page.openInBrowser,
  };
}

export async function getRedirectTarget(blockId: string) {
  "use cache";
  cacheTag(blockTag(blockId));
  cacheLife("hours");
  const target = await loadRedirectTarget(blockId);
  // Also tag with the page, so invalidating a page clears all of its links (including deleted ones).
  if (target) cacheTag(pageTag(target.username));
  return target;
}

/** Call from Server Actions after any change that affects the public page. */
export async function invalidatePageFromAction(pageId: string) {
  const page = await db.page.findUnique({ where: { id: pageId }, select: { username: true, blocks: { select: { id: true } } } });
  if (!page) return;
  updateTag(pageTag(page.username));
  for (const b of page.blocks) updateTag(blockTag(b.id));
}

/**
 * Call from Route Handlers (e.g. Stripe webhook), where updateTag is not allowed.
 * Expires immediately: plan changes affect what the public page may show.
 */
export async function invalidatePageFromRoute(where: { userId: string } | { username: string }) {
  const pages = await db.page.findMany({ where, select: { username: true, blocks: { select: { id: true } } } });
  for (const page of pages) {
    revalidateTag(pageTag(page.username), { expire: 0 });
    for (const b of page.blocks) revalidateTag(blockTag(b.id), { expire: 0 });
  }
  return pages.length > 0;
}

/** Expire a username tag even if the page no longer exists (e.g. account deleted). */
export function expireUsername(username: string) {
  revalidateTag(pageTag(username), { expire: 0 });
}
