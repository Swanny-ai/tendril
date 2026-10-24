import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { attributeReferral } from "@/lib/affiliate";
import { requireUserId } from "@/lib/session";

export const instant = false;
export const metadata: Metadata = { title: "Welcome" };

// Accounts no longer start with a page: new sign-ups go straight to the dashboard.
export default async function OnboardingPage() {
  const userId = await requireUserId();
  await attributeReferral(userId);
  redirect("/dashboard?welcome=1");
}
