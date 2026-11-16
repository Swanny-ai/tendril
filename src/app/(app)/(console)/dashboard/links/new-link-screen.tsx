import Link from "next/link";
import { db } from "@/lib/db";
import { DEFAULT_LANDING, defaultIntroSection } from "@/lib/link-landing";
import { DEFAULT_ACCESS } from "@/lib/link-access";
import { linkLimitError, PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireAccount } from "@/lib/session";
import { linkKindCounts } from "@/lib/smart-links";
import { DEFAULT_WARNING_TEMPLATE } from "@/warning-templates/templates";
import type { LinkMode } from "./links-list";
import { SmartLinkForm } from "./smart-link-form";
import { TemplateUpsell } from "./template-upsell";

export const LIST_HREF = { template: "/dashboard/links", classic: "/dashboard/deeplinks" } as const;
const LIST_NAME = { template: "Customize template", classic: "Deeplinks" } as const;
const NEW_TITLE = { template: "New template page", classic: "New deep link" } as const;

/** Create a deep link: a template page (Customize template) or a classic deep link (Deeplinks). */
export async function NewLinkScreen({ mode }: { mode: LinkMode }) {
  const listHref = LIST_HREF[mode];
  const twoSteps = mode !== "classic";
  const { userId } = await requireAccount();
  const plan = await getPlan(userId);
  const limits = PLAN_LIMITS[plan];
  const domains = await db.domain.findMany({ where: { userId, verifiedAt: { not: null } }, select: { id: true, hostname: true }, orderBy: { createdAt: "asc" } });
  const limitError = linkLimitError(plan, await linkKindCounts(userId), twoSteps);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <Link href={listHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← {LIST_NAME[mode]}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{NEW_TITLE[mode]}</h1>
      </div>
      {twoSteps && !limits.templatePages ? (
        <TemplateUpsell />
      ) : limitError ? (
        <p className="rounded-lg border px-4 py-3 text-sm">
          {limitError}{" "}
          <Link href="/dashboard/billing" className="font-medium text-primary underline-offset-4 hover:underline">
            See plans
          </Link>
        </p>
      ) : (
        <SmartLinkForm
          mode={mode}
          limits={limits}
          domains={domains}
          initial={{
            slug: "",
            destinationUrl: "",
            label: "",
            adultWarning: mode === "classic",
            openInBrowser: true,
            access: { ...DEFAULT_ACCESS },
            domainId: null,
            atRoot: false,
            warningTemplate: DEFAULT_WARNING_TEMPLATE,
            warningTitle: "",
            warningMessage: "",
            warningButton: "",
            warningColors: {},
            landingPage: { ...DEFAULT_LANDING, enabled: twoSteps, introSections: twoSteps ? [defaultIntroSection()] : [] },
            showBadge: true,
            enabled: true,
          }}
        />
      )}
    </div>
  );
}
