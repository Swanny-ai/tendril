import "server-only";
import { db } from "@/lib/db";

// Announcements: messages from the site owner to every user. The newest one the user hasn't seen
// shows once as a popup on the dashboard; the latest ones stay in the support messenger's Home tab.

export type AnnouncementView = { id: string; title: string; body: string; linkLabel: string | null; linkUrl: string | null; createdAt: string };

export const ANNOUNCEMENT_LIMITS = { title: 80, body: 600, linkLabel: 30, linkUrl: 500 } as const;

const toView = (a: { id: string; title: string; body: string; linkLabel: string | null; linkUrl: string | null; createdAt: Date }): AnnouncementView => ({
  ...a,
  createdAt: a.createdAt.toISOString(),
});

/** The latest turned-on announcements (newest first) and the one to show as a popup, if any. */
export async function announcementsFor(userId: string, limit = 3): Promise<{ list: AnnouncementView[]; popup: AnnouncementView | null }> {
  const [list, user] = await Promise.all([
    db.announcement.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, take: limit }),
    db.user.findUnique({ where: { id: userId }, select: { announcementSeenAt: true, createdAt: true } }),
  ]);
  const newest = list[0];
  // Only announcements sent after the account was made, and newer than the last one closed.
  const seen = user?.announcementSeenAt ?? user?.createdAt ?? new Date(0);
  const popup = newest && newest.createdAt > seen ? toView(newest) : null;
  return { list: list.map(toView), popup };
}

/** Only http(s) links, or paths on this site. "" when there's no link. */
export function cleanAnnouncementUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "";
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
