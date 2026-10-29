import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getAdminThreadView, markReadByAdmin, markTyping } from "@/lib/support";

// The owner's side of one support conversation, polled by the admin thread page so new messages
// and the creator's "typing…" show up without a refresh. Anyone but an admin gets a plain 404.
type Ctx = { params: Promise<{ userId: string }> };

async function adminOr404() {
  const userId = (await auth())?.user?.id;
  return userId && (await isAdmin(userId)) ? userId : null;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  if (!(await adminOr404())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { userId } = await ctx.params;
  // The owner has the thread open, so everything the creator wrote counts as seen.
  await markReadByAdmin(userId);
  return NextResponse.json(await getAdminThreadView(userId));
}

/** A keystroke in the reply box: the creator sees "typing…". */
export async function POST(_request: NextRequest, ctx: Ctx) {
  if (!(await adminOr404())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { userId } = await ctx.params;
  await markTyping(userId, "agent");
  return NextResponse.json({ ok: true });
}
