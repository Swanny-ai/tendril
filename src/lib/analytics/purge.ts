import "server-only";
import { db } from "@/lib/db";

// Analytics rows point at their page, button or smart link without a foreign key (so they outlive a
// deleted link), which means deleting an account must remove them explicitly.

/** Deletes every analytics row of an account: its bio pages and smart links, live and deleted. */
export async function deleteAccountAnalytics(userId: string): Promise<void> {
  const [pages, links, deleted] = await Promise.all([
    db.page.findMany({ where: { userId }, select: { id: true } }),
    db.smartLink.findMany({ where: { userId }, select: { id: true } }),
    db.deletedSource.findMany({ where: { userId }, select: { id: true, kind: true } }),
  ]);
  const pageIds = [...pages.map((p) => p.id), ...deleted.filter((d) => d.kind === "page").map((d) => d.id)];
  const linkIds = [...links.map((l) => l.id), ...deleted.filter((d) => d.kind === "link").map((d) => d.id)];
  await db.$transaction([
    db.pageView.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.clickEvent.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.warningView.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.dailyStat.deleteMany({ where: { pageId: { in: pageIds } } }),
    db.smartLinkEvent.deleteMany({ where: { linkId: { in: linkIds } } }),
  ]);
}
