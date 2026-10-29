import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getAdminTicketView, markReadByAdmin, markTyping } from "@/lib/support";

// The owner's side of one ticket, polled by the admin ticket page so new messages and the
// creator's "typing…" show up without a refresh. Anyone but an admin gets a plain 404.
type Ctx = { params: Promise<{ ticketId: string }> };
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

async function signedInAdmin() {
  const userId = (await auth())?.user?.id;
  return !!userId && (await isAdmin(userId));
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  if (!(await signedInAdmin())) return notFound();
  const { ticketId } = await ctx.params;
  // The owner has the ticket open, so everything the creator wrote counts as seen.
  await markReadByAdmin(ticketId);
  const view = await getAdminTicketView(ticketId);
  return view ? NextResponse.json(view) : notFound();
}

/** A keystroke in the reply box: the creator sees "typing…". */
export async function POST(_request: NextRequest, ctx: Ctx) {
  if (!(await signedInAdmin())) return notFound();
  await markTyping((await ctx.params).ticketId, "agent");
  return NextResponse.json({ ok: true });
}
