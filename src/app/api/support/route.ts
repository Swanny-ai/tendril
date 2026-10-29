import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { escalate, getThreadView, handleUserMessage, markReadByUser, SUPPORT_MAX_LEN } from "@/lib/support";

// The help/support chat for a signed-in creator. GET loads their conversation (and marks support's
// replies as seen). POST either sends a message (the AI answers, or hands off) or asks for a human.
export async function GET() {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  await markReadByUser(userId);
  return NextResponse.json(await getThreadView(userId));
}

export async function POST(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!rateLimit(`support:${userId}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many messages. Please wait a few minutes." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { body?: unknown; action?: unknown };

  if (body.action === "escalate") {
    return NextResponse.json(await escalate(userId));
  }

  const text = typeof body.body === "string" ? body.body.trim().slice(0, SUPPORT_MAX_LEN) : "";
  if (!text) return NextResponse.json({ error: "Please type a message." }, { status: 400 });
  const view = await handleUserMessage(userId, text);
  if (!view) return NextResponse.json({ error: "Please type a message." }, { status: 400 });
  return NextResponse.json(view);
}
