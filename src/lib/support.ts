import "server-only";
import { db } from "@/lib/db";
import { BOT_FALLBACK, botReply } from "@/lib/support-bot";

// Help/support chat. A scripted assistant answers common questions first and hands off to the site
// owner (a real agent) when it can't help or the creator asks for a person. One "thread" is all
// the SupportMessage rows for a single userId, plus a SupportThread row holding its state.

export const SUPPORT_MAX_LEN = 2000;

// Shown when the chat is handed from the assistant to a real person.
const HANDOFF = "Thanks — I'm connecting you with a real person from our team. They'll reply right here, so you can close this and come back anytime.";

export type SupportRole = "user" | "ai" | "agent";

export type SupportMessage = {
  id: string;
  body: string;
  role: SupportRole;
  createdAt: Date;
};

export type ThreadView = {
  messages: SupportMessage[];
  mode: "ai" | "agent";
  /** When an agent last read the creator's messages (powers the creator-side "Seen"). */
  agentSeenAt: Date | null;
  /** A real person is typing a reply right now. */
  agentTyping: boolean;
};

/** How long a keystroke keeps the other side's "typing…" dots on. */
const TYPING_WINDOW_MS = 6000;
const isTyping = (at: Date | null | undefined) => !!at && Date.now() - at.getTime() < TYPING_WINDOW_MS;

const asRole = (r: string): SupportRole => (r === "ai" || r === "agent" ? r : "user");

function ensureThread(userId: string) {
  return db.supportThread.upsert({ where: { userId }, create: { userId }, update: {} });
}

/** A creator's own conversation, oldest first. */
export async function getThread(userId: string): Promise<SupportMessage[]> {
  const rows = await db.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true, role: true, createdAt: true },
  });
  return rows.map((r) => ({ ...r, role: asRole(r.role) }));
}

/** The conversation plus its state, for the widget. */
export async function getThreadView(userId: string): Promise<ThreadView> {
  const [messages, thread] = await Promise.all([
    getThread(userId),
    db.supportThread.findUnique({ where: { userId }, select: { mode: true, agentSeenAt: true, agentTypingAt: true } }),
  ]);
  return {
    messages,
    mode: thread?.mode === "agent" ? "agent" : "ai",
    agentSeenAt: thread?.agentSeenAt ?? null,
    agentTyping: isTyping(thread?.agentTypingAt),
  };
}

export type AdminThreadView = {
  messages: SupportMessage[];
  /** The creator is typing right now. */
  userTyping: boolean;
  /** When the creator last viewed the chat (powers the owner-side "Seen"). */
  userSeenAt: Date | null;
};

/** The conversation as the owner sees it, for the live admin thread. */
export async function getAdminThreadView(userId: string): Promise<AdminThreadView> {
  const [messages, thread] = await Promise.all([
    getThread(userId),
    db.supportThread.findUnique({ where: { userId }, select: { userSeenAt: true, userTypingAt: true } }),
  ]);
  return { messages, userTyping: isTyping(thread?.userTypingAt), userSeenAt: thread?.userSeenAt ?? null };
}

/** Records a keystroke so the other side sees "typing…". */
export async function markTyping(userId: string, side: "user" | "agent"): Promise<void> {
  await db.supportThread.updateMany({ where: { userId }, data: side === "user" ? { userTypingAt: new Date() } : { agentTypingAt: new Date() } });
}

/** How many replies from support the creator hasn't seen yet (the widget's dot). */
export function userUnreadCount(userId: string): Promise<number> {
  return db.supportMessage.count({ where: { userId, role: { in: ["ai", "agent"] }, readByUser: false } });
}

async function addMessage(userId: string, body: string, role: SupportRole): Promise<SupportMessage> {
  const row = await db.supportMessage.create({
    data: {
      userId,
      body,
      role,
      fromAdmin: role !== "user",
      readByUser: role === "user",
      readByAdmin: role !== "user",
    },
    select: { id: true, body: true, role: true, createdAt: true },
  });
  return { ...row, role: asRole(row.role) };
}

async function setMode(userId: string, mode: "ai" | "agent") {
  await db.supportThread.update({
    where: { userId },
    data: mode === "agent" ? { mode, escalatedAt: new Date() } : { mode },
  });
}

/**
 * A creator sends a message. In "ai" mode the scripted assistant replies (and may hand off to a human);
 * in agent mode we just record it for the owner. Returns the refreshed thread view.
 */
export async function handleUserMessage(userId: string, body: string): Promise<ThreadView | null> {
  const text = body.trim().slice(0, SUPPORT_MAX_LEN);
  if (!text) return null;
  const thread = await ensureThread(userId);
  await addMessage(userId, text, "user");
  await db.supportThread.update({ where: { userId }, data: { userTypingAt: null } });

  if (thread.mode !== "agent") {
    // How many "didn't get that" replies came right before this message (two in a row → a person).
    const recent = await db.supportMessage.findMany({
      where: { userId, role: "ai" },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { body: true },
    });
    const misses = recent[0]?.body === BOT_FALLBACK ? 1 : 0;
    const { reply, escalate } = botReply(text, misses);
    await addMessage(userId, escalate ? HANDOFF : reply, "ai");
    if (escalate) await setMode(userId, "agent");
  }
  return getThreadView(userId);
}

/** The creator asks for a real person (the "Talk to a human" button). */
export async function escalate(userId: string): Promise<ThreadView> {
  const thread = await ensureThread(userId);
  if (thread.mode !== "agent") {
    await addMessage(userId, HANDOFF, "ai");
    await setMode(userId, "agent");
  }
  return getThreadView(userId);
}

/** The owner replies from the admin inbox. */
export async function adminReply(userId: string, body: string): Promise<SupportMessage | null> {
  const text = body.trim().slice(0, SUPPORT_MAX_LEN);
  if (!text) return null;
  await ensureThread(userId);
  // The owner is now handling it directly.
  await db.supportThread.update({ where: { userId }, data: { mode: "agent", agentTypingAt: null } });
  return addMessage(userId, text, "agent");
}

/** Mark support's replies as seen once the creator opens the widget. */
export async function markReadByUser(userId: string): Promise<void> {
  await Promise.all([
    db.supportMessage.updateMany({ where: { userId, role: { in: ["ai", "agent"] }, readByUser: false }, data: { readByUser: true } }),
    db.supportThread.updateMany({ where: { userId }, data: { userSeenAt: new Date() } }),
  ]);
}

/** Mark a creator's messages as seen once the owner opens their thread. */
export async function markReadByAdmin(userId: string): Promise<void> {
  await Promise.all([
    db.supportMessage.updateMany({ where: { userId, role: "user", readByAdmin: false }, data: { readByAdmin: true } }),
    db.supportThread.updateMany({ where: { userId }, data: { agentSeenAt: new Date() } }),
  ]);
}

/** How many creators are waiting on a real person (the admin nav badge). */
export async function adminUnreadThreads(): Promise<number> {
  const rows = await db.supportMessage.findMany({
    where: { role: "user", readByAdmin: false },
    distinct: ["userId"],
    select: { userId: true },
  });
  return rows.length;
}

export type SupportThreadRow = {
  userId: string;
  name: string | null;
  email: string | null;
  lastBody: string;
  lastAt: Date;
  lastRole: SupportRole;
  mode: "ai" | "agent";
  escalated: boolean;
  unread: number;
  total: number;
};

/** The owner's inbox: one row per creator who has ever written, newest activity first. */
export async function supportThreads(): Promise<SupportThreadRow[]> {
  const grouped = await db.supportMessage.groupBy({ by: ["userId"], _max: { createdAt: true }, _count: { _all: true } });
  if (!grouped.length) return [];
  const userIds = grouped.map((g) => g.userId);
  const [users, lastRows, unreadRows, threads] = await Promise.all([
    db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
    db.supportMessage.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
      select: { userId: true, body: true, createdAt: true, role: true },
    }),
    db.supportMessage.groupBy({ by: ["userId"], where: { role: "user", readByAdmin: false }, _count: { _all: true } }),
    db.supportThread.findMany({ where: { userId: { in: userIds } }, select: { userId: true, mode: true, escalatedAt: true } }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const lastByUser = new Map(lastRows.map((r) => [r.userId, r]));
  const unreadByUser = new Map(unreadRows.map((r) => [r.userId, r._count._all]));
  const threadByUser = new Map(threads.map((t) => [t.userId, t]));
  return grouped
    .map((g) => {
      const u = userById.get(g.userId);
      const last = lastByUser.get(g.userId);
      const t = threadByUser.get(g.userId);
      return {
        userId: g.userId,
        name: u?.name ?? null,
        email: u?.email ?? null,
        lastBody: last?.body ?? "",
        lastAt: g._max.createdAt ?? new Date(0),
        lastRole: asRole(last?.role ?? "user"),
        mode: (t?.mode === "agent" ? "agent" : "ai") as "ai" | "agent",
        escalated: !!t?.escalatedAt,
        unread: unreadByUser.get(g.userId) ?? 0,
        total: g._count._all,
      };
    })
    .sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0) || b.lastAt.getTime() - a.lastAt.getTime());
}
