import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { isAdmin } from "@/lib/admin-emails";

// "View as user" for admins: the dashboard shows another account exactly as its owner sees it,
// view-only. A signed cookie names the account; it only counts for the admin who started it,
// while that admin is still an admin, for one hour. Saving anything is refused while it's on.

const COOKIE = "vl_view_as";
const TTL_SECONDS = 60 * 60;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(`view-as:${payload}`).digest("base64url");

/** Starts viewing `targetId` as `adminId` (the caller must already have checked the admin). */
export async function startViewAs(adminId: string, targetId: string) {
  const payload = `${targetId}.${adminId}.${Math.floor(Date.now() / 1000) + TTL_SECONDS}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function stopViewAs() {
  (await cookies()).delete(COOKIE);
}

/** The account being viewed by `realUserId`, or null when not viewing (or the cookie isn't valid for them). */
export async function viewAsTarget(realUserId: string): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [targetId, adminId, exp, sig] = parts;
  const expected = Buffer.from(sign(`${targetId}.${adminId}.${exp}`));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (adminId !== realUserId || Number(exp) < Date.now() / 1000) return null;
  if (!(await isAdmin(realUserId))) return null;
  return targetId === realUserId ? null : targetId;
}

/** True for a server action (a save) rather than a page load: those are refused while viewing. */
export async function isWriteRequest(): Promise<boolean> {
  return !!(await headers()).get("next-action");
}

export class ViewOnlyError extends Error {
  constructor() {
    super("You're viewing this account as an admin. Changes are turned off: exit “View as user” first.");
    this.name = "ViewOnlyError";
  }
}
