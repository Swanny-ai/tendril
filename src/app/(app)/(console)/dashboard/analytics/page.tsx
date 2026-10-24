import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOverview, getSources, type Source } from "@/lib/analytics/global";
import { getAnalytics, getLinkAnalytics, parseRange, RANGES, type RangeKey } from "@/lib/analytics/queries";
import { db } from "@/lib/db";
import { PLAN_LIMITS, type PlanName } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireAccount } from "@/lib/session";
import { cn } from "@/lib/utils";
import { StatCard, ViewsClicksChart } from "./charts";
import { parseLanding } from "@/lib/link-landing";
import { BreakdownGrid, delta, fmt, LinkReport, pct, UpgradeCard } from "./report";

export const instant = false;
export const metadata: Metadata = { title: "Analytics" };

const pill = (active: boolean) =>
  cn("rounded-full border px-3 py-1 text-sm", active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground");

export default async function AnalyticsPage(props: PageProps<"/dashboard/analytics">) {
  const { userId } = await requireAccount();
  const [plan, sources] = await Promise.all([getPlan(userId), getSources(userId)]);
  const { range, source: sourceParam, page: pageParam } = await props.searchParams;
  const r = parseRange(range, plan);
  // ?source=<page or deep link id> narrows to one of them (?page= is the older name); default: everything.
  const selected = sources.find((s) => s.id === (sourceParam ?? pageParam)) ?? null;
  const href = (source: string | null, rangeKey: RangeKey) => `?${new URLSearchParams(source ? { source, range: rangeKey } : { range: rangeKey })}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {selected ? selected.url : "All bio pages and deep links"} · Bots are filtered out. Times are in UTC.
          </p>
          {sources.length > 1 ? (
            <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Source">
              <Link href={href(null, r.key)} aria-current={selected ? undefined : "page"} className={pill(!selected)}>
                All
              </Link>
              {sources.map((s) => (
                <Link key={s.id} href={href(s.id, r.key)} aria-current={s.id === selected?.id ? "page" : undefined} className={pill(s.id === selected?.id)}>
                  {s.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <nav className="flex rounded-lg border bg-card p-0.5" aria-label="Date range">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => {
            const locked = RANGES[k] > PLAN_LIMITS[plan].analyticsDays;
            return locked ? (
              <span key={k} aria-disabled="true" className="flex cursor-not-allowed items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground" title="Pro feature">
                {k} <Lock className="size-3" />
              </span>
            ) : (
              <Link
                key={k}
                href={href(selected?.id ?? null, k)}
                aria-current={r.key === k ? "page" : undefined}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium", r.key === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {k}
              </Link>
            );
          })}
        </nav>
      </div>

      {!selected ? (
        <AllReport userId={userId} sources={sources} days={r.days} plan={plan} rangeKey={r.key} href={href} />
      ) : selected.kind === "page" ? (
        <PageReport pageId={selected.id} days={r.days} plan={plan} />
      ) : (
        <DeepLinkReport linkId={selected.id} days={r.days} plan={plan} />
      )}
    </div>
  );
}

async function AllReport({
  userId,
  sources,
  days,
  plan,
  rangeKey,
  href,
}: {
  userId: string;
  sources: Source[];
  days: number;
  plan: PlanName;
  rangeKey: RangeKey;
  href: (source: string | null, rangeKey: RangeKey) => string;
}) {
  const data = await getOverview(userId, sources, days, plan);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Views" value={fmt.format(data.totals.views)} delta={delta(data.totals.views, data.previous.views)} />
        <StatCard label="Visitors" hint="Unique per day" value={fmt.format(data.totals.visitors)} delta={delta(data.totals.visitors, data.previous.visitors)} />
        <StatCard label="Clicks" value={fmt.format(data.totals.clicks)} delta={delta(data.totals.clicks, data.previous.clicks)} />
        <StatCard label="Click-through rate" value={pct(data.totals.ctr)} delta={delta(data.totals.ctr, data.previous.ctr)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Views and clicks</CardTitle>
          <CardDescription>Last {data.days} days · Clicks are link clicks on your bio pages plus deep-link visitors sent to the destination.</CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsClicksChart data={data.series} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bio pages and deep links</CardTitle>
          <CardDescription>Views and clicks for each one. Pick one for its full report.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bio pages or deep links yet.</p>
          ) : (
            <table className="w-full text-sm" data-testid="all-sources">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 text-right font-medium">Views</th>
                  <th className="py-2 pr-4 text-right font-medium">Clicks</th>
                  <th className="py-2 text-right font-medium">CTR</th>
                </tr>
              </thead>
              <tbody>
                {data.top.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="max-w-[320px] truncate py-2.5 pr-4 font-medium">
                      <Link href={href(s.id, rangeKey)} className="hover:underline">
                        {s.kind === "page" ? s.label.replace(/ \(bio page\)$/, "") : s.label}
                      </Link>
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{s.url}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{s.kind === "page" ? "Bio page" : "Deep link"}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{fmt.format(s.views)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{fmt.format(s.clicks)}</td>
                    <td className="py-2.5 text-right tabular-nums">{pct(s.ctr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {data.breakdowns ? <BreakdownGrid data={data.breakdowns} note=" · bio pages" /> : <UpgradeCard />}
    </>
  );
}

async function PageReport({ pageId, days, plan }: { pageId: string; days: number; plan: PlanName }) {
  const data = await getAnalytics(pageId, days, plan);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Views" value={fmt.format(data.totals.views)} delta={delta(data.totals.views, data.previous.views)} />
        <StatCard label="Visitors" hint="Unique per day" value={fmt.format(data.totals.visitors)} delta={delta(data.totals.visitors, data.previous.visitors)} />
        <StatCard label="Clicks" value={fmt.format(data.totals.clicks)} delta={delta(data.totals.clicks, data.previous.clicks)} />
        <StatCard label="Click-through rate" value={pct(data.totals.ctr)} delta={delta(data.totals.ctr, data.previous.ctr)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Views and clicks</CardTitle>
          <CardDescription>Last {data.days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsClicksChart data={data.series} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
          <CardDescription>Clicks per link. CTR is clicks divided by page views.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.topLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No links yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-4 font-medium">Link</th>
                  <th className="py-2 pr-4 text-right font-medium">Clicks</th>
                  <th className="py-2 pr-4 text-right font-medium">CTR</th>
                  <th className="py-2 text-right font-medium">Warning pass-through</th>
                </tr>
              </thead>
              <tbody>
                {data.topLinks.map((l) => (
                  <tr key={l.blockId} className="border-b last:border-0">
                    <td className="max-w-[320px] truncate py-2.5 pr-4 font-medium">
                      {l.warning ? <ShieldAlert className="mr-1.5 inline size-3.5 text-[var(--persimmon)]" aria-label="Content warning" /> : null}
                      {l.title}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{fmt.format(l.clicks)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{pct(l.ctr)}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {l.passRate === null ? "—" : `${pct(l.passRate)} of ${fmt.format(l.warningViews)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {data.breakdowns ? <BreakdownGrid data={data.breakdowns} /> : <UpgradeCard />}
    </>
  );
}

async function DeepLinkReport({ linkId, days, plan }: { linkId: string; days: number; plan: PlanName }) {
  const [link, data] = await Promise.all([db.smartLink.findUnique({ where: { id: linkId }, select: { adultWarning: true, landingPage: true } }), getLinkAnalytics(linkId, days, plan)]);
  return <LinkReport data={data} adultWarning={link?.adultWarning ?? false} twoSteps={!!parseLanding(link?.landingPage)?.enabled} />;
}
