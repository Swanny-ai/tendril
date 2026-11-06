import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ShieldAlert } from "lucide-react";
import { DateRangePicker } from "./date-range-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOverview, getSources, type Source } from "@/lib/analytics/global";
import { customWindow, dayWindow, getAnalytics, getLinkAnalytics, parseRange, RANGES, type DayWindow, type RangeKey } from "@/lib/analytics/queries";
import { db } from "@/lib/db";
import { PLAN_LIMITS, type PlanName } from "@/lib/plan-rules";
import { getPlan } from "@/lib/plans";
import { requireAccount } from "@/lib/session";
import { cn } from "@/lib/utils";
import { StatCard, ViewsClicksChart } from "./charts";
import { parseLanding } from "@/lib/link-landing";
import { BreakdownGrid, delta, fmt, LinkReport, pct, periodText, UpgradeCard } from "./report";

export const instant = false;
export const metadata: Metadata = { title: "Analytics" };

const pill = (active: boolean, deleted = false) =>
  cn(
    "rounded-full border px-3 py-1 text-sm",
    active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
    deleted && !active && "border-dashed opacity-70",
  );

/** A source's name without its "(bio page)" / "(deleted)" suffixes, for tables that show the type separately. */
const plainName = (s: Source) => s.label.replace(/ \(deleted\)$/, "").replace(/ \(bio page\)$/, "");

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const shortDay = (d: string, year: boolean) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
/** "Nov 1 – Nov 6, 2026" for the calendar button. */
const customLabel = (from: string, to: string) =>
  from === to ? shortDay(from, true) : `${shortDay(from, from.slice(0, 4) !== to.slice(0, 4))} – ${shortDay(to, true)}`;

/** The date range in the address: a preset (?range=7d) or two calendar days (?from=…&to=…). */
type RangeQuery = { range: RangeKey } | { from: string; to: string };

export default async function AnalyticsPage(props: PageProps<"/dashboard/analytics">) {
  const { userId } = await requireAccount();
  const [plan, sources] = await Promise.all([getPlan(userId), getSources(userId)]);
  const { range, from, to, source: sourceParam, page: pageParam } = await props.searchParams;
  const r = parseRange(range, plan);
  // ?from=YYYY-MM-DD&to=YYYY-MM-DD picks any days (within the plan's history); otherwise a preset.
  const custom = customWindow(from, to, plan);
  const win: DayWindow = custom ?? dayWindow(r.days);
  const current: RangeQuery = custom ? { from: isoDay(custom.from), to: isoDay(new Date(custom.from.getTime() + (custom.days - 1) * 86_400_000)) } : { range: r.key };
  // ?source=<page or deep link id> narrows to one of them (?page= is the older name); default: everything.
  const selected = sources.find((s) => s.id === (sourceParam ?? pageParam)) ?? null;
  const href = (source: string | null, q: RangeQuery = current) => `?${new URLSearchParams({ ...(source ? { source } : {}), ...q })}`;
  const oldest = isoDay(dayWindow(PLAN_LIMITS[plan].analyticsDays).from);
  const today = isoDay(new Date());

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
              <Link href={href(null)} aria-current={selected ? undefined : "page"} className={pill(!selected)}>
                All
              </Link>
              {sources.map((s) => (
                <Link key={s.id} href={href(s.id)} aria-current={s.id === selected?.id ? "page" : undefined} className={pill(s.id === selected?.id, s.deleted)}>
                  {s.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex rounded-lg border bg-card p-0.5" aria-label="Date range">
            {(Object.keys(RANGES) as RangeKey[]).map((k) => {
              const locked = RANGES[k] > PLAN_LIMITS[plan].analyticsDays;
              const on = !custom && r.key === k;
              return locked ? (
                <span key={k} aria-disabled="true" className="flex cursor-not-allowed items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground" title="Pro feature">
                  {k} <Lock className="size-3" />
                </span>
              ) : (
                <Link
                  key={k}
                  href={href(selected?.id ?? null, { range: k })}
                  aria-current={on ? "page" : undefined}
                  className={cn("rounded-md px-3 py-1.5 text-sm font-medium", on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {k}
                </Link>
              );
            })}
          </nav>
          {/* Any two days: a two-month calendar, within the plan's history. */}
          <DateRangePicker
            label={"from" in current ? customLabel(current.from, current.to) : `Last ${r.days} days`}
            from={"from" in current ? current.from : isoDay(win.from)}
            to={"to" in current ? current.to : today}
            oldest={oldest}
            today={today}
            source={selected?.id ?? null}
            active={!!custom}
          />
        </div>
      </div>

      {selected?.deleted ? (
        <p className="rounded-lg border border-dashed bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
          This {selected.kind === "page" ? "bio page" : "link"} was deleted. Its stats are kept here and still count in your totals.
        </p>
      ) : null}

      {!selected ? (
        <AllReport userId={userId} sources={sources} win={win} plan={plan} href={href} />
      ) : selected.kind === "page" ? (
        <PageReport pageId={selected.id} win={win} plan={plan} />
      ) : (
        <DeepLinkReport linkId={selected.id} win={win} plan={plan} />
      )}
    </div>
  );
}

async function AllReport({
  userId,
  sources,
  win,
  plan,
  href,
}: {
  userId: string;
  sources: Source[];
  win: DayWindow;
  plan: PlanName;
  href: (source: string | null) => string;
}) {
  const data = await getOverview(userId, sources, win, plan);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Views" value={fmt.format(data.totals.views)} delta={delta(data.totals.views, data.previous.views)} />
        <StatCard label="Visitors" hint="Unique per day" value={fmt.format(data.totals.visitors)} delta={delta(data.totals.visitors, data.previous.visitors)} />
        <StatCard label="Clicks" value={fmt.format(data.totals.clicks)} delta={delta(data.totals.clicks, data.previous.clicks)} />
        <StatCard label="Click-through rate" value={pct(data.totals.ctr)} delta={delta(data.totals.ctr, data.previous.ctr)} />
        <StatCard label="Reached destination" hint="People" value={fmt.format(data.totals.reached)} delta={delta(data.totals.reached, data.previous.reached)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Views and clicks</CardTitle>
          <CardDescription>{periodText(data.series)} · Clicks are link clicks on your bio pages plus deep-link visitors sent to the destination.</CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsClicksChart data={data.series} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bio pages and deep links</CardTitle>
          <CardDescription>Views and clicks for each one; Reached is how many people went on to your link. Pick one for its full report.</CardDescription>
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
                  <th className="py-2 pr-4 text-right font-medium">Reached</th>
                  <th className="py-2 text-right font-medium">CTR</th>
                </tr>
              </thead>
              <tbody>
                {data.top.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="max-w-[320px] truncate py-2.5 pr-4 font-medium">
                      <Link href={href(s.id)} className="hover:underline">
                        {plainName(s)}
                      </Link>
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{s.url}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {s.kind === "page" ? "Bio page" : "Deep link"}
                      {s.deleted ? " · deleted" : ""}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{fmt.format(s.views)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{fmt.format(s.clicks)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{fmt.format(s.reached)}</td>
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

async function PageReport({ pageId, win, plan }: { pageId: string; win: DayWindow; plan: PlanName }) {
  const data = await getAnalytics(pageId, win, plan);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Views" value={fmt.format(data.totals.views)} delta={delta(data.totals.views, data.previous.views)} />
        <StatCard label="Visitors" hint="Unique per day" value={fmt.format(data.totals.visitors)} delta={delta(data.totals.visitors, data.previous.visitors)} />
        <StatCard label="Clicks" value={fmt.format(data.totals.clicks)} delta={delta(data.totals.clicks, data.previous.clicks)} />
        <StatCard label="Click-through rate" value={pct(data.totals.ctr)} delta={delta(data.totals.ctr, data.previous.ctr)} />
        <StatCard label="Reached destination" hint="People" value={fmt.format(data.totals.reached)} delta={delta(data.totals.reached, data.previous.reached)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Views and clicks</CardTitle>
          <CardDescription>{periodText(data.series)}</CardDescription>
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

async function DeepLinkReport({ linkId, win, plan }: { linkId: string; win: DayWindow; plan: PlanName }) {
  const [link, data] = await Promise.all([db.smartLink.findUnique({ where: { id: linkId }, select: { adultWarning: true, landingPage: true } }), getLinkAnalytics(linkId, win, plan)]);
  return <LinkReport data={data} adultWarning={link?.adultWarning ?? false} twoSteps={!!parseLanding(link?.landingPage)?.enabled} />;
}
