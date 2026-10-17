import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { CountryFlag } from "@/components/country-flag";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appUrl } from "@/config/brand";
import { countryName } from "@/lib/analytics/global";
import { getLinkAnalytics, parseRange, RANGES, type RangeKey } from "@/lib/analytics/queries";
import { db } from "@/lib/db";
import { smartLinkUrl } from "@/lib/domains";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requirePage } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BreakdownCard, StatCard, ViewsClicksChart } from "../../charts";

export const instant = false;
export const metadata: Metadata = { title: "Deep link analytics" };

const fmt = new Intl.NumberFormat("en-US");
const OS_LABELS: Record<string, string> = { ios: "iOS", android: "Android", windows: "Windows", macos: "macOS", linux: "Linux", other: "Other", unknown: "Unknown" };

export default async function LinkAnalyticsPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ range?: string }> }) {
  const { userId } = await requirePage();
  const { id } = await props.params;
  const link = await db.smartLink.findFirst({ where: { id, userId }, include: { domain: { select: { hostname: true } } } });
  if (!link) notFound();
  const plan = await getPlan(userId);
  const r = parseRange((await props.searchParams).range, plan);
  const data = await getLinkAnalytics(link.id, r.days, plan);
  const url = smartLinkUrl(link.slug, link.domain, appUrl, link.atRoot).replace(/^https?:\/\//, "");
  const delta = data.previousVisits ? (data.totals.visits - data.previousVisits) / data.previousVisits : null;
  const rate = (n: number, d: number) => (d ? `${Math.round((Math.min(n, d) / d) * 100)}%` : "—");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard/links" className="text-sm text-muted-foreground hover:text-foreground">
            ← Deep links
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">{url} · Bots are filtered out. Times are in UTC.</p>
        </div>
        <nav className="flex rounded-lg border bg-card p-0.5" aria-label="Date range">
          {(Object.keys(RANGES) as RangeKey[]).map((k) =>
            RANGES[k] > PLAN_LIMITS[plan].analyticsDays ? (
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
            ),
          )}
        </nav>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Visits" value={fmt.format(data.totals.visits)} delta={delta} />
        <StatCard label="Visitors" hint="Unique" value={fmt.format(data.totals.visitors)} delta={null} />
        <StatCard label="Sent to destination" value={fmt.format(data.totals.redirects)} delta={null} hint={rate(data.totals.redirects, data.totals.visits)} />
        <StatCard
          label={link.adultWarning ? "Confirmed 18+" : "Left"}
          value={fmt.format(link.adultWarning ? data.totals.confirms : data.totals.leaves)}
          delta={null}
          hint={link.adultWarning ? `${rate(data.totals.confirms, data.totals.warningViews)} of ${fmt.format(data.totals.warningViews)} warning views` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visits and redirects</CardTitle>
          <CardDescription>Last {data.days} days</CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsClicksChart data={data.series} labels={{ views: "Visits", clicks: "Sent to destination" }} />
        </CardContent>
      </Card>

      {data.breakdowns ? (
        <div className="grid gap-4 lg:grid-cols-2">
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
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Lock className="size-6 text-muted-foreground" />
            <p className="font-semibold">Countries and devices are part of Pro.</p>
            <Link href="/dashboard/billing" className={buttonVariants()}>
              Upgrade to Pro
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
