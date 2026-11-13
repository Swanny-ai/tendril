"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { requireRealUserId } from "@/lib/session";
import { startViewAs, stopViewAs, viewAsTarget } from "@/lib/view-as";

/** Admin → "View as this user": opens their dashboard, view-only, for up to an hour. */
export async function startViewAsAction(form: FormData) {
  const { userId: adminId } = await requireAdmin();
  const targetId = String(form.get("id") ?? "");
  const target = await db.user.findUnique({ where: { id: targetId }, select: { id: true, email: true } });
  if (!target || target.id === adminId) redirect("/admin/users");
  const admin = await db.user.findUnique({ where: { id: adminId }, select: { email: true } });
  // Kept in the server logs, so every look at someone's account can be traced.
  console.info(`[admin] ${admin?.email ?? adminId} started viewing as ${target.email} (${target.id})`);
  await startViewAs(adminId, target.id);
  redirect("/dashboard");
}

/** The banner's "Exit": back to that user's admin page. */
export async function stopViewAsAction() {
  const realId = await requireRealUserId();
  const target = await viewAsTarget(realId);
  await stopViewAs();
  if (target) console.info(`[admin] ${realId} stopped viewing as ${target}`);
  redirect(target ? `/admin/users/${target}` : "/admin");
}
