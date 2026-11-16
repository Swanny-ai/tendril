"use server";

import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";

/** The user closed the announcement popup: it stays closed until a newer one is sent. */
export async function markAnnouncementSeenAction(): Promise<void> {
  const userId = await requireUserId();
  await db.user.update({ where: { id: userId }, data: { announcementSeenAt: new Date() } });
}
