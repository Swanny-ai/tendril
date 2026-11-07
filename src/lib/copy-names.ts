import "server-only";
import { db } from "@/lib/db";
import { smartLinkSlugSchema, usernameSchema } from "@/lib/validation";

// Names for duplicates: "<name>-copy", "<name>-copy-2"... (deep links) and "<name>_copy",
// "<name>_copy2"... (bio pages). Deep links and bio pages share <app domain>/<name>, so a name
// is free only when neither uses it.

async function nameIsFree(name: string) {
  const [page, link] = await Promise.all([
    db.page.findUnique({ where: { username: name }, select: { id: true } }),
    db.smartLink.findFirst({ where: { slug: name }, select: { id: true } }),
  ]);
  return !page && !link;
}

async function firstFree(candidates: (n: number) => string, valid: (name: string) => boolean): Promise<string | null> {
  for (let n = 1; n <= 50; n++) {
    const name = candidates(n);
    if (valid(name) && (await nameIsFree(name))) return name;
  }
  return null;
}

/** A free deep link name for a copy of `slug`. */
export function copySlug(slug: string) {
  const base = slug.replace(/-copy(-\d+)?$/, "");
  return firstFree(
    (n) => {
      const suffix = n === 1 ? "-copy" : `-copy-${n}`;
      return `${base.slice(0, 50 - suffix.length).replace(/-+$/, "")}${suffix}`;
    },
    (name) => smartLinkSlugSchema.safeParse(name).success,
  );
}

/**
 * Before a domain is removed, its links are about to fall back to the ViewLink domain, where a name
 * must be free everywhere. Links whose name is used elsewhere get a free one. Returns the new names.
 */
export async function freeNamesForDomainRemoval(domainId: string): Promise<string[]> {
  const links = await db.smartLink.findMany({ where: { domainId }, select: { id: true, slug: true } });
  const renamed: string[] = [];
  for (const link of links) {
    const [other, page] = await Promise.all([
      db.smartLink.findFirst({ where: { slug: link.slug, NOT: { id: link.id } }, select: { id: true } }),
      db.page.findUnique({ where: { username: link.slug }, select: { id: true } }),
    ]);
    if (!other && !page) continue;
    const slug = await copySlug(link.slug);
    if (!slug) continue;
    await db.smartLink.update({ where: { id: link.id }, data: { slug } });
    renamed.push(slug);
  }
  return renamed;
}

/** A free username for a copy of a bio page. */
export function copyUsername(username: string) {
  const base = username.replace(/_copy\d*$/, "");
  return firstFree(
    (n) => {
      const suffix = n === 1 ? "_copy" : `_copy${n}`;
      return `${base.slice(0, 30 - suffix.length).replace(/\.+$/, "")}${suffix}`;
    },
    (name) => usernameSchema.safeParse(name).success,
  );
}
