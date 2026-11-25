"use server";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { cleanAnswers } from "@/lib/onboarding";
import { requireUserId } from "@/lib/session";

/** Save the sign-up answers (or an empty set when skipped) and mark the questions done. */
export async function saveOnboardingAction(raw: unknown): Promise<{ ok: true }> {
  const userId = await requireUserId();
  const answers = cleanAnswers(raw);
  await db.user.update({ where: { id: userId }, data: { onboarding: answers as unknown as Prisma.InputJsonValue, onboardedAt: new Date() } });
  return { ok: true };
}
