import type { Metadata } from "next";
import Link from "next/link";
import { LayoutTemplate, Link2, Plus, Unlink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appUrl } from "@/config/brand";
import { db } from "@/lib/db";
import { smartLinkUrl } from "@/lib/domains";
import { editLinkPath, editPagePath } from "@/lib/edit-paths";
import { parseLanding } from "@/lib/link-landing";
import { pageUrl } from "@/lib/link-targets";
import { requireAccount } from "@/lib/session";
import { getPageStats, getReachedByLink, getSmartLinkStats } from "@/lib/smart-links";
import { cn } from "@/lib/utils";
import { MyLinkActions } from "./link-actions";

export const instant = false;
export const metadata: Metadata = { title: "My links" };

type Kind = "two-steps" | "deeplink" | "page";
const KIND = {
  "two-steps": { label: "Two-Steps", icon: Unlink, tone: "bg-primary/15 text-primary" },
  deeplink: { label: "Deeplink", icon: Link2, tone: "bg-sky-500/15 text-sky-400" },
  page: { label: "Bio page", icon: LayoutTemplate, tone: "bg-[var(--persimmon)]/15 text-[var(--persimmon-text)]" },
} as const;

const fmt = new Intl.NumberFormat("en-US");
const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** Every link the creator has, in one place: bio pages, Two-Steps and Deeplinks. */
export default async function MyLinksPage() {
  const { userId } = await requireAccount();
  const [pages, links] = await Promise.all([
    db.page.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { domain: { select: { hostname: true } } } }),
    db.smartLink.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { domain: { select: { hostname: true } } } }),
  ]);
  const linkIds = links.map((l) => l.id);
  const pageIds = pages.map((p) => p.id);
  const [reached, linkStats, pageStats] = await Promise.all([getReachedByLink(linkIds), getSmartLinkStats(linkIds), getPageStats(pageIds)]);
  const linkVisits = (id: string) => linkStats.find((s) => s.linkId === id && s.kind === "hit")?._count._all ?? 0;

  const rows: { id: string; kind: Kind; name: string; note: string; url: string; on: boolean; editHref: string; visits: number; reached: number }[] = [
    ...links.map((l) => ({
      id: l.id,
      kind: (parseLanding(l.landingPage)?.enabled ? "two-steps" : "deeplink") as Kind,
      name: bare(smartLinkUrl(l.slug, l.domain, appUrl, l.atRoot)),
      note: l.label,
      url: smartLinkUrl(l.slug, l.domain, appUrl, l.atRoot),
      on: l.enabled,
      editHref: editLinkPath(l, l.domain),
      visits: linkVisits(l.id),
      reached: reached.get(l.id) ?? 0,
    })),
    ...pages.map((p) => ({
      id: p.id,
      kind: "page" as Kind,
      name: bare(pageUrl(p, p.domain, appUrl)),
      note: p.displayName || `@${p.username}`,
      url: pageUrl(p, p.domain, appUrl),
      on: p.published,
      editHref: editPagePath(p, p.domain),
      visits: pageStats.get(p.id)?.visits ?? 0,
      reached: pageStats.get(p.id)?.reached ?? 0,
    })),
  ];
  const counts = { "two-steps": 0, deeplink: 0, page: 0 } as Record<Kind, number>;
  for (const r of rows) counts[r.kind]++;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My links</h1>
          <p className="text-sm text-muted-foreground">
            All your links in one place: {counts["two-steps"]} Two-Steps · {counts.deeplink} Deeplink{counts.deeplink === 1 ? "" : "s"} · {counts.page} bio page
            {counts.page === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/links/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Plus /> Two-Steps
          </Link>
          <Link href="/dashboard/deeplinks/new" className={buttonVariants({ size: "sm" })}>
            <Plus /> Deeplink
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Link2 className="size-8 text-primary" aria-hidden />
            <p className="font-semibold">No links yet</p>
            <p className="max-w-md text-sm text-muted-foreground">Create a Two-Steps page or a Deeplink, and it shows up here.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Link</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 text-right font-medium" title="Visits in the last 30 days">
                    Visits
                  </th>
                  <th className="py-2 pr-4 text-right font-medium" title="People who went on to your link in the last 30 days (each counted once a day)">
                    Reached
                  </th>
                  <th className="py-2 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const k = KIND[r.kind];
                  return (
                    <tr key={r.id} className="border-b align-middle last:border-0">
                      <td className="max-w-[320px] py-3 pr-4">
                        <Link href={r.editHref} className="block truncate font-medium hover:underline">
                          {r.name}
                        </Link>
                        {r.note ? <div className="truncate text-xs text-muted-foreground">{r.note}</div> : null}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", k.tone)}>
                          <k.icon className="size-3.5" aria-hidden /> {k.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs", r.on ? "text-foreground" : "text-muted-foreground")}>
                          <span className={cn("size-2 rounded-full", r.on ? "bg-primary" : "bg-muted-foreground/40")} aria-hidden />
                          {r.on ? (r.kind === "page" ? "Live" : "Active") : r.kind === "page" ? "Offline" : "Paused"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">{fmt.format(r.visits)}</td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums text-primary">{fmt.format(r.reached)}</td>
                      <td className="py-3">
                        <MyLinkActions
                          id={r.id}
                          kind={r.kind === "page" ? "page" : "link"}
                          on={r.on}
                          url={r.url}
                          editHref={r.editHref}
                          analyticsHref={`/dashboard/analytics?source=${r.id}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Last 30 days, bots filtered out. Reached: people who went on to your link, each counted once a day. The switch turns a link or page on and off.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
