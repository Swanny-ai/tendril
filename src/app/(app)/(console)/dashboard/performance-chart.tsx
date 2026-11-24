"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  views: { label: "Views", color: "var(--chart-1)" },
  clicks: { label: "Clicks", color: "var(--chart-2)" },
  reached: { label: "Reached", color: "var(--chart-3)" },
} satisfies ChartConfig;

type SeriesKey = keyof typeof config;
const KEYS = Object.keys(config) as SeriesKey[];

/** Bucket keys are already wall-clock times in the chosen zone, so format them as UTC. */
function bucketDate(key: string) {
  return new Date(key.length > 10 ? `${key}:00:00Z` : `${key}T00:00:00Z`);
}

export function formatBucket(key: string, bucket: "hour" | "day", withDay: boolean) {
  const d = bucketDate(key);
  if (bucket === "day") return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" });
  return withDay ? `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}, ${time}` : time;
}

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function PerformanceChart({
  series,
  reached,
  bucket,
  tzLabel,
}: {
  series: { key: string; views: number; clicks: number; reached: number }[];
  /** People sent on to a destination in the whole range (each counted once a day). */
  reached: number;
  bucket: "hour" | "day";
  tzLabel: string;
}) {
  const [legend, setLegend] = useState(true);
  // Lines turned off by clicking their name in the legend (at least one always stays on).
  const [hidden, setHidden] = useState<Set<SeriesKey>>(() => new Set());
  const toggle = (k: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else if (next.size < KEYS.length - 1) next.add(k);
      return next;
    });
  const total = series.reduce((s, p) => s + p.views, 0);
  const clicks = series.reduce((s, p) => s + p.clicks, 0);
  const average = series.length ? total / series.length : 0;
  const peak = series.reduce((best, p) => (p.views > best.views ? p : best), { key: "", views: 0 });
  const multiDay = bucket === "hour" && new Set(series.map((p) => p.key.slice(0, 10))).size > 1;
  const per = bucket === "hour" ? "hour" : "day";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Views</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">{total.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Clicks</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">{clicks.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reached</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">{reached.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Avg views / {per}</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">{fmt.format(average)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Peak views</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">
              {peak.views.toLocaleString("en-US")}
              {peak.views ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{formatBucket(peak.key, bucket, multiDay || bucket === "day")}</span> : null}
            </dd>
          </div>
        </dl>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{tzLabel}</Badge>
          <Button variant="ghost" size="sm" onClick={() => setLegend((v) => !v)} aria-pressed={!legend}>
            {legend ? <EyeOff /> : <Eye />} {legend ? "Hide legend" : "Show legend"}
          </Button>
        </div>
      </div>
      <ChartContainer config={config} className="aspect-auto h-72 w-full">
        <AreaChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="fill-global-views" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-views)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-views)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fill-global-clicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-clicks)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-clicks)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fill-global-reached" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-reached)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-reached)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="key" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={(k) => formatBucket(String(k), bucket, false)} />
          <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => formatBucket(String(p?.[0]?.payload?.key ?? ""), bucket, true)} />} />
          {KEYS.map((k) => (
            <Area key={k} dataKey={k} hide={hidden.has(k)} type="monotone" stroke={`var(--color-${k})`} fill={`url(#fill-global-${k})`} strokeWidth={2} dot={false} />
          ))}
        </AreaChart>
      </ChartContainer>
      {/* Legend: click a name to hide or show its line. */}
      {legend ? (
        <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Show or hide lines">
          {KEYS.map((k) => {
            const off = hidden.has(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(k)}
                title={off ? `Show ${config[k].label}` : `Hide ${config[k].label}`}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted ${off ? "text-muted-foreground line-through opacity-60" : ""}`}
              >
                <span className="size-2 rounded-[2px]" style={{ background: off ? "var(--muted-foreground)" : config[k].color }} aria-hidden />
                {config[k].label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
