"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, Download, Globe, Plus, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RANGE_OPTIONS, TIMEZONE_OPTIONS, type RangeKey } from "@/lib/analytics/ranges";
import { cn } from "@/lib/utils";

type Props = { range: RangeKey; rangeLabel: string; from?: string; to?: string; tz: string | null; maxDays: number };

function localTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const subscribeNever = () => () => {};

export function DashboardToolbar({ range, rangeLabel, from, to, tz, maxDays }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  const navigate = (next: { range?: string; from?: string; to?: string; tz?: string }) => {
    const params = new URLSearchParams();
    const r = next.range ?? range;
    params.set("range", r);
    if (r === "custom") {
      params.set("from", next.from ?? from ?? "");
      params.set("to", next.to ?? to ?? "");
    }
    params.set("tz", next.tz ?? tz ?? localTimeZone());
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  };

  // Default to the visitor's own time zone ("My local time"), like a wall clock.
  useEffect(() => {
    if (!tz) {
      const params = new URLSearchParams(window.location.search);
      params.set("tz", localTimeZone());
      router.replace(`${pathname}?${params}`, { scroll: false });
    }
  }, [tz, pathname, router]);

  const current = tz ?? "UTC";
  const local = useSyncExternalStore(subscribeNever, localTimeZone, () => null);
  const exportParams = new URLSearchParams({ range, tz: current, ...(range === "custom" && from && to ? { from, to } : {}) });

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <Button variant="outline" size="sm" onClick={() => startTransition(() => router.refresh())} disabled={pending} aria-label="Refresh data">
        <RefreshCw className={cn(pending && "animate-spin")} /> Refresh
      </Button>

      <Select value={range} onValueChange={(v) => (v === "custom" ? setCustomOpen(true) : navigate({ range: String(v) }))}>
        <SelectTrigger size="sm" className="min-w-40" aria-label="Date range">
          <SelectValue>{() => rangeLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((r) => (
            <SelectItem key={r.key} value={r.key}>
              {r.label}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value="custom">Custom range…</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger render={<Button variant="outline" size="icon-sm" aria-label="Pick custom dates" />}>
          <CalendarRange />
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!customFrom || !customTo) return;
              setCustomOpen(false);
              navigate({ range: "custom", from: customFrom, to: customTo });
            }}
          >
            <p className="text-sm font-medium">Custom range</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="range-from">Start</Label>
                <Input id="range-from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="range-to">End</Label>
                <Input id="range-to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} required />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Your plan includes the last {maxDays} days of history.</p>
            <Button type="submit" size="sm" className="w-full">
              Apply
            </Button>
          </form>
        </PopoverContent>
      </Popover>

      <Select value={current} onValueChange={(v) => navigate({ tz: String(v) })}>
        <SelectTrigger size="sm" className="min-w-36" aria-label="Time zone">
          <Globe className="text-muted-foreground" />
          <SelectValue>{() => (current === local ? "My local time" : (TIMEZONE_OPTIONS.find((o) => o.tz === current)?.label ?? current))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {local && !TIMEZONE_OPTIONS.some((o) => o.tz === local) ? (
            <SelectGroup>
              <SelectLabel>Detected</SelectLabel>
              <SelectItem value={local}>My local time ({local})</SelectItem>
            </SelectGroup>
          ) : null}
          <SelectGroup>
            <SelectLabel>Time zones</SelectLabel>
            {TIMEZONE_OPTIONS.map((o) => (
              <SelectItem key={o.tz} value={o.tz}>
                {o.tz === local ? `My local time (${o.label})` : o.label}
              </SelectItem>
            ))}
            {current !== local && !TIMEZONE_OPTIONS.some((o) => o.tz === current) ? <SelectItem value={current}>{current}</SelectItem> : null}
          </SelectGroup>
        </SelectContent>
      </Select>

      <a href={`/api/dashboard/export?${exportParams}`} download className={buttonVariants({ variant: "outline", size: "sm" })}>
        <Download /> Export
      </a>
      <Link href="/dashboard/links/new" className={buttonVariants({ size: "sm" })}>
        <Plus /> Create link
      </Link>
    </div>
  );
}
