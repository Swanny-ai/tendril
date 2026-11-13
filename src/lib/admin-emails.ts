import "server-only";
import { db } from "@/lib/db";

// Who is an admin: accounts whose email is in ADMIN_EMAILS (comma separated) and has been
// confirmed, so nobody can claim an admin address by signing up with it first.
// (Kept apart from lib/admin.ts so lib/session.ts can use it without a circular import.)

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdmin(userId: string): Promise<boolean> {
  const emails = adminEmails();
  if (!emails.length) return false;
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  return !!user?.emailVerified && emails.includes(user.email.toLowerCase());
}
