import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentPage } from "@/lib/current-page";

export async function requireUserId(): Promise<string> {
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}

/** For dashboard routes: signed in and has claimed a username. */
/** A signed-in account and its current bio page, if it has one (new accounts start with none). */
export async function requireAccount() {
  const userId = await requireUserId();
  return { userId, page: await getCurrentPage(userId) };
}

/** For screens that edit a bio page: without one, the creator picks a template first. */
export async function requirePage() {
  const userId = await requireUserId();
  const page = await getCurrentPage(userId);
  if (!page) redirect("/dashboard/templates");
  return { userId, page };
}
