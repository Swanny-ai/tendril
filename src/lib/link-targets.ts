import "server-only";
import { db } from "@/lib/db";

// Where a bio page or deep link lives: the ViewLink domain (always at a path) or one of the
// creator's connected custom domains, either at a path or at the domain's root. A custom domain
// shows nothing until something is assigned to it, and each domain has at most one root.

export type LinkTarget = { domainId: string | null; atRoot: boolean };
type Exclude = { pageId?: string; linkId?: string };

/**
 * Checks a target for `path` (a page's username or a deep link's slug). Returns the cleaned
 * target, or an error message.
 */
export async function checkLinkTarget(
  userId: string,
  input: { domainId?: string | null; atRoot?: boolean },
  path: string,
  exclude: Exclude = {},
): Promise<{ ok: true; target: LinkTarget } | { ok: false; error: string }> {
  const domainId = input.domainId || null;
  if (!domainId) {
    if (input.atRoot) return { ok: false, error: "Root needs a custom domain." };
    return { ok: true, target: { domainId: null, atRoot: false } };
  }
  const domain = await db.domain.findFirst({ where: { id: domainId, userId, verifiedAt: { not: null } }, select: { id: true, hostname: true } });
  if (!domain) return { ok: false, error: "That domain isn't connected yet." };

  if (input.atRoot) {
    const [page, link] = await Promise.all([
      db.page.findFirst({ where: { domainId, atRoot: true, ...(exclude.pageId ? { NOT: { id: exclude.pageId } } : {}) }, select: { username: true } }),
      db.smartLink.findFirst({ where: { domainId, atRoot: true, ...(exclude.linkId ? { NOT: { id: exclude.linkId } } : {}) }, select: { slug: true } }),
    ]);
    if (page) return { ok: false, error: `${domain.hostname} already opens your page /${page.username}. Use a path, or change that page first.` };
    if (link) return { ok: false, error: `Another link (${link.slug}) already uses this domain's root. Use a path, or change that link first.` };
    return { ok: true, target: { domainId, atRoot: true } };
  }

  // On a custom domain, pages and deep links share the paths.
  const [page, link] = await Promise.all([
    db.page.findFirst({ where: { domainId, username: path, ...(exclude.pageId ? { NOT: { id: exclude.pageId } } : {}) }, select: { id: true } }),
    db.smartLink.findFirst({ where: { domainId, slug: path, ...(exclude.linkId ? { NOT: { id: exclude.linkId } } : {}) }, select: { id: true } }),
  ]);
  if (page || link) return { ok: false, error: `${domain.hostname}/${path} is already used by another ${page ? "page" : "link"}.` };
  return { ok: true, target: { domainId, atRoot: false } };
}

/** A bio page's public address. */
export function pageUrl(page: { username: string; atRoot: boolean }, domain: { hostname: string } | null | undefined, appUrl: string) {
  if (!domain) return `${appUrl}/${page.username}`;
  return page.atRoot ? `https://${domain.hostname}/` : `https://${domain.hostname}/${page.username}`;
}
