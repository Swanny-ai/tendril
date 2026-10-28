import "server-only";
import { db } from "@/lib/db";

// Help/support chat: creators message the site owner from the floating widget, the owner reads
// and replies in /admin/support. One "thread" is all the SupportMessage rows for a single userId.

export const SUPPORT_MAX_LEN = 2000;

export type SupportMessage = {
  id: string;
  body: string;
  fromAdmin: boolean;
  createdAt: Date;
};

/** A creator's own conversation, oldest first, for the widget. */
export async function getThread(userId: string): Promise<SupportMessage[]> {
  return db.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true, fromAdmin: true, createdAt: true },
  });
}

/** How many replies from the owner the creator hasn't seen yet (the widget's dot). */
export function userUnreadCount(userId: string): Promise<number> {
  return db.supportMessage.count({ where: { userId, fromAdmin: true, readByUser: false } });
}

/** A creator sends a message. Returns the saved row, or null when the body is empty. */
export async function sendUserMessage(userId: string, body: string): Promise<SupportMessage | null> {
  const text = body.trim().slice(0, SUPPORT_MAX_LEN);
  if (!text) return null;
  return db.supportMessage.create({
    data: { userId, body: text, fromAdmin: false, readByUser: true, readByAdmin: false },
    select: { id: true, body: true, fromAdmin: true, createdAt: true },
  });
}

/** The owner replies to a creator from the admin inbox. */
export async function adminReply(userId: string, body: string): Promise<SupportMessage | null> {
  const text = body.trim().slice(0, SUPPORT_MAX_LEN);
  if (!text) return null;
  return db.supportMessage.create({
    data: { userId, body: text, fromAdmin: true, readByUser: false, readByAdmin: true },
    select: { id: true, body: true, fromAdmin: true, createdAt: true },
  });
}

/** Mark the owner's replies as seen once the creator opens the widget. */
export async function markReadByUser(userId: string): Promise<void> {
  await db.supportMessage.updateMany({ where: { userId, fromAdmin: true, readByUser: false }, data: { readByUser: true } });
}

/** Mark a creator's messages as seen once the owner opens their thread. */
export async function markReadByAdmin(userId: string): Promise<void> {
  await db.supportMessage.updateMany({ where: { userId, fromAdmin: false, readByAdmin: false }, data: { readByAdmin: true } });
}

/** How many creators have a message the owner hasn't read (the admin nav badge). */
export async function adminUnreadThreads(): Promise<number> {
  const rows = await db.supportMessage.findMany({
    where: { fromAdmin: false, readByAdmin: false },
    distinct: ["userId"],
    select: { userId: true },
  });
  return rows.length;
}

export type SupportThread = {
  userId: string;
  name: string | null;
  email: string | null;
  lastBody: string;
  lastAt: Date;
  lastFromAdmin: boolean;
  unread: number;
  total: number;
};

/** The owner's inbox: one row per creator who has ever written, newest activity first. */
export async function supportThreads(): Promise<SupportThread[]> {
  const grouped = await db.supportMessage.groupBy({
    by: ["userId"],
    _max: { createdAt: true },
    _count: { _all: true },
  });
  if (!grouped.length) return [];
  const userIds = grouped.map((g) => g.userId);
  const [users, lastRows, unreadRows] = await Promise.all([
    db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
    db.supportMessage.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
      select: { userId: true, body: true, createdAt: true, fromAdmin: true },
    }),
    db.supportMessage.groupBy({
      by: ["userId"],
      where: { fromAdmin: false, readByAdmin: false },
      _count: { _all: true },
    }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const lastByUser = new Map(lastRows.map((r) => [r.userId, r]));
  const unreadByUser = new Map(unreadRows.map((r) => [r.userId, r._count._all]));
  return grouped
    .map((g) => {
      const u = userById.get(g.userId);
      const last = lastByUser.get(g.userId);
      return {
        userId: g.userId,
        name: u?.name ?? null,
        email: u?.email ?? null,
        lastBody: last?.body ?? "",
        lastAt: g._max.createdAt ?? new Date(0),
        lastFromAdmin: last?.fromAdmin ?? false,
        unread: unreadByUser.get(g.userId) ?? 0,
        total: g._count._all,
      };
    })
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}
