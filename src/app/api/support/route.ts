import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getThread, markReadByUser, sendUserMessage, SUPPORT_MAX_LEN } from "@/lib/support";

// The help/support chat for a signed-in creator. GET loads their conversation (and marks the
// owner's replies as seen); POST sends a new message. The owner reads and replies in /admin/support.
export async function GET() {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  await markReadByUser(userId);
  const messages = await getThread(userId);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!rateLimit(`support:${userId}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many messages. Please wait a few minutes." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { body?: unknown };
  const text = typeof body.body === "string" ? body.body.trim().slice(0, SUPPORT_MAX_LEN) : "";
  if (!text) return NextResponse.json({ error: "Please type a message." }, { status: 400 });
  const saved = await sendUserMessage(userId, text);
  if (!saved) return NextResponse.json({ error: "Please type a message." }, { status: 400 });
  const messages = await getThread(userId);
  return NextResponse.json({ messages });
}
