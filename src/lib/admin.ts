import "server-only";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";

// The site owner's admin dashboard (/admin). Who may open it: the accounts whose email is in
// ADMIN_EMAILS (comma separated) and has been confirmed, so nobody can claim an admin address
// by signing up with it first.

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

/** For admin screens and actions: anyone else gets a plain 404, so the dashboard stays hidden. */
export async function requireAdmin(): Promise<{ userId: string }> {
  const userId = await requireUserId();
  if (!(await isAdmin(userId))) notFound();
  return { userId };
}
