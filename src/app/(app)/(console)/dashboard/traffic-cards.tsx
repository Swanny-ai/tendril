import { CalendarDays, Clock, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TrafficPatterns } from "@/lib/analytics/global";
import { hourLabel } from "@/lib/analytics/hour-label";
import { DayChart, HourChart } from "./traffic-charts";

// When people visit: average traffic by weekday and by hour, and the best time to post.
// Used on Overview and on Analytics.

const MEDALS = ["🥇", "🥈", "🥉"];
/** Below this many views the averages say more about chance than about the audience. */
export const MIN_VIEWS_FOR_PATTERNS = 20;

export function NotEnoughVisits() {
  return <p className="py-10 text-center text-sm text-muted-foreground">Not enough visits yet. This fills in as people visit your links.</p>;
}

/** The three cards, side by side on wide screens. `period` reads like "last 30 days, UTC". */
export function TrafficCards({ patterns, period, tzLabel }: { patterns: TrafficPatterns; period: string; tzLabel: string }) {
  const enough = patterns.views >= MIN_VIEWS_FOR_PATTERNS;
  const busiestDay = patterns.byDay.reduce((a, b) => (b.avg > a.avg ? b : a));
  const busiestHour = patterns.byHour.reduce((a, b) => (b.avg > a.avg ? b : a));
  return (
    <section aria-label="When people visit" className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-4" /> Avg traffic by day
          </CardTitle>
          <CardDescription>Average views on each weekday · {period}</CardDescription>
        </CardHeader>
        <CardContent>{enough ? <DayChart data={patterns.byDay} /> : <NotEnoughVisits />}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" /> Avg traffic by time
          </CardTitle>
          <CardDescription>Average views in each hour of the day · {period}</CardDescription>
        </CardHeader>
        <CardContent>{enough ? <HourChart data={patterns.byHour} /> : <NotEnoughVisits />}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" /> Best time to post
          </CardTitle>
          <CardDescription>When your visitors are most active · {tzLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          {enough ? (
            <div className="space-y-4" data-testid="best-time">
              <div className="rounded-xl bg-primary/10 p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Best slot</p>
                <p className="font-heading text-2xl font-semibold">
                  {patterns.bestSlots[0].day} · {hourLabel(patterns.bestSlots[0].hour)}
                </p>
                <p className="text-xs text-muted-foreground">Post a little before this, so your link is fresh when people look.</p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Busiest day</dt>
                  <dd className="font-semibold">{busiestDay.day}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Busiest hour</dt>
                  <dd className="font-semibold">{hourLabel(busiestHour.hour)}</dd>
                </div>
              </dl>
              <ol className="space-y-1.5 text-sm">
                {patterns.bestSlots.map((s, i) => (
                  <li key={`${s.day}-${s.hour}`} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-center">{MEDALS[i]}</span>
                      {s.day} · {hourLabel(s.hour)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{Math.round(s.share * 100)}% of views</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <NotEnoughVisits />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
