"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Days are "YYYY-MM-DD" strings in UTC, like the rest of analytics. */
type Day = string;
type Month = { y: number; m: number }; // m: 0-11

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const iso = (d: Date): Day => d.toISOString().slice(0, 10);
const toDate = (d: Day) => new Date(`${d}T00:00:00Z`);
const monthOf = (d: Day): Month => ({ y: +d.slice(0, 4), m: +d.slice(5, 7) - 1 });
const addMonths = ({ y, m }: Month, n: number): Month => ({ y: y + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 });
const monthKey = ({ y, m }: Month) => y * 12 + m;
const monthTitle = ({ y, m }: Month) => new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const short = (d: Day, year = false) =>
  toDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });

/** The 6×7 grid of a month, Monday first, with the neighbouring months' days filling the edges. */
function monthGrid({ y, m }: Month): Day[] {
  const first = new Date(Date.UTC(y, m, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => iso(new Date(Date.UTC(y, m, 1 + i - lead))));
}

function rangeLabel(from: Day, to: Day) {
  if (from === to) return short(from, true);
  return from.slice(0, 4) === to.slice(0, 4) ? `${short(from)} – ${short(to, true)}` : `${short(from, true)} – ${short(to, true)}`;
}

/**
 * Two-month calendar in a popover: tap a first day, then a last day, then Apply.
 * Days outside the plan's history (or after today) can't be picked.
 */
export function DateRangePicker({
  label,
  from,
  to,
  oldest,
  today,
  source,
  active,
}: {
  /** What the button says now (a preset like "Last 7 days", or the picked days). */
  label: string;
  from: Day;
  to: Day;
  oldest: Day;
  today: Day;
  source: string | null;
  /** The page is showing picked days (not a preset). */
  active: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Day | null>(from);
  const [end, setEnd] = useState<Day | null>(to);
  const [hover, setHover] = useState<Day | null>(null);
  const [left, setLeft] = useState<Month>(monthOf(from));

  const reset = () => {
    setStart(from);
    setEnd(to);
    setHover(null);
    setLeft(monthOf(from));
  };
  const onOpenChange = (o: boolean) => {
    if (o) reset();
    setOpen(o);
  };

  const pick = (d: Day) => {
    if (!start || end) {
      setStart(d);
      setEnd(null);
    } else if (d < start) {
      setEnd(start);
      setStart(d);
    } else setEnd(d);
  };

  const apply = () => {
    if (!start) return;
    const q = new URLSearchParams({ ...(source ? { source } : {}), from: start, to: end ?? start });
    setOpen(false);
    router.push(`?${q}`);
  };

  // While choosing the last day, the hovered day previews the range.
  const lo = start && !end && hover ? (hover < start ? hover : start) : start;
  const hi = start && !end && hover ? (hover < start ? start : hover) : end;

  const canPrev = monthKey(left) > monthKey(monthOf(oldest));
  const canNext = monthKey(left) < monthKey(monthOf(today));

  const renderMonth = (mo: Month, side: "left" | "right") => (
    <div className={cn("w-full sm:w-[300px]", side === "right" && "hidden sm:block")}>
      <div className="mb-4 flex h-9 items-center justify-between">
        {side === "left" ? (
          <NavButton label="Previous month" disabled={!canPrev} onClick={() => setLeft(addMonths(left, -1))}>
            <ChevronLeft className="size-4" />
          </NavButton>
        ) : (
          <span className="size-9" />
        )}
        <span className="text-[15px] font-semibold">{monthTitle(mo)}</span>
        {side === "right" ? (
          <NavButton label="Next month" disabled={!canNext} onClick={() => setLeft(addMonths(left, 1))}>
            <ChevronRight className="size-4" />
          </NavButton>
        ) : (
          // On phones only one month shows, so its own header carries the "next" arrow.
          <span className="size-9">
            <span className="sm:hidden">
              <NavButton label="Next month" disabled={!canNext} onClick={() => setLeft(addMonths(left, 1))}>
                <ChevronRight className="size-4" />
              </NavButton>
            </span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="pb-2 text-xs font-medium text-muted-foreground">
            {w}
          </span>
        ))}
        {monthGrid(mo).map((d, i) => {
          const inMonth = monthOf(d).m === mo.m;
          const disabled = d < oldest || d > today;
          // The neighbouring months' days stay plain, so a range isn't drawn twice across both grids.
          const edge = inMonth && (d === lo || d === hi);
          const between = inMonth && !!lo && !!hi && d > lo && d < hi;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => pick(d)}
              onMouseEnter={() => setHover(d)}
              aria-label={short(d, true)}
              aria-pressed={edge || between}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-colors",
                disabled
                  ? "cursor-not-allowed bg-foreground/[0.07] text-muted-foreground/60"
                  : inMonth
                    ? "text-foreground hover:bg-foreground/10"
                    : "font-normal text-muted-foreground hover:bg-foreground/10",
                between && "bg-primary/15 text-foreground",
                edge && "border border-primary bg-primary/25 text-foreground",
                d === today && inMonth && !edge && "ring-1 ring-primary/60 ring-inset",
              )}
            >
              {+d.slice(8)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-foreground/5",
          active && "border-primary",
        )}
      >
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
        {label}
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[calc(100vw-32px)] gap-0 rounded-3xl p-5 sm:w-auto sm:p-6">
        <div className="flex gap-8" onMouseLeave={() => setHover(null)}>
          {renderMonth(left, "left")}
          {renderMonth(addMonths(left, 1), "right")}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {start ? (end ? rangeLabel(start, end) : `${short(start, true)} – pick the last day`) : "Pick the first day"}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-11 rounded-full border border-foreground/80 text-[15px] font-semibold hover:bg-foreground/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!start}
            className="h-11 rounded-full bg-foreground text-[15px] font-semibold text-background hover:opacity-90 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/15 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
