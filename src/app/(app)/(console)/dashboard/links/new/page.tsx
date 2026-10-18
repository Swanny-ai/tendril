import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requirePage } from "@/lib/session";
import { DEFAULT_WARNING_TEMPLATE } from "@/warning-templates/templates";
import { SmartLinkForm } from "../smart-link-form";

export const instant = false;
export const metadata: Metadata = { title: "New deep link" };

export default async function NewSmartLinkPage() {
  const { userId } = await requirePage();
  const limits = PLAN_LIMITS[await getPlan(userId)];
  const domains = await db.domain.findMany({ where: { userId, verifiedAt: { not: null } }, select: { id: true, hostname: true }, orderBy: { createdAt: "asc" } });
  const count = await db.smartLink.count({ where: { userId } });
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <Link href="/dashboard/links" className="text-sm text-muted-foreground hover:text-foreground">
          ← Deep links
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New deep link</h1>
      </div>
      {count >= limits.maxSmartLinks ? (
        <p className="rounded-lg border px-4 py-3 text-sm">
          You&apos;ve used {limits.maxSmartLinks === 1 ? "the 1 deep link" : `all ${limits.maxSmartLinks} deep links`} on your plan.{" "}
          <Link href="/dashboard/billing" className="font-medium text-primary underline-offset-4 hover:underline">
            Upgrade to Pro
          </Link>{" "}
          for up to {PLAN_LIMITS.PRO.maxSmartLinks}.
        </p>
      ) : (
        <SmartLinkForm
          limits={limits}
          domains={domains}
          initial={{
            slug: "",
            destinationUrl: "",
            label: "",
            adultWarning: true,
            openInBrowser: true,
            domainId: null,
            atRoot: false,
            warningTemplate: DEFAULT_WARNING_TEMPLATE,
            warningTitle: "",
            warningMessage: "",
            warningButton: "",
            showBadge: true,
            enabled: true,
          }}
        />
      )}
    </div>
  );
}
