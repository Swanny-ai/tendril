import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { auth, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { passwordSchema } from "@/lib/validation";

// Changing a password signs out every other device (sessionVersion bump) and gives this
// device a fresh session cookie. This is a route handler rather than a server action so
// the new cookie is applied before anything re-renders with the old one.
export async function POST(request: NextRequest) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!rateLimit(`pw-change:${userId}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { currentPassword?: unknown; newPassword?: unknown };
  const next = passwordSchema.safeParse(body.newPassword);
  if (!next.success) return NextResponse.json({ error: next.error.issues[0].message }, { status: 400 });

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, passwordHash: true } });
  if (user.passwordHash && !(await bcrypt.compare(String(body.currentPassword ?? ""), user.passwordHash))) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
  }

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(next.data, 12), sessionVersion: { increment: 1 } },
  });
  await signIn("credentials", { email: user.email, password: next.data, redirect: false });
  return NextResponse.json({ ok: true });
}
