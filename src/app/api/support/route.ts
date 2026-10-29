import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { escalate, getThreadView, handleUserMessage, markReadByUser, markTyping, SUPPORT_MAX_LEN, userUnreadCount } from "@/lib/support";

// The help/support chat for a signed-in creator, polled every few seconds by the widget so it
// feels live. GET loads the conversation (and marks support's replies as seen); GET ?peek=1 only
// returns the unread count, for the badge while the panel is closed. POST sends a message, asks
// for a human, or reports a keystroke ("typing…" on the owner's side).
export async function GET(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (request.nextUrl.searchParams.get("peek")) return NextResponse.json({ unread: await userUnreadCount(userId) });
  await markReadByUser(userId);
  return NextResponse.json(await getThreadView(userId));
}

export async function POST(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { body?: unknown; action?: unknown };

  if (body.action === "typing") {
    if (rateLimit(`support-typing:${userId}`, 60, 60_000)) await markTyping(userId, "user");
    return NextResponse.json({ ok: true });
  }

  if (!rateLimit(`support:${userId}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many messages. Please wait a few minutes." }, { status: 429 });
  }
  if (body.action === "escalate") return NextResponse.json(await escalate(userId));

  const text = typeof body.body === "string" ? body.body.trim().slice(0, SUPPORT_MAX_LEN) : "";
  if (!text) return NextResponse.json({ error: "Please type a message." }, { status: 400 });
  const view = await handleUserMessage(userId, text);
  if (!view) return NextResponse.json({ error: "Please type a message." }, { status: 400 });
  return NextResponse.json(view);
}
