"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const config = {
  views: { label: "Views", color: "var(--chart-1)" },
  clicks: { label: "Clicks", color: "var(--chart-2)" },
} satisfies ChartConfig;

const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function ViewsClicksChart({ data }: { data: { day: string; views: number; clicks: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          {(["views", "clicks"] as const).map((k) => (
            <linearGradient key={k} id={`fill-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.35} />
              <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={shortDate} />
        <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(v) => shortDate(String(v))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area dataKey="views" type="monotone" stroke="var(--color-views)" fill="url(#fill-views)" strokeWidth={2} />
        <Area dataKey="clicks" type="monotone" stroke="var(--color-clicks)" fill="url(#fill-clicks)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}

export function StatCard({ label, value, delta, hint }: { label: string; value: string; delta: number | null; hint?: string }) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="space-y-1 pt-1">
        <p className="text-sm text-muted-foreground">
          {label}
          {hint ? <span className="ml-1 text-xs">({hint})</span> : null}
        </p>
        <p className="font-heading text-3xl font-semibold tabular-nums">{value}</p>
        {delta === null ? (
          <p className="text-xs text-muted-foreground">No data for the previous period</p>
        ) : (
          <p className={cn("flex items-center gap-1 text-xs font-medium", up ? "text-[var(--sage-text)]" : "text-destructive")}>
            {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {`${up ? "+" : ""}${(delta * 100).toFixed(0)}% vs previous period`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function BarList({ items }: { items: { label: string; value: number; muted?: boolean; icon?: React.ReactNode }[] }) {
  const max = Math.max(...items.filter((i) => !i.muted).map((i) => i.value), 1);
  const total = items.filter((i) => !i.muted).reduce((s, i) => s + i.value, 0) || 1;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className={cn("relative flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm", i.muted && "pl-5 text-muted-foreground")}>
          {!i.muted ? <span aria-hidden className="absolute inset-y-0 left-0 rounded-md bg-primary/10" style={{ width: `${(i.value / max) * 100}%` }} /> : null}
          <span className="relative flex min-w-0 items-center gap-2">
            {i.icon}
            <span className="truncate">{i.label}</span>
          </span>
          <span className="relative shrink-0 tabular-nums">
            {i.value.toLocaleString("en-US")} <span className="text-xs text-muted-foreground">{i.muted ? "" : `${Math.round((i.value / total) * 100)}%`}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
