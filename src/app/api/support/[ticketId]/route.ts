import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { escalateTicket, getTicketView, markTyping, sendToTicket, setTicketStatusByUser } from "@/lib/support";

// One of the creator's tickets. GET loads it (marking support's replies as seen). POST sends a
// message, asks for a person, resolves/reopens it, or reports a keystroke ("typing…" for the owner).
type Ctx = { params: Promise<{ ticketId: string }> };
const notFound = () => NextResponse.json({ error: "Conversation not found." }, { status: 404 });

export async function GET(_request: NextRequest, ctx: Ctx) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const view = await getTicketView(userId, (await ctx.params).ticketId);
  return view ? NextResponse.json(view) : notFound();
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const { ticketId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { body?: unknown; action?: unknown };

  if (body.action === "typing") {
    if (rateLimit(`support-typing:${userId}`, 60, 60_000)) await markTyping(ticketId, "user", userId);
    return NextResponse.json({ ok: true });
  }
  if (!rateLimit(`support:${userId}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many messages. Please wait a few minutes." }, { status: 429 });
  }

  const view =
    body.action === "escalate"
      ? await escalateTicket(userId, ticketId)
      : body.action === "resolve"
        ? await setTicketStatusByUser(userId, ticketId, "resolved")
        : body.action === "reopen"
          ? await setTicketStatusByUser(userId, ticketId, "open")
          : typeof body.body === "string" && body.body.trim()
            ? await sendToTicket(userId, ticketId, body.body)
            : undefined;
  if (view === undefined) return NextResponse.json({ error: "Please type a message." }, { status: 400 });
  return view ? NextResponse.json(view) : notFound();
}
