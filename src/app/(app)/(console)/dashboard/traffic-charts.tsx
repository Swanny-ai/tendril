"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { hourLabel } from "@/lib/analytics/hour-label";

const config = { avg: { label: "Avg views", color: "var(--chart-1)" } } satisfies ChartConfig;

/** Average views per weekday (Monday first); the busiest day is drawn in full colour. */
export function DayChart({ data }: { data: { day: string; avg: number }[] }) {
  const max = Math.max(...data.map((d) => d.avg));
  return (
    <ChartContainer config={config} className="aspect-auto h-52 w-full">
      <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(d: string) => d.slice(0, 3)} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(d) => String(d)} />} />
        <Bar
          dataKey="avg"
          radius={[4, 4, 0, 0]}
          shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: { avg: number } }) => (
            <rect
              x={props.x}
              y={props.y}
              width={props.width}
              height={props.height}
              rx={4}
              fill="var(--color-avg)"
              fillOpacity={max > 0 && props.payload?.avg === max ? 1 : 0.45}
            />
          )}
        />
      </BarChart>
    </ChartContainer>
  );
}

/** Average views in each hour of the day; the busiest hour is drawn in full colour. */
export function HourChart({ data }: { data: { hour: number; avg: number }[] }) {
  const max = Math.max(...data.map((d) => d.avg));
  return (
    <ChartContainer config={config} className="aspect-auto h-52 w-full">
      <BarChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} interval={5} tickFormatter={(h: number) => hourLabel(h)} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(_, p) => hourLabel(Number(p?.[0]?.payload?.hour ?? 0))} />} />
        <Bar
          dataKey="avg"
          shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: { avg: number } }) => (
            <rect
              x={props.x}
              y={props.y}
              width={props.width}
              height={props.height}
              rx={2}
              fill="var(--color-avg)"
              fillOpacity={max > 0 && props.payload?.avg === max ? 1 : 0.45}
            />
          )}
        />
      </BarChart>
    </ChartContainer>
  );
}
