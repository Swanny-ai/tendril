"use client";

import { useEffect, useState } from "react";
import { Monitor, Radio, Smartphone, Tablet, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CountryFlag } from "@/components/country-flag";
import type { LiveStats } from "@/lib/analytics/global";
import { cn } from "@/lib/utils";

const POLL_MS = 5_000;


function ago(ts: string, now: string) {
  const s = Math.max(0, Math.round((Date.parse(now) - Date.parse(ts)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

function DeviceIcon({ device }: { device: string }) {
  const Icon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : Monitor;
  return <Icon className="size-3.5" aria-label={device} />;
}

function useLive(initial: LiveStats) {
  const [data, setData] = useState(initial);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/dashboard/live", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const next = (await res.json()) as LiveStats;
        if (!stopped) {
          setData(next);
          setOnline(true);
        }
      } catch {
        if (!stopped) setOnline(false);
      }
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return { data, online };
}

export function LivePanels({ initial, geo }: { initial: LiveStats; geo: boolean }) {
  const { data, online } = useLive(initial);
  const max = Math.max(1, ...data.perMinute.map((m) => m.views));
  const change = data.previousUsers ? (data.users - data.previousUsers) / data.previousUsers : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Live activity
            <span className={cn("relative flex size-2", online ? "text-[var(--sage)]" : "text-muted-foreground")} aria-hidden>
              {online ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" /> : null}
              <span className="relative inline-flex size-2 rounded-full bg-current" />
            </span>
          </CardTitle>
          <CardDescription>Showing the last {data.recent.length || 10} visitors</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent.length ? (
            <ul className="divide-y" aria-live="polite" data-testid="live-feed">
              {data.recent.map((v) => {
                const fresh = Date.parse(data.now) - Date.parse(v.ts) < 60_000;
                return (
                  <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <CountryFlag code={v.country} size="lg" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{v.countryName ? `Visitor from ${v.countryName}` : "New visitor"}</span>
                        <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <DeviceIcon device={v.device} /> {v.label}
                          {v.path ? <span className="truncate">· {v.path}</span> : null}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground tabular-nums">
                      {fresh ? <Badge className="bg-[var(--persimmon-text)] text-white">New</Badge> : null}
                      {ago(v.ts, data.now)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No visitors yet. Share a link and they&apos;ll show up here.</p>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio className="size-3.5" /> {online ? "Live stream active · updates every 5 seconds" : "Reconnecting…"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Real-time overview</CardTitle>
          <CardDescription>Views per minute, last 30 minutes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="size-4" /> Visitors right now
              </p>
              <p className="font-heading text-3xl font-semibold tabular-nums" data-testid="live-users">
                {data.users.toLocaleString("en-US")}
              </p>
              {change === null ? (
                <p className="text-xs text-muted-foreground">vs previous 30 minutes: no data</p>
              ) : (
                <p className={cn("flex items-center gap-1 text-xs font-medium", change >= 0 ? "text-[var(--sage-text)]" : "text-destructive")}>
                  {change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {`${change >= 0 ? "+" : ""}${Math.round(change * 100)}% vs previous 30 minutes`}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Views (30 min)</p>
              <p className="font-heading text-3xl font-semibold tabular-nums">{data.views.toLocaleString("en-US")}</p>
            </div>
          </div>

          <div>
            <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={`Views per minute over the last 30 minutes, ${data.views} in total`}>
              {data.perMinute.map((m) => (
                <div
                  key={m.minute}
                  title={`${new Date(m.minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}: ${m.views} views`}
                  className={cn("flex-1 rounded-t-sm", m.views ? "bg-[var(--chart-1)]" : "bg-muted")}
                  style={{ height: `${Math.max(6, (m.views / max) * 100)}%` }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>30 min ago</span>
              <span>Now</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Top locations</p>
              {!geo ? (
                <p className="text-xs text-muted-foreground">Locations are part of Pro.</p>
              ) : data.topLocations?.length ? (
                <ul className="space-y-1 text-sm">
                  {data.topLocations.map((l) => (
                    <li key={l.code} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <CountryFlag code={l.code} size="sm" />
                        <span className="truncate">{l.name}</span>
                      </span>
                      <span className="tabular-nums">{l.views}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No visitors in the last 30 minutes.</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Active links</p>
              {data.activeLinks.length ? (
                <ul className="space-y-1 text-sm">
                  {data.activeLinks.slice(0, 5).map((l) => (
                    <li key={l.path || l.label} className="flex justify-between gap-2">
                      <span className="truncate">{l.label}</span>
                      <span className="tabular-nums">{l.views}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No links visited in the last 30 minutes.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
