import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requirePage } from "@/lib/session";
import { getSmartLinkStats } from "@/lib/smart-links";
import { getWarningTemplate } from "@/warning-templates/templates";
import { LinkRowActions } from "./row-actions";

export const instant = false;
export const metadata: Metadata = { title: "Smart links" };

const fmt = new Intl.NumberFormat("en-US");

export default async function SmartLinksPage() {
  const { userId } = await requirePage();
  const plan = await getPlan(userId);
  const limits = PLAN_LIMITS[plan];
  const links = await db.smartLink.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const stats = await getSmartLinkStats(links.map((l) => l.id));
  const count = (id: string, kind: string) => stats.find((s) => s.linkId === id && s.kind === kind)?._count._all ?? 0;
  const atLimit = links.length >= limits.maxSmartLinks;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Smart links</h1>
          <p className="text-sm text-muted-foreground">
            Short links with an optional 18+ warning page. {links.length} / {limits.maxSmartLinks} used.
          </p>
        </div>
        {atLimit ? (
          <Link href="/dashboard/billing" className={buttonVariants({ variant: "outline" })}>
            Upgrade for more links
          </Link>
        ) : (
          <Link href="/dashboard/links/new" className={buttonVariants()}>
            <Plus /> New smart link
          </Link>
        )}
      </div>

      {links.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ShieldAlert className="size-8 text-[var(--persimmon-text)]" aria-hidden />
            <p className="font-semibold">Create your first smart link</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Share one short link anywhere. Visitors see an 18+ warning page in the design you pick, then continue to your destination.
            </p>
            <Link href="/dashboard/links/new" className={buttonVariants()}>
              <Plus /> New smart link
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
                  <th className="py-2 pr-4 font-medium">Warning</th>
                  <th className="py-2 pr-4 text-right font-medium">Warning views</th>
                  <th className="py-2 pr-4 text-right font-medium">Confirmed</th>
                  <th className="py-2 pr-4 text-right font-medium">Visits</th>
                  <th className="py-2 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {links.map((l, i) => {
                  const views = count(l.id, "view");
                  const confirms = count(l.id, "confirm");
                  const visits = count(l.id, "redirect");
                  const overLimit = i >= limits.maxSmartLinks;
                  return (
                    <tr key={l.id} className="border-b align-top last:border-0">
                      <td className="max-w-[300px] py-3 pr-4">
                        <Link href={`/dashboard/links/${l.id}`} className="font-medium hover:underline">
                          /l/{l.slug}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">{l.label || l.destinationUrl}</div>
                        {!l.enabled ? <div className="text-xs text-muted-foreground">Paused</div> : null}
                        {overLimit ? <div className="text-xs text-destructive">Inactive: over your plan&apos;s limit</div> : null}
                      </td>
                      <td className="py-3 pr-4">
                        {l.adultWarning ? (
                          <span className="text-[var(--persimmon-text)]">18+ · {getWarningTemplate(l.warningTemplate).name}</span>
                        ) : (
                          <span className="text-muted-foreground">Off</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">{l.adultWarning ? fmt.format(views) : "—"}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {l.adultWarning && views ? `${Math.round((Math.min(confirms, views) / views) * 100)}%` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">{fmt.format(visits)}</td>
                      <td className="py-3 text-right">
                        <LinkRowActions id={l.id} url={`${appUrl}/l/${l.slug}`} enabled={l.enabled} />
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
