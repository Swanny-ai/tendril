import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BarChart3, Eye, Globe2, Link2, Lock, TrendingDown, TrendingUp } from "lucide-react";
import { CountryFlag } from "@/components/country-flag";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { countryName, getGlobalStats, getLiveStats, getSources } from "@/lib/analytics/global";
import { isValidTimeZone, resolveRange, TIMEZONE_OPTIONS } from "@/lib/analytics/ranges";
import { PLAN_LIMITS } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requirePage } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AutoRefresh } from "./auto-refresh";
import { DashboardToolbar } from "./dashboard-toolbar";
import { LiveNumber } from "./live-number";
import { LivePanels } from "./live-panels";
import { PerformanceChart } from "./performance-chart";
import { WorldMap } from "./world-map";

export const instant = false;

export const metadata: Metadata = { title: "Global dashboard" };

const fmt = new Intl.NumberFormat("en-US");
const fmt1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const MEDALS = ["🥇", "🥈", "🥉"];

function Kpi({ icon: Icon, label, value, note, tone }: { icon: typeof Eye; label: string; value: React.ReactNode; note: React.ReactNode; tone?: "up" | "down" }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-1">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="size-4" /> {label}
        </p>
        <p className="font-heading text-3xl font-semibold tabular-nums">{value}</p>
        <p className={cn("flex items-center gap-1 text-xs", tone === "up" ? "font-medium text-[var(--sage-text)]" : tone === "down" ? "font-medium text-destructive" : "text-muted-foreground")}>
          {note}
        </p>
      </CardContent>
    </Card>
  );
}

function ProLock({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <Lock className="size-5 text-muted-foreground" />
      <p className="max-w-xs text-sm text-muted-foreground">{what} are part of Tendril Pro.</p>
      <Link href="/dashboard/billing" className={buttonVariants({ size: "sm" })}>
        Upgrade to Pro
      </Link>
    </div>
  );
}

export default async function GlobalDashboardPage(props: PageProps<"/dashboard">) {
  const { userId } = await requirePage();
  const q = await props.searchParams;
  const plan = await getPlan(userId);
  const limits = PLAN_LIMITS[plan];
  const tzParam = typeof q.tz === "string" && isValidTimeZone(q.tz) ? q.tz : null;
  const tz = tzParam ?? "UTC";
  const now = new Date();
  const range = resolveRange({ range: q.range, from: q.from, to: q.to }, tz, now, limits.analyticsDays);
  const owner = { userId };
  const sources = await getSources(userId);
  const [stats, live] = await Promise.all([getGlobalStats(owner, sources, range, tz, limits.breakdowns), getLiveStats(owner, sources, limits.breakdowns)]);
  const { totals } = stats;
  const tzLabel = TIMEZONE_OPTIONS.find((o) => o.tz === tz)?.label ?? tz;
  const countries = stats.countries?.filter((c) => c.code !== "??") ?? [];
  const countryTotal = stats.countries?.reduce((s, c) => s + c.views, 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Global dashboard</h1>
          <p className="text-muted-foreground">
            Every view across your bio page and deep links · {range.label}
            {range.clamped ? ` (limited to the last ${limits.analyticsDays} days on the Free plan)` : ""}
          </p>
        </div>
        <DashboardToolbar
          range={range.key}
          rangeLabel={range.label}
          from={typeof q.from === "string" ? q.from : undefined}
          to={typeof q.to === "string" ? q.to : undefined}
          tz={tzParam}
          maxDays={limits.analyticsDays}
        />
      </div>

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Eye} label="Total views" value={<LiveNumber value={totals.views} text={fmt.format(totals.views)} />} note={`${fmt.format(totals.visitors)} unique visitors`} />
        <Kpi icon={Link2} label="Active links" value={<LiveNumber value={totals.activeSources} text={fmt.format(totals.activeSources)} />} note={`of ${totals.totalSources} with at least one view`} />
        <Kpi icon={BarChart3} label="Avg views per link" value={<LiveNumber value={totals.avgPerSource} text={fmt1.format(totals.avgPerSource)} />} note="Across links with views" />
        <Kpi
          icon={Activity}
          label="Growth"
          value={totals.growth === null ? "New" : `${totals.growth >= 0 ? "+" : ""}${Math.round(totals.growth * 100)}%`}
          tone={totals.growth === null || totals.growth >= 0 ? "up" : "down"}
          note={
            <>
              {totals.growth !== null && totals.growth < 0 ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
              vs previous period ({fmt.format(totals.previousViews)} views)
            </>
          }
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance overview</CardTitle>
            <CardDescription>Views {range.bucket === "hour" ? "per hour" : "per day"}</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceChart series={stats.series} bucket={range.bucket} tzLabel={tzLabel} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top performers</CardTitle>
            <CardDescription>Most viewed links in this range</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.top.length ? (
              <ol className="space-y-2" data-testid="top-performers">
                {stats.top.slice(0, 8).map((s, i) => {
                  const share = totals.views ? s.views / totals.views : 0;
                  return (
                    <li key={s.id} className="relative overflow-hidden rounded-md px-2.5 py-2 text-sm">
                      <span aria-hidden className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${share * 100}%` }} />
                      <span className="relative flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-6 shrink-0 text-center" aria-label={`Rank ${i + 1}`}>
                            {MEDALS[i] ?? <span className="text-xs text-muted-foreground">{i + 1}</span>}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{s.label}</span>
                            <span className="block truncate text-xs text-muted-foreground">{s.path}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          <LiveNumber value={s.views} text={fmt.format(s.views)} />
                          <span className="block text-xs text-muted-foreground">{Math.round(share * 100)}%</span>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No views in this range yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <LivePanels
        initial={live}
        geo={limits.breakdowns}
        map={
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe2 className="size-4" /> Geographic distribution
                </CardTitle>
                <CardDescription>Hover a country to see its views for this range</CardDescription>
                {stats.countries ? (
                  <CardAction className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground" data-testid="geo-totals">
                    <span>
                      Countries: <LiveNumber value={countries.length} text={fmt.format(countries.length)} className="font-semibold text-foreground" />
                    </span>
                    <span>
                      Total views: <LiveNumber value={countryTotal} text={fmt.format(countryTotal)} className="font-semibold text-foreground" />
                    </span>
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-center">{stats.countries ? <WorldMap data={countries} /> : <ProLock what="Country maps" />}</CardContent>
            </Card>
        }
        countries={
            <Card>
              <CardHeader>
                <CardTitle>Top countries</CardTitle>
                <CardDescription>Share of views in this range</CardDescription>
              </CardHeader>
              <CardContent>
                {!stats.countries ? (
                  <ProLock what="Country breakdowns" />
                ) : stats.countries.length ? (
                  <ul className="space-y-2" data-testid="top-countries">
                    {stats.countries.slice(0, 10).map((c) => {
                      const share = countryTotal ? c.views / countryTotal : 0;
                      return (
                        <li key={c.code} className="text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2">
                              <CountryFlag code={c.code} />
                              <span className="truncate">{c.code === "??" ? "Unknown" : countryName(c.code)}</span>
                              {c.code === "??" ? null : <span className="rounded bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground">{c.code}</span>}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              <LiveNumber value={c.views} text={fmt.format(c.views)} /> <span className="text-xs text-muted-foreground">{(share * 100).toFixed(1)}%</span>
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-muted">
                            <div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${share * 100}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No views in this range yet.</p>
                )}
              </CardContent>
            </Card>
        }
      />
      {/* Ranges that end now keep updating in the background; past ranges can't change. */}
      <AutoRefresh enabled={range.to.getTime() > now.getTime() - 120_000} />
    </div>
  );
}
