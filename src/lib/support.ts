import "server-only";
import { db } from "@/lib/db";
import { BOT_FALLBACK, botReply } from "@/lib/support-bot";

// Help/support tickets. A creator opens a conversation from the help widget; a scripted assistant
// answers common questions first and hands off to the site owner (a real agent) when it can't
// help or the creator asks for a person. Either side can mark a ticket resolved; it stays in the
// history on both sides, and a new message on a resolved ticket reopens it.

export const SUPPORT_MAX_LEN = 2000;

// Shown when a ticket is handed from the assistant to a real person.
const HANDOFF = "Thanks — I'm connecting you with a real person from our team. They'll reply right here, so you can close this and come back anytime.";
const RESOLVED = "Conversation marked as resolved";
const REOPENED = "Conversation reopened";

export type SupportRole = "user" | "ai" | "agent" | "event";
export type TicketStatus = "open" | "resolved";
export type TicketMode = "ai" | "agent";

export type SupportMessage = { id: string; body: string; role: SupportRole; createdAt: Date };

export type TicketInfo = {
  id: string;
  subject: string;
  status: TicketStatus;
  mode: TicketMode;
  resolvedBy: "user" | "agent" | null;
  createdAt: Date;
};

/** One ticket as the creator sees it in the widget. */
export type TicketView = {
  ticket: TicketInfo;
  messages: SupportMessage[];
  /** When an agent last read the creator's messages (powers the creator-side "Seen"). */
  agentSeenAt: Date | null;
  /** A real person is typing a reply right now. */
  agentTyping: boolean;
};

/** How long a keystroke keeps the other side's "typing…" dots on. */
const TYPING_WINDOW_MS = 6000;
const isTyping = (at: Date | null | undefined) => !!at && Date.now() - at.getTime() < TYPING_WINDOW_MS;

const asRole = (r: string): SupportRole => (r === "ai" || r === "agent" || r === "event" ? r : "user");
const SUPPORT_SIDE: SupportRole[] = ["ai", "agent"];

const ticketSelect = {
  id: true,
  userId: true,
  subject: true,
  status: true,
  mode: true,
  resolvedBy: true,
  createdAt: true,
  userSeenAt: true,
  agentSeenAt: true,
  userTypingAt: true,
  agentTypingAt: true,
} as const;

type TicketRow = { id: string; subject: string; status: string; mode: string; resolvedBy: string | null; createdAt: Date };

function info(t: TicketRow): TicketInfo {
  return {
    id: t.id,
    subject: t.subject,
    status: t.status === "resolved" ? "resolved" : "open",
    mode: t.mode === "agent" ? "agent" : "ai",
    resolvedBy: t.resolvedBy === "user" || t.resolvedBy === "agent" ? t.resolvedBy : null,
    createdAt: t.createdAt,
  };
}

const clean = (body: string) => body.trim().slice(0, SUPPORT_MAX_LEN);

async function messagesOf(ticketId: string): Promise<SupportMessage[]> {
  const rows = await db.supportMessage.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true, role: true, createdAt: true },
  });
  return rows.map((r) => ({ ...r, role: asRole(r.role) }));
}

async function addMessage(ticket: { id: string; userId: string }, body: string, role: SupportRole): Promise<void> {
  await db.supportMessage.create({
    data: {
      ticketId: ticket.id,
      userId: ticket.userId,
      body,
      role,
      fromAdmin: role === "ai" || role === "agent",
      // Only the other side's messages count as unread.
      readByUser: role !== "ai" && role !== "agent",
      readByAdmin: role !== "user",
    },
  });
  await db.supportTicket.update({ where: { id: ticket.id }, data: { lastMessageAt: new Date() } });
}

/** A ticket the creator owns, or null. */
function ownTicket(userId: string, ticketId: string) {
  return db.supportTicket.findFirst({ where: { id: ticketId, userId }, select: ticketSelect });
}

/** The scripted assistant answers the creator's latest message (in "ai" mode only). */
async function assistantTurn(ticket: { id: string; userId: string; mode: string }, text: string) {
  if (ticket.mode === "agent") return;
  // Two "didn't get that" replies in a row hand the ticket to a person.
  const last = await db.supportMessage.findFirst({ where: { ticketId: ticket.id, role: "ai" }, orderBy: { createdAt: "desc" }, select: { body: true } });
  const { reply, escalate } = botReply(text, last?.body === BOT_FALLBACK ? 1 : 0);
  await addMessage(ticket, escalate ? HANDOFF : reply, "ai");
  if (escalate) await db.supportTicket.update({ where: { id: ticket.id }, data: { mode: "agent", escalatedAt: new Date() } });
}

// ---------- Creator side ----------

export type TicketSummary = {
  id: string;
  subject: string;
  status: TicketStatus;
  mode: TicketMode;
  lastBody: string;
  lastRole: SupportRole;
  lastMessageAt: Date;
  unread: number;
};

/** All of a creator's tickets, newest activity first (open and resolved). */
export async function listTickets(userId: string): Promise<TicketSummary[]> {
  const tickets = await db.supportTicket.findMany({
    where: { userId },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    select: { id: true, subject: true, status: true, mode: true, resolvedBy: true, createdAt: true, lastMessageAt: true },
  });
  if (!tickets.length) return [];
  const ids = tickets.map((t) => t.id);
  const [lastRows, unreadRows] = await Promise.all([
    db.supportMessage.findMany({
      where: { ticketId: { in: ids }, role: { not: "event" } },
      orderBy: { createdAt: "desc" },
      distinct: ["ticketId"],
      select: { ticketId: true, body: true, role: true },
    }),
    db.supportMessage.groupBy({ by: ["ticketId"], where: { ticketId: { in: ids }, role: { in: SUPPORT_SIDE }, readByUser: false }, _count: { _all: true } }),
  ]);
  const last = new Map(lastRows.map((r) => [r.ticketId, r]));
  const unread = new Map(unreadRows.map((r) => [r.ticketId, r._count._all]));
  return tickets.map((t) => {
    const i = info(t);
    return {
      id: t.id,
      subject: t.subject,
      status: i.status,
      mode: i.mode,
      lastBody: last.get(t.id)?.body ?? "",
      lastRole: asRole(last.get(t.id)?.role ?? "user"),
      lastMessageAt: t.lastMessageAt,
      unread: unread.get(t.id) ?? 0,
    };
  });
}

/** How many replies from support the creator hasn't seen yet, across tickets (the launcher badge). */
export function userUnreadCount(userId: string): Promise<number> {
  return db.supportMessage.count({ where: { userId, role: { in: SUPPORT_SIDE }, readByUser: false } });
}

/** One ticket for the widget, or null when it isn't theirs. Marks support's replies as seen. */
export async function getTicketView(userId: string, ticketId: string): Promise<TicketView | null> {
  const t = await ownTicket(userId, ticketId);
  if (!t) return null;
  await Promise.all([
    db.supportMessage.updateMany({ where: { ticketId, role: { in: SUPPORT_SIDE }, readByUser: false }, data: { readByUser: true } }),
    db.supportTicket.update({ where: { id: ticketId }, data: { userSeenAt: new Date() } }),
  ]);
  return { ticket: info(t), messages: await messagesOf(ticketId), agentSeenAt: t.agentSeenAt, agentTyping: isTyping(t.agentTypingAt) };
}

/** A creator starts a new conversation with its first message. */
export async function createTicket(userId: string, body: string): Promise<TicketView | null> {
  const text = clean(body);
  if (!text) return null;
  const t = await db.supportTicket.create({ data: { userId, subject: text.replace(/\s+/g, " ").slice(0, 80) }, select: { id: true, userId: true, mode: true } });
  await addMessage(t, text, "user");
  await assistantTurn(t, text);
  return getTicketView(userId, t.id);
}

/** A creator writes in a ticket. A resolved ticket reopens. */
export async function sendToTicket(userId: string, ticketId: string, body: string): Promise<TicketView | null> {
  const text = clean(body);
  const t = await ownTicket(userId, ticketId);
  if (!text || !t) return null;
  if (t.status === "resolved") {
    await addMessage(t, REOPENED, "event");
    await db.supportTicket.update({ where: { id: ticketId }, data: { status: "open", resolvedAt: null, resolvedBy: null } });
  }
  await addMessage(t, text, "user");
  await db.supportTicket.update({ where: { id: ticketId }, data: { userTypingAt: null } });
  await assistantTurn(t, text);
  return getTicketView(userId, ticketId);
}

/** The creator asks for a real person ("Talk to a real person"). */
export async function escalateTicket(userId: string, ticketId: string): Promise<TicketView | null> {
  const t = await ownTicket(userId, ticketId);
  if (!t) return null;
  if (t.mode !== "agent") {
    await addMessage(t, HANDOFF, "ai");
    await db.supportTicket.update({ where: { id: ticketId }, data: { mode: "agent", escalatedAt: new Date(), status: "open", resolvedAt: null, resolvedBy: null } });
  }
  return getTicketView(userId, ticketId);
}

/** The creator marks their ticket resolved or reopens it. */
export async function setTicketStatusByUser(userId: string, ticketId: string, status: TicketStatus): Promise<TicketView | null> {
  const t = await ownTicket(userId, ticketId);
  if (!t) return null;
  await setStatus(t, status, "user");
  return getTicketView(userId, ticketId);
}

/** Records a keystroke so the other side sees "typing…". */
export async function markTyping(ticketId: string, side: "user" | "agent", userId?: string): Promise<void> {
  await db.supportTicket.updateMany({
    where: { id: ticketId, ...(userId ? { userId } : {}) },
    data: side === "user" ? { userTypingAt: new Date() } : { agentTypingAt: new Date() },
  });
}

async function setStatus(t: { id: string; userId: string; status: string }, status: TicketStatus, by: "user" | "agent") {
  if (t.status === status) return;
  await addMessage(t, status === "resolved" ? RESOLVED : REOPENED, "event");
  await db.supportTicket.update({
    where: { id: t.id },
    data: status === "resolved" ? { status, resolvedAt: new Date(), resolvedBy: by, userTypingAt: null, agentTypingAt: null } : { status, resolvedAt: null, resolvedBy: null },
  });
}

// ---------- Owner side (admin) ----------

export type AdminTicketView = {
  ticket: TicketInfo & { userId: string };
  messages: SupportMessage[];
  /** The creator is typing right now. */
  userTyping: boolean;
  /** When the creator last viewed the ticket (powers the owner-side "Seen"). */
  userSeenAt: Date | null;
};

/** One ticket as the owner sees it, or null. */
export async function getAdminTicketView(ticketId: string): Promise<AdminTicketView | null> {
  const t = await db.supportTicket.findUnique({ where: { id: ticketId }, select: ticketSelect });
  if (!t) return null;
  return { ticket: { ...info(t), userId: t.userId }, messages: await messagesOf(ticketId), userTyping: isTyping(t.userTypingAt), userSeenAt: t.userSeenAt };
}

/** The owner replies. Replying to a resolved ticket reopens it; the owner now handles it directly. */
export async function adminReply(ticketId: string, body: string): Promise<boolean> {
  const text = clean(body);
  const t = await db.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, userId: true, status: true } });
  if (!text || !t) return false;
  if (t.status === "resolved") await setStatus(t, "open", "agent");
  await addMessage(t, text, "agent");
  await db.supportTicket.update({ where: { id: ticketId }, data: { mode: "agent", agentTypingAt: null } });
  return true;
}

/** The owner resolves or reopens a ticket. */
export async function setTicketStatusByAdmin(ticketId: string, status: TicketStatus): Promise<boolean> {
  const t = await db.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, userId: true, status: true } });
  if (!t) return false;
  await setStatus(t, status, "agent");
  return true;
}

/** Mark a creator's messages in a ticket as seen once the owner opens it. */
export async function markReadByAdmin(ticketId: string): Promise<void> {
  await Promise.all([
    db.supportMessage.updateMany({ where: { ticketId, role: "user", readByAdmin: false }, data: { readByAdmin: true } }),
    db.supportTicket.updateMany({ where: { id: ticketId }, data: { agentSeenAt: new Date() } }),
  ]);
}

/** How many open tickets have a creator message the owner hasn't read (the admin nav badge). */
export async function adminUnreadTickets(): Promise<number> {
  const rows = await db.supportMessage.findMany({
    where: { role: "user", readByAdmin: false, ticket: { status: "open" } },
    distinct: ["ticketId"],
    select: { ticketId: true },
  });
  return rows.length;
}

export type AdminTicketRow = {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  subject: string;
  status: TicketStatus;
  mode: TicketMode;
  lastBody: string;
  lastRole: SupportRole;
  lastMessageAt: Date;
  unread: number;
};

/** The owner's inbox, filtered by status; tickets waiting on a reply first, then newest activity. */
export async function adminTickets(status: TicketStatus): Promise<AdminTicketRow[]> {
  const tickets = await db.supportTicket.findMany({
    where: { status },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
    select: { id: true, userId: true, subject: true, status: true, mode: true, resolvedBy: true, createdAt: true, lastMessageAt: true, user: { select: { name: true, email: true } } },
  });
  if (!tickets.length) return [];
  const ids = tickets.map((t) => t.id);
  const [lastRows, unreadRows] = await Promise.all([
    db.supportMessage.findMany({
      where: { ticketId: { in: ids }, role: { not: "event" } },
      orderBy: { createdAt: "desc" },
      distinct: ["ticketId"],
      select: { ticketId: true, body: true, role: true },
    }),
    db.supportMessage.groupBy({ by: ["ticketId"], where: { ticketId: { in: ids }, role: "user", readByAdmin: false }, _count: { _all: true } }),
  ]);
  const last = new Map(lastRows.map((r) => [r.ticketId, r]));
  const unread = new Map(unreadRows.map((r) => [r.ticketId, r._count._all]));
  return tickets
    .map((t) => {
      const i = info(t);
      return {
        id: t.id,
        userId: t.userId,
        name: t.user.name,
        email: t.user.email,
        subject: t.subject,
        status: i.status,
        mode: i.mode,
        lastBody: last.get(t.id)?.body ?? "",
        lastRole: asRole(last.get(t.id)?.role ?? "user"),
        lastMessageAt: t.lastMessageAt,
        unread: unread.get(t.id) ?? 0,
      };
    })
    .sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0) || b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

/** Open and resolved ticket counts, for the inbox tabs. */
export async function adminTicketCounts(): Promise<Record<TicketStatus, number>> {
  const rows = await db.supportTicket.groupBy({ by: ["status"], _count: { _all: true } });
  const n = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
  return { open: n("open"), resolved: n("resolved") };
}
