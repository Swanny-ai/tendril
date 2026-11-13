import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentPage } from "@/lib/current-page";
import { isWriteRequest, viewAsTarget, ViewOnlyError } from "@/lib/view-as";

/** The account that is really signed in (admins viewing another account still get their own id). */
export async function requireRealUserId(): Promise<string> {
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}

/**
 * The account the dashboard works on: the signed-in user, or the account an admin is viewing
 * ("View as user"). While viewing, saving is refused (view-only).
 */
export async function requireUserId(): Promise<string> {
  const id = await requireRealUserId();
  const target = await viewAsTarget(id);
  if (!target) return id;
  if (await isWriteRequest()) throw new ViewOnlyError();
  return target;
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

/**
 * For API routes (no redirects): the account to read, or null when signed out. `write: true` is
 * for routes that change something: they get null while an admin is viewing another account.
 */
export async function apiUserId({ write = false }: { write?: boolean } = {}): Promise<string | null> {
  await connection();
  const id = (await auth())?.user?.id ?? null;
  if (!id) return null;
  const target = await viewAsTarget(id);
  if (!target) return id;
  return write ? null : target;
}
