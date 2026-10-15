"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = { views: { label: "Views", color: "var(--chart-1)" } } satisfies ChartConfig;

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

export function PerformanceChart({ series, bucket, tzLabel }: { series: { key: string; views: number }[]; bucket: "hour" | "day"; tzLabel: string }) {
  const [legend, setLegend] = useState(true);
  const total = series.reduce((s, p) => s + p.views, 0);
  const average = series.length ? total / series.length : 0;
  const peak = series.reduce((best, p) => (p.views > best.views ? p : best), { key: "", views: 0 });
  const multiDay = bucket === "hour" && new Set(series.map((p) => p.key.slice(0, 10))).size > 1;
  const per = bucket === "hour" ? "hour" : "day";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">{total.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Average / {per}</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums">{fmt.format(average)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Peak</dt>
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
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="key" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={(k) => formatBucket(String(k), bucket, false)} />
          <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => formatBucket(String(p?.[0]?.payload?.key ?? ""), bucket, true)} />} />
          {legend ? <ChartLegend content={<ChartLegendContent />} /> : null}
          {average > 0 ? <ReferenceLine y={average} stroke="var(--muted-foreground)" strokeDasharray="4 4" ifOverflow="extendDomain" /> : null}
          <Area dataKey="views" type="monotone" stroke="var(--color-views)" fill="url(#fill-global-views)" strokeWidth={2} dot={series.length <= 48} />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
