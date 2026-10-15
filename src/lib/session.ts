import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireUserId(): Promise<string> {
  await connection();
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}

/** For dashboard routes: signed in and has claimed a username. */
export async function requirePage() {
  const userId = await requireUserId();
  const page = await db.page.findUnique({ where: { userId } });
  if (!page) redirect("/onboarding");
  return { userId, page };
}
