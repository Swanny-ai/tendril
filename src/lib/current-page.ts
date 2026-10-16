import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

// An account can own several bio pages (one per template/link). The dashboard edits one at
// a time: the "current page", remembered in a cookie. Ownership is always re-checked.

export const CURRENT_PAGE_COOKIE = "tendril-page";

/** The page being edited: the remembered one if it's still the user's, else their oldest page. */
export async function getCurrentPage(userId: string) {
  const remembered = (await cookies()).get(CURRENT_PAGE_COOKIE)?.value;
  if (remembered) {
    const page = await db.page.findFirst({ where: { id: remembered, userId } });
    if (page) return page;
  }
  return db.page.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
}

/** Remember which page the dashboard edits (call from a Server Action or Route Handler). */
export async function rememberCurrentPage(pageId: string) {
  (await cookies()).set(CURRENT_PAGE_COOKIE, pageId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
}

