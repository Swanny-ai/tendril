"use server";

import { redirect } from "next/navigation";
import { STARTER_BLOCKS } from "@/lib/starter-blocks";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { usernameSchema } from "@/lib/validation";

export type ClaimState = { error?: string } | undefined;

export async function claimUsernameAction(_prev: ClaimState, form: FormData): Promise<ClaimState> {
  const userId = await requireUserId();
  const parsed = usernameSchema.safeParse(form.get("username"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existingPage = await db.page.findUnique({ where: { userId } });
  if (existingPage) redirect("/dashboard");

  const taken = await db.page.findUnique({ where: { username: parsed.data } });
  if (taken) return { error: "That name is taken. Try another one." };

  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const displayName = user?.name ?? user?.email.split("@")[0] ?? parsed.data;

  try {
    await db.page.create({
      data: {
        userId,
        username: parsed.data,
        displayName,
        bio: "",
        blocks: {
          create: STARTER_BLOCKS.map((b, position) => ({ type: b.type, position, title: b.title, url: b.url })),
        },
      },
    });
  } catch {
    return { error: "That name was just taken. Try another one." };
  }
  redirect("/dashboard/editor?welcome=1");
}
