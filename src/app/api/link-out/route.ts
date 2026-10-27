import { after, type NextRequest } from "next/server";
import { clientIp } from "@/lib/analytics/visitor";
import { rateLimit } from "@/lib/rate-limit";
import { getSmartLink, recordSmartLinkEvent } from "@/lib/smart-links";

const SLUG = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

// A tapped link on a Two-Steps page goes through here instead of straight to its destination: the
// destination URL is never written in the page HTML, the tap is counted on the server (more reliable
// than a beacon), and the final site is sent no referrer. We 302 to the section's own URL.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const slug = q.get("s") ?? "";
  const sectionId = q.get("i") ?? "";
  if (!SLUG.test(slug)) return new Response("Not found", { status: 404, headers: NO_STORE });
  if (!rateLimit(`out:${clientIp(request.headers)}:${slug}`, 120, 60_000)) return new Response("Slow down", { status: 429, headers: NO_STORE });

  const link = await getSmartLink(slug);
  const section = link?.landing?.sections.find((s) => s.id === sectionId && s.url);
  const dest = section?.url ?? "";
  // Only ever redirect to a real web address we stored.
  if (!link || !/^https?:\/\//i.test(dest)) return new Response("Not found", { status: 404, headers: NO_STORE });

  const headers = new Headers(request.headers);
  after(async () => {
    try {
      await recordSmartLinkEvent(headers, link.id, "tap");
    } catch {
      /* analytics never breaks the redirect */
    }
  });
  return new Response(null, { status: 302, headers: { ...NO_STORE, Location: dest } });
}
