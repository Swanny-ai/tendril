import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ShieldAlert } from "lucide-react";
import { CountryFlag } from "@/components/country-flag";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalytics, parseRange, RANGES, type RangeKey } from "@/lib/analytics/queries";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requirePage } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BarList, StatCard, ViewsClicksChart } from "./charts";

export const instant = false;
export const metadata: Metadata = { title: "Analytics" };

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmt = new Intl.NumberFormat("en-US");
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string) => {
  try {
    return /^[A-Z]{2}$/.test(code) ? (regionNames.of(code) ?? code) : "Unknown";
  } catch {
    return code;
  }
};
const SOURCE_LABELS: Record<string, string> = { social: "Social apps", search: "Search", web: "Other websites", direct: "Direct" };
const OS_LABELS: Record<string, string> = { ios: "iOS", android: "Android", windows: "Windows", macos: "macOS", linux: "Linux", other: "Other", unknown: "Unknown" };

export default async function AnalyticsPage(props: PageProps<"/dashboard/analytics">) {
  const { userId, page } = await requirePage();
  const plan = await getPlan(userId);
  const { range } = await props.searchParams;
  const r = parseRange(range, plan);
  const data = await getAnalytics(page.id, r.days, plan);
  const delta = (cur: number, prev: number) => (prev ? (cur - prev) / prev : null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Bots are filtered out. Times are in UTC.</p>
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
                href={`?range=${k}`}
                aria-current={r.key === k ? "page" : undefined}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium", r.key === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {k}
              </Link>
            );
          })}
        </nav>
      </div>

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

      {data.breakdowns ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownCard title="Traffic sources" items={data.breakdowns.sources.map((s) => ({ label: SOURCE_LABELS[s.key] ?? s.key, value: s.count }))} />
          <BreakdownCard title="Top referrers" items={data.breakdowns.referrers.map((s) => ({ label: s.label, value: s.count }))} />
          <BreakdownCard title="Countries" items={data.breakdowns.countries.map((c) => ({ label: countryName(c.code), icon: <CountryFlag code={c.code} />, value: c.count }))} />
          <BreakdownCard
            title="Devices"
            items={[
              ...data.breakdowns.devices.map((d) => ({ label: d.key[0].toUpperCase() + d.key.slice(1), value: d.count })),
              ...data.breakdowns.os.map((o) => ({ label: `· ${OS_LABELS[o.key] ?? o.key}`, value: o.count, muted: true })),
            ]}
          />
        </div>
      ) : (
        <Card className="relative overflow-hidden">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Lock className="size-6 text-muted-foreground" />
            <div>
              <p className="font-semibold">See where your visitors come from</p>
              <p className="text-sm text-muted-foreground">Referrers, countries, devices and up to a year of history are part of Pro.</p>
            </div>
            <Link href="/dashboard/billing" className={buttonVariants()}>
              Upgrade to Pro
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BreakdownCard({ title, items }: { title: string; items: { label: string; value: number; muted?: boolean; icon?: React.ReactNode }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{items.length ? <BarList items={items} /> : <p className="text-sm text-muted-foreground">No data in this range.</p>}</CardContent>
    </Card>
  );
}
