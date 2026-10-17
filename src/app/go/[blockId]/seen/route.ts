import { after, type NextRequest } from "next/server";
import { recordWarningView } from "@/lib/analytics/record";
import { clientIp } from "@/lib/analytics/visitor";
import { getRedirectTarget } from "@/lib/pages";
import { rateLimit } from "@/lib/rate-limit";

// The bio page's 18+ popup reports that its warning was shown (sendBeacon), so warning views
// are counted the same as on the /go/<id>/warning page.
export async function POST(request: NextRequest, ctx: RouteContext<"/go/[blockId]/seen">) {
  const { blockId } = await ctx.params;
  if (!/^[a-z0-9]{10,40}$/i.test(blockId)) return new Response(null, { status: 404 });
  const target = await getRedirectTarget(blockId);
  if (!target || !target.contentWarning) return new Response(null, { status: 404 });
  const headers = new Headers(request.headers);
  if (rateLimit(`warnview:${clientIp(headers)}:${blockId}`, 30, 60_000)) {
    after(() => recordWarningView({ headers }, target.pageId, target.blockId).catch(() => {}));
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
