import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Small building blocks shared by the admin screens.

export const PER_PAGE = 50;
/** The moment `days` ago (fractions allowed). */
export const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
const num = new Intl.NumberFormat("en-US");
export const fmt = (n: number) => num.format(n);
export const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
export const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export function ago(d: Date | null | undefined): string {
  if (!d) return "—";
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return day(d);
}

/** ?q= and ?p= from a screen's search params. */
export async function listParams(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const page = Math.max(1, Number.parseInt(one("p"), 10) || 1);
  return { q: one("q").trim(), page, skip: (page - 1) * PER_PAGE, one };
}

export function Header({ title, intro, children }: { title: string; intro?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, href, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; href?: string; tone?: "warn" | "good" }) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "warn" && "text-[var(--persimmon)]", tone === "good" && "text-primary")}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );
  const cls = "block rounded-xl border bg-card p-4";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-primary/50")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function SearchBox({ placeholder, q, extra }: { placeholder: string; q: string; extra?: Record<string, string> }) {
  return (
    <form className="relative w-full max-w-sm" role="search">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      {Object.entries(extra ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <input
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </form>
  );
}

/** A plain table in a card. */
export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2.5 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_tr]:border-b [&_tr:last-child]:border-0">{children}</tbody>
      </table>
      {empty ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p> : null}
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "good" | "warn" | "info" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "good" && "bg-primary/15 text-primary",
        tone === "warn" && "bg-[var(--persimmon)]/15 text-[var(--persimmon)]",
        tone === "info" && "bg-sky-500/15 text-sky-500",
      )}
    >
      {children}
    </span>
  );
}

/** Previous / next page links keeping the other query params. */
export function Pager({ path, page, total, params }: { path: string; page: number; total: number; params?: Record<string, string> }) {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (pages <= 1) return <p className="text-xs text-muted-foreground">{fmt(total)} in total</p>;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v));
    if (p > 1) q.set("p", String(p));
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };
  const btn = "rounded-lg border px-3 py-1.5 text-sm hover:bg-muted";
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="mr-auto text-xs text-muted-foreground">
        {fmt(total)} in total · page {page} of {pages}
      </span>
      {page > 1 ? (
        <Link className={btn} href={href(page - 1)}>
          Previous
        </Link>
      ) : null}
      {page < pages ? (
        <Link className={btn} href={href(page + 1)}>
          Next
        </Link>
      ) : null}
    </div>
  );
}

/** Tabs as links (?<name>=value). */
export function FilterTabs({ path, name, value, options, params }: { path: string; name: string; value: string; options: { value: string; label: string; count?: number }[]; params?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-muted p-1 text-sm">
      {options.map((o) => {
        const q = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v));
        if (o.value) q.set(name, o.value);
        const s = q.toString();
        return (
          <Link
            key={o.value}
            href={s ? `${path}?${s}` : path}
            className={cn("rounded-md px-3 py-1 font-medium", value === o.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {o.label}
            {o.count !== undefined ? <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{fmt(o.count)}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

/** Bars for a series of days (server-rendered, no chart library). */
export function DayBars({ data, label }: { data: { day: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground tabular-nums">{fmt(total)} in {data.length} days</p>
      </div>
      <div className="mt-3 flex h-28 items-end gap-[3px]" role="img" aria-label={`${label}: ${fmt(total)} in ${data.length} days`}>
        {data.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end">
            <div className="w-full rounded-t-sm bg-primary/70 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(d.value ? 4 : 1, (d.value / max) * 100)}%` }} />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] whitespace-nowrap text-background group-hover:block">
              {d.day.slice(5)}: {fmt(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data.at(-1)?.day.slice(5)}</span>
      </div>
    </div>
  );
}

/** Last `days` UTC dates (YYYY-MM-DD), oldest first, with counts filled in from rows. */
export function fillDays(rows: { day: string; n: bigint | number }[], days: number) {
  const map = new Map(rows.map((r) => [r.day, Number(r.n)]));
  const out: { day: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ day: key, value: map.get(key) ?? 0 });
  }
  return out;
}
