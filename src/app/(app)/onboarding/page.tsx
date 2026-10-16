import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { ClaimForm } from "./claim-form";

export const instant = false;

export const metadata: Metadata = { title: "Claim your link" };

export default async function OnboardingPage(props: PageProps<"/onboarding">) {
  const userId = await requireUserId();
  if (await db.page.findFirst({ where: { userId }, select: { id: true } })) redirect("/dashboard");
  const { u } = await props.searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8" />
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="mb-1 text-2xl font-semibold">Claim your link</h1>
        <p className="mb-6 text-sm text-muted-foreground">This is the address you&apos;ll share. You can&apos;t change it later in this version.</p>
        <ClaimForm initial={typeof u === "string" ? u : ""} />
      </div>
    </main>
  );
}
