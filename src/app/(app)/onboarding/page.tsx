import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { attributeReferral } from "@/lib/affiliate";
import { db } from "@/lib/db";
import { requireRealUserId, requireUserId } from "@/lib/session";
import { OnboardingFlow } from "./onboarding-flow";

export const instant = false;
export const metadata: Metadata = { title: "Welcome" };

// New accounts answer a few questions (who they are, what they want, where their audience is),
// then see the plans. Done once: afterwards this sends them to the dashboard.
export default async function OnboardingPage() {
  const userId = await requireUserId();
  // An admin viewing another account never answers for them.
  if ((await requireRealUserId()) !== userId) redirect("/dashboard");
  await attributeReferral(userId);
  const user = await db.user.findUnique({ where: { id: userId }, select: { onboardedAt: true, name: true } });
  if (user?.onboardedAt) redirect("/dashboard");
  return <OnboardingFlow firstName={user?.name?.trim().split(/\s+/)[0] || null} />;
}
