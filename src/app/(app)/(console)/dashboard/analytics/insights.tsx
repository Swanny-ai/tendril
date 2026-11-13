import { Activity, CalendarCheck, CalendarDays, CalendarMinus, Clock, Sun } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getTrafficPatternsBetween } from "@/lib/analytics/global";
import { hourLabel } from "@/lib/analytics/hour-label";
import type { DayWindow } from "@/lib/analytics/queries";
import { MIN_VIEWS_FOR_PATTERNS, TrafficCards } from "../traffic-cards";

// Analytics → Insights: quick highlights, then traffic by weekday and hour and the best time to post.
// Works for everything or one bio page / deep link. Times are UTC, like the rest of the page.

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

export async function Insights({
  userId,
  sourceId,
  win,
  series,
  noun = "views",
}: {
  userId: string;
  sourceId: string | null;
  win: DayWindow;
  series: { day: string; views: number }[];
  /** "views" for pages and everything, "visits" for a deep link. */
  noun?: string;
}) {
  const patterns = await getTrafficPatternsBetween(userId, "UTC", win.from, win.to, sourceId);
  const total = series.reduce((s, p) => s + p.views, 0);
  const best = series.reduce((a, b) => (b.views > a.views ? b : a), { day: "", views: 0 });
  const enough = patterns.views >= MIN_VIEWS_FOR_PATTERNS;
  const busiest = patterns.byDay.reduce((a, b) => (b.avg > a.avg ? b : a));
  const quietest = patterns.byDay.reduce((a, b) => (b.avg < a.avg ? b : a));
  const peak = patterns.byHour.reduce((a, b) => (b.avg > a.avg ? b : a));
  const weekend = patterns.views ? (patterns.byDay[5].avg + patterns.byDay[6].avg) / patterns.byDay.reduce((s, d) => s + d.avg, 0) : 0;

  const tiles = [
    { icon: CalendarCheck, label: "Best day", value: best.views ? shortDate(best.day) : "—", note: best.views ? `${fmt.format(best.views)} ${noun}` : `No ${noun} yet` },
    { icon: Activity, label: "Daily average", value: fmt.format(series.length ? total / series.length : 0), note: `${noun} a day` },
    { icon: CalendarDays, label: "Busiest weekday", value: enough ? busiest.day : "—", note: enough ? `${fmt.format(busiest.avg)} ${noun} on average` : "Needs more visits" },
    { icon: Clock, label: "Peak hour", value: enough ? hourLabel(peak.hour) : "—", note: enough ? "UTC" : "Needs more visits" },
    { icon: Sun, label: "Weekend share", value: enough ? `${Math.round(weekend * 100)}%` : "—", note: "of an average week" },
    { icon: CalendarMinus, label: "Quietest weekday", value: enough ? quietest.day : "—", note: enough ? `${fmt.format(quietest.avg)} ${noun} on average` : "Needs more visits" },
  ];

  return (
    <section aria-label="Insights" className="space-y-4">
      <h2 className="text-lg font-semibold">Insights</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Card key={t.label} size="sm">
            <CardContent className="space-y-0.5">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <t.icon className="size-3.5" aria-hidden /> {t.label}
              </p>
              <p className="truncate font-heading text-lg font-semibold">{t.value}</p>
              <p className="truncate text-xs text-muted-foreground">{t.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <TrafficCards patterns={patterns} period={`${win.days} days, UTC`} tzLabel="UTC" />
    </section>
  );
}
