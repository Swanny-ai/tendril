import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requirePage } from "@/lib/session";
import { SmartLinkForm } from "../smart-link-form";

export const instant = false;
export const metadata: Metadata = { title: "Edit smart link" };

export default async function EditSmartLinkPage(props: PageProps<"/dashboard/links/[id]">) {
  const { userId } = await requirePage();
  const { id } = await props.params;
  const link = await db.smartLink.findFirst({ where: { id, userId } });
  if (!link) notFound();
  const limits = PLAN_LIMITS[await getPlan(userId)];
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <Link href="/dashboard/links" className="text-sm text-muted-foreground hover:text-foreground">
          ← Smart links
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Edit /l/{link.slug}</h1>
      </div>
      <SmartLinkForm
        id={link.id}
        limits={limits}
        initial={{
          slug: link.slug,
          destinationUrl: link.destinationUrl,
          label: link.label,
          adultWarning: link.adultWarning,
          warningTemplate: link.warningTemplate,
          warningTitle: link.warningTitle ?? "",
          warningMessage: link.warningMessage ?? "",
          warningButton: link.warningButton ?? "",
          showBadge: link.showBadge,
          enabled: link.enabled,
        }}
      />
    </div>
  );
}
