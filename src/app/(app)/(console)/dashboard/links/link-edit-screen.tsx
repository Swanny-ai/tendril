import Link from "next/link";
import type { Domain, SmartLink } from "@/generated/prisma/client";
import { QrCodeButton } from "@/components/qr-code-button";
import { appUrl } from "@/config/brand";
import { smartLinkUrl } from "@/lib/domains";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { SmartLinkForm } from "./smart-link-form";

/** The deep link editor (opened at /edit/<its link>). */
export async function LinkEditScreen({ userId, link }: { userId: string; link: SmartLink & { domain: Pick<Domain, "hostname"> | null } }) {
  const domains = await db.domain.findMany({ where: { userId, verifiedAt: { not: null } }, select: { id: true, hostname: true }, orderBy: { createdAt: "asc" } });
  const limits = PLAN_LIMITS[await getPlan(userId)];
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/dashboard/links"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Deep links
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Edit {smartLinkUrl(link.slug, link.domain, appUrl, link.atRoot).replace(/^https?:\/\//, "")}</h1>
        </div>
        <QrCodeButton
          url={smartLinkUrl(link.slug, link.domain, appUrl, link.atRoot)}
          filename={`qr-${link.slug}`}
          label="QR code"
        />
      </div>
      <SmartLinkForm
        domains={domains}
        id={link.id}
        limits={limits}
        initial={{
          slug: link.slug,
          destinationUrl: link.destinationUrl,
          label: link.label,
          adultWarning: link.adultWarning,
          openInBrowser: link.openInBrowser,
          domainId: link.domainId,
          atRoot: link.atRoot,
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
