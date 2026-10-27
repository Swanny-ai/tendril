import { NextResponse, type NextRequest } from "next/server";
import { clientIp } from "@/lib/analytics/visitor";
import { rateLimit } from "@/lib/rate-limit";
import { HUMAN_COOKIE, humanCookieMaxAge, makeHumanCookie, verifyTurnstile } from "@/lib/turnstile";

const NO_STORE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
// Only ever return to a path on this site (never an external URL).
const safePath = (to: string) => (/^\/(?!\/)[^\s]*$/.test(to) ? to : "/");

// The Turnstile challenge page posts here. We check the token with Cloudflare; on success the
// visitor gets a short-lived "human" cookie and is sent back to the link they were opening.
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  if (!rateLimit(`human:${ip}`, 30, 60_000)) return new Response("Slow down", { status: 429, headers: NO_STORE });

  const form = await request.formData().catch(() => null);
  const token = String(form?.get("cf-turnstile-response") ?? "");
  const to = safePath(String(form?.get("to") ?? "/"));
  const origin = request.nextUrl.origin;

  if (!(await verifyTurnstile(token, ip))) {
    // Failed or no token: send them back to the challenge (the link page shows it again).
    return NextResponse.redirect(new URL(to, origin), { status: 303, headers: NO_STORE });
  }
  const res = NextResponse.redirect(new URL(to, origin), { status: 303, headers: NO_STORE });
  res.cookies.set(HUMAN_COOKIE, makeHumanCookie(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: humanCookieMaxAge,
  });
  return res;
}
