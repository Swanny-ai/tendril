import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createTicket, listTickets, SUPPORT_MAX_LEN, userUnreadCount } from "@/lib/support";

// The help widget for a signed-in creator, polled every few seconds so it feels live.
// GET lists their tickets (open and resolved) with the unread count; GET ?peek=1 returns only the
// count, for the launcher badge. POST starts a new ticket with its first message.
export async function GET(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const unread = await userUnreadCount(userId);
  if (request.nextUrl.searchParams.get("peek")) return NextResponse.json({ unread });
  return NextResponse.json({ unread, tickets: await listTickets(userId) });
}

export async function POST(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!rateLimit(`support:${userId}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many messages. Please wait a few minutes." }, { status: 429 });
  }
  if (!rateLimit(`support-new:${userId}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many new conversations. Please continue an existing one." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { body?: unknown };
  const text = typeof body.body === "string" ? body.body.trim().slice(0, SUPPORT_MAX_LEN) : "";
  const view = text ? await createTicket(userId, text) : null;
  if (!view) return NextResponse.json({ error: "Please type a message." }, { status: 400 });
  return NextResponse.json(view);
}
