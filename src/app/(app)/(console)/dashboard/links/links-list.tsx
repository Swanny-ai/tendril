import Link from "next/link";
import { Plus, ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appUrl } from "@/config/brand";
import { smartLinkUrl } from "@/lib/domains";
import { editLinkPath } from "@/lib/edit-paths";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requirePage } from "@/lib/session";
import { getSmartLinkStats } from "@/lib/smart-links";
import { getWarningTemplate } from "@/warning-templates/templates";
import { parseLanding } from "@/lib/link-landing";
import { LinkRowActions } from "./row-actions";
import { TemplateUpsell } from "./template-upsell";

export type LinkMode = "template" | "classic";

const COPY = {
  template: {
    title: "Two-Steps (Escape Meta Bot)",
    intro: "Links that open your own page first: cover, photo links and countdown.",
    new: "New template page",
    newHref: "/dashboard/links/new",
    emptyTitle: "Create your first template page",
    empty: "Design a page with your cover, photo links and a countdown. Share one link anywhere.",
  },
  classic: {
    title: "Deeplinks",
    intro: "Short links with an optional 18+ warning page.",
    new: "New deep link",
    newHref: "/dashboard/deeplinks/new",
    emptyTitle: "Create your first deep link",
    empty: "Share one short link anywhere. Visitors see an 18+ warning page in the design you pick, then continue to your destination.",
  },
} as const;

/** True when a link shows its own page first (Template). */
export const isTemplateLink = (l: { landingPage: unknown }) => !!parseLanding(l.landingPage)?.enabled;

const fmt = new Intl.NumberFormat("en-US");

/** Deep links of one kind: template pages ("Customize template") or classic deep links ("Deeplinks"). */
export async function LinksList({ mode }: { mode: LinkMode }) {
  const c = COPY[mode];
  const { userId } = await requirePage();
  const plan = await getPlan(userId);
  const limits = PLAN_LIMITS[plan];
  const all = await db.smartLink.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { domain: { select: { hostname: true } } } });
  // Plan limits count every deep link (both kinds), oldest first.
  const limitIndex = new Map(all.map((l, i) => [l.id, i]));
  const links = all.filter((l) => isTemplateLink(l) === (mode === "template"));
  const stats = await getSmartLinkStats(links.map((l) => l.id));
  const count = (id: string, kind: string) => stats.find((s) => s.linkId === id && s.kind === kind)?._count._all ?? 0;
  const atLimit = all.length >= limits.maxSmartLinks;
  const locked = mode === "template" && !limits.templatePages;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{c.title}</h1>
          <p className="text-sm text-muted-foreground">
            {c.intro} {all.length} / {limits.maxSmartLinks} deep links used.
          </p>
        </div>
        {locked ? null : atLimit ? (
          <Link href="/dashboard/billing" className={buttonVariants({ variant: "outline" })}>
            Upgrade for more links
          </Link>
        ) : (
          <Link href={c.newHref} className={buttonVariants()}>
            <Plus /> {c.new}
          </Link>
        )}
      </div>

      {locked ? <TemplateUpsell /> : null}
      {locked && links.length === 0 ? null : links.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ShieldAlert className="size-8 text-[var(--persimmon-text)]" aria-hidden />
            <p className="font-semibold">{c.emptyTitle}</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {c.empty}
            </p>
            <Link href={c.newHref} className={buttonVariants()}>
              <Plus /> {c.new}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Link</th>
                  <th className="py-2 pr-4 font-medium">{mode === "template" ? "Page" : "Warning"}</th>
                  {mode === "template" ? (
                    <>
                      <th className="py-2 pr-4 text-right font-medium">Visits</th>
                      <th className="py-2 pr-4 text-right font-medium">Opened Step 2</th>
                      <th className="py-2 pr-4 text-right font-medium">Link taps</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 pr-4 text-right font-medium">Warning views</th>
                      <th className="py-2 pr-4 text-right font-medium">Confirmed</th>
                      <th className="py-2 pr-4 text-right font-medium">Visits</th>
                    </>
                  )}
                  <th className="py-2 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => {
                  const views = count(l.id, "view");
                  const confirms = count(l.id, "confirm");
                  const visits = count(l.id, "redirect");
                  const overLimit = (limitIndex.get(l.id) ?? 0) >= limits.maxSmartLinks;
                  return (
                    <tr key={l.id} className="border-b align-top last:border-0">
                      <td className="max-w-[300px] py-3 pr-4">
                        <Link href={editLinkPath(l, l.domain)} className="font-medium hover:underline">
                          {smartLinkUrl(l.slug, l.domain, appUrl, l.atRoot).replace(/^https?:\/\//, "")}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">{l.label || l.destinationUrl}</div>
                        {!l.enabled ? <div className="text-xs text-muted-foreground">Paused</div> : null}
                        {overLimit ? <div className="text-xs text-destructive">Inactive: over your plan&apos;s limit</div> : null}
                      </td>
                      <td className="py-3 pr-4">
                        {mode === "template" ? (
                          <span className="text-primary">Template · {parseLanding(l.landingPage)?.sections.length ?? 0} sections</span>
                        ) : l.adultWarning ? (
                          <span className="text-[var(--persimmon-text)]">18+ · {getWarningTemplate(l.warningTemplate).name}</span>
                        ) : (
                          <span className="text-muted-foreground">Off</span>
                        )}
                      </td>
                      {mode === "template" ? (
                        <>
                          <td className="py-3 pr-4 text-right tabular-nums">{fmt.format(count(l.id, "hit"))}</td>
                          <td className="py-3 pr-4 text-right tabular-nums">{fmt.format(count(l.id, "step2"))}</td>
                          <td className="py-3 pr-4 text-right tabular-nums">{fmt.format(count(l.id, "tap"))}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 pr-4 text-right tabular-nums">{l.adultWarning ? fmt.format(views) : "—"}</td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {l.adultWarning && views ? `${Math.round((Math.min(confirms, views) / views) * 100)}%` : "—"}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">{fmt.format(visits)}</td>
                        </>
                      )}
                      <td className="py-3 text-right">
                        <LinkRowActions id={l.id} slug={l.slug} url={smartLinkUrl(l.slug, l.domain, appUrl, l.atRoot)} editHref={editLinkPath(l, l.domain)} enabled={l.enabled} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">Last 30 days. Bots are filtered out.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
