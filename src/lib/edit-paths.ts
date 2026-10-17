import "server-only";
import { appHost, appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { smartLinkUrl } from "@/lib/domains";
import { pageUrl } from "@/lib/link-targets";

// Editing addresses follow the public link, so they read like what they edit:
//   bio page  https://sarahjames.me/maria  →  /edit/template/sarahjames.me/maria
//   deep link https://sarahjames.me/        →  /edit/sarahjames.me
//   deep link https://viewlink.me/l/vip     →  /edit/viewlink.me/l/vip

const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export function editPagePath(page: { username: string; atRoot: boolean }, domain: { hostname: string } | null | undefined) {
  return `/edit/template/${bare(pageUrl(page, domain, appUrl))}`;
}

export function editLinkPath(link: { slug: string; atRoot: boolean }, domain: { hostname: string } | null | undefined) {
  return `/edit/${bare(smartLinkUrl(link.slug, domain, appUrl, link.atRoot))}`;
}

function split(segments: string[]) {
  const [host = "", ...rest] = segments.map((s) => decodeURIComponent(s).toLowerCase());
  return { host, rest };
}

/** The creator's bio page an /edit/template/... address points at, or null. */
export async function pageFromEditPath(userId: string, segments: string[]) {
  const { host, rest } = split(segments);
  // On the ViewLink domain every page also lives at /<username>, whatever its own domain.
  if (host === appHost.toLowerCase()) {
    return rest.length === 1 ? db.page.findFirst({ where: { userId, username: rest[0] } }) : null;
  }
  const domain = await db.domain.findFirst({ where: { userId, hostname: host }, select: { id: true } });
  if (!domain) return null;
  if (rest.length === 0) return db.page.findFirst({ where: { userId, domainId: domain.id, atRoot: true } });
  return rest.length === 1 ? db.page.findFirst({ where: { userId, domainId: domain.id, username: rest[0] } }) : null;
}

/** The creator's deep link an /edit/... address points at, or null. */
export async function linkFromEditPath(userId: string, segments: string[]) {
  const { host, rest } = split(segments);
  const include = { domain: { select: { hostname: true } } } as const;
  if (host === appHost.toLowerCase()) {
    return rest.length === 2 && rest[0] === "l" ? db.smartLink.findFirst({ where: { userId, slug: rest[1] }, include }) : null;
  }
  const domain = await db.domain.findFirst({ where: { userId, hostname: host }, select: { id: true } });
  if (!domain) return null;
  if (rest.length === 0) return db.smartLink.findFirst({ where: { userId, domainId: domain.id, atRoot: true }, include });
  return rest.length === 1 ? db.smartLink.findFirst({ where: { userId, domainId: domain.id, slug: rest[0] }, include }) : null;
}
