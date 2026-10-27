import Link from "next/link";
import type { Domain, SmartLink } from "@/generated/prisma/client";
import { appUrl } from "@/config/brand";
import { smartLinkUrl } from "@/lib/domains";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { DEFAULT_LANDING, parseLanding } from "@/lib/link-landing";
import { parseAccess } from "@/lib/link-access";
import { turnstileConfigured } from "@/lib/turnstile";
import { parseWarningColors } from "@/warning-templates/colors";
import { SmartLinkForm } from "./smart-link-form";
import { TemplateUpsell } from "./template-upsell";

/** The deep link editor (opened at /edit/<its link>). */
export async function LinkEditScreen({ userId, link }: { userId: string; link: SmartLink & { domain: Pick<Domain, "hostname"> | null } }) {
  const domains = await db.domain.findMany({ where: { userId, verifiedAt: { not: null } }, select: { id: true, hostname: true }, orderBy: { createdAt: "asc" } });
  const limits = PLAN_LIMITS[await getPlan(userId)];
  const landing = parseLanding(link.landingPage);
  const mode = landing?.enabled ? "template" : "classic";
  const url = smartLinkUrl(link.slug, link.domain, appUrl, link.atRoot);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="min-w-0">
        <Link href={mode === "template" ? "/dashboard/links" : "/dashboard/deeplinks"} className="text-sm text-muted-foreground hover:text-foreground">
          ← {mode === "template" ? "Customize template" : "Deeplinks"}
        </Link>
        <h1 className="mt-1 truncate text-2xl font-semibold">Edit {url.replace(/^https?:\/\//, "")}</h1>
      </div>
      {mode === "template" && !limits.templatePages ? <TemplateUpsell compact /> : null}
      <SmartLinkForm
        domains={domains}
        id={link.id}
        mode={mode}
        publicUrl={url}
        limits={limits}
        turnstileReady={turnstileConfigured()}
        initial={{
          slug: link.slug,
          destinationUrl: link.destinationUrl,
          label: link.label,
          adultWarning: link.adultWarning,
          openInBrowser: link.openInBrowser,
          access: parseAccess(link.access),
          domainId: link.domainId,
          atRoot: link.atRoot,
          warningTemplate: link.warningTemplate,
          warningTitle: link.warningTitle ?? "",
          warningMessage: link.warningMessage ?? "",
          warningButton: link.warningButton ?? "",
          warningColors: parseWarningColors(link.warningColors) ?? {},
          landingPage: landing ?? DEFAULT_LANDING,
          showBadge: link.showBadge,
          enabled: link.enabled,
        }}
      />
    </div>
  );
}
