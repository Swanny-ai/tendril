import "server-only";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin-emails";
import { requireRealUserId } from "@/lib/session";

// The site owner's admin dashboard (/admin). Who may open it: see lib/admin-emails.ts.
export { adminEmails, isAdmin } from "@/lib/admin-emails";

/**
 * For admin screens and actions: anyone else gets a plain 404, so the dashboard stays hidden.
 * Always the admin's own account, even while they're viewing another one ("View as user").
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const userId = await requireRealUserId();
  if (!(await isAdmin(userId))) notFound();
  return { userId };
}
