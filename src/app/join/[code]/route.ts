import { after, NextResponse, type NextRequest } from "next/server";
import { REF_COOKIE, REF_COOKIE_DAYS, normalizeCode } from "@/lib/affiliate-rules";
import { clientIp, visitorHash } from "@/lib/analytics/visitor";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

// An affiliate's link: remembers who invited this visitor (60 days) and opens the sign-up page.
export async function GET(request: NextRequest, ctx: RouteContext<"/join/[code]">) {
  const { code: raw } = await ctx.params;
  const code = normalizeCode(raw);
  const affiliate = code ? await db.user.findUnique({ where: { affiliateCode: code }, select: { id: true } }) : null;
  const res = NextResponse.redirect(new URL("/signup", request.url));
  if (!affiliate || !code) return res;

  res.cookies.set(REF_COOKIE, code, { httpOnly: true, sameSite: "lax", path: "/", maxAge: REF_COOKIE_DAYS * 86_400, secure: process.env.NODE_ENV === "production" });
  const headers = new Headers(request.headers);
  const ip = clientIp(headers);
  if (rateLimit(`affclick:${ip}:${code}`, 10, 60_000)) {
    after(async () => {
      try {
        await db.affiliateClick.create({ data: { affiliateId: affiliate.id, visitorHash: await visitorHash(ip, headers.get("user-agent") ?? "") } });
      } catch (e) {
        console.error("[affiliate] click log failed", e);
      }
    });
  }
  return res;
}
