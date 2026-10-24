import { after, type NextRequest } from "next/server";
import { clientIp } from "@/lib/analytics/visitor";
import { rateLimit } from "@/lib/rate-limit";
import { getSmartLink, recordSmartLinkEvent } from "@/lib/smart-links";

const SLUG = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

// A tap on a link of a Two-Steps page (sent with navigator.sendBeacon as the visitor leaves).
export async function POST(request: NextRequest) {
  const body = (await request.text().then((t) => JSON.parse(t)).catch(() => null)) as { slug?: unknown } | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!SLUG.test(slug)) return new Response(null, { status: 400 });
  if (!rateLimit(`tap:${clientIp(request.headers)}:${slug}`, 60, 60_000)) return new Response(null, { status: 429 });
  const link = await getSmartLink(slug);
  if (!link) return new Response(null, { status: 404 });
  const headers = new Headers(request.headers);
  after(async () => {
    try {
      await recordSmartLinkEvent(headers, link.id, "tap");
    } catch {
      /* analytics never breaks the page */
    }
  });
  return new Response(null, { status: 204 });
}
