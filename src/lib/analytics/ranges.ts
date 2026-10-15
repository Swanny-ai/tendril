// Date ranges and time-zone math for the global dashboard (pure, unit-tested).

export const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "24h", label: "Last 24 hours" },
  { key: "48h", label: "Last 48 hours" },
  { key: "7d", label: "Last 7 days" },
  { key: "14d", label: "Last 14 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "last-week", label: "Last week" },
  { key: "last-month", label: "Last month" },
  { key: "this-year", label: "This year" },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]["key"] | "custom";

export const TIMEZONE_OPTIONS = [
  { tz: "UTC", label: "UTC" },
  { tz: "America/New_York", label: "Eastern Time (ET)" },
  { tz: "America/Chicago", label: "Central Time (CT)" },
  { tz: "America/Denver", label: "Mountain Time (MT)" },
  { tz: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { tz: "America/Sao_Paulo", label: "São Paulo" },
  { tz: "Europe/London", label: "London" },
  { tz: "Europe/Paris", label: "Central Europe" },
  { tz: "Africa/Casablanca", label: "Casablanca" },
  { tz: "Asia/Dubai", label: "Dubai" },
  { tz: "Asia/Kolkata", label: "India" },
  { tz: "Asia/Tokyo", label: "Tokyo" },
  { tz: "Australia/Sydney", label: "Sydney" },
] as const;

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

type Parts = { y: number; m: number; d: number; h: number; mi: number; s: number };

export function zonedParts(date: Date, tz: string): Parts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

/** Milliseconds to add to UTC to get wall-clock time in `tz` at `date`. */
export function tzOffsetMs(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000;
}

/** The UTC instant of a wall-clock time in `tz` (handles DST by re-checking the offset). */
export function zonedTime(y: number, m: number, d: number, h: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h);
  let t = guess - tzOffsetMs(new Date(guess), tz);
  t = guess - tzOffsetMs(new Date(t), tz);
  return new Date(t);
}

export function startOfDay(date: Date, tz: string): Date {
  const p = zonedParts(date, tz);
  return zonedTime(p.y, p.m, p.d, 0, tz);
}

function addDays(date: Date, days: number, tz: string): Date {
  const p = zonedParts(date, tz);
  const shifted = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
  return zonedTime(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(), 0, tz);
}

export type ResolvedRange = { key: RangeKey; from: Date; to: Date; bucket: "hour" | "day"; label: string; clamped: boolean };

const HOUR = 3_600_000;
const DAY = 86_400_000;

function parseDay(s: unknown): { y: number; m: number; d: number } | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCMonth() === m - 1 ? { y, m, d } : null;
}

export function resolveRange(
  input: { range?: unknown; from?: unknown; to?: unknown },
  tz: string,
  now: Date,
  maxDays: number,
): ResolvedRange {
  const key = (RANGE_OPTIONS.some((r) => r.key === input.range) || input.range === "custom" ? input.range : "24h") as RangeKey;
  const today = startOfDay(now, tz);
  let from: Date;
  let to: Date = now;
  let label = RANGE_OPTIONS.find((r) => r.key === key)?.label ?? "Custom range";

  switch (key) {
    case "today":
      from = today;
      break;
    case "yesterday":
      from = addDays(today, -1, tz);
      to = today;
      break;
    case "24h":
      from = new Date(now.getTime() - 24 * HOUR);
      break;
    case "48h":
      from = new Date(now.getTime() - 48 * HOUR);
      break;
    case "7d":
    case "14d":
    case "30d":
    case "90d":
      from = addDays(today, -(Number.parseInt(key, 10) - 1), tz);
      break;
    case "last-week": {
      const p = zonedParts(now, tz);
      const weekday = (new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 6) % 7; // Monday = 0
      const thisMonday = addDays(today, -weekday, tz);
      from = addDays(thisMonday, -7, tz);
      to = thisMonday;
      break;
    }
    case "last-month": {
      const p = zonedParts(now, tz);
      to = zonedTime(p.y, p.m, 1, 0, tz);
      const prev = new Date(Date.UTC(p.y, p.m - 2, 1));
      from = zonedTime(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1, 0, tz);
      break;
    }
    case "this-year": {
      const p = zonedParts(now, tz);
      from = zonedTime(p.y, 1, 1, 0, tz);
      break;
    }
    case "custom": {
      const a = parseDay(input.from);
      const b = parseDay(input.to);
      if (!a || !b) return resolveRange({ range: "24h" }, tz, now, maxDays);
      const start = zonedTime(a.y, a.m, a.d, 0, tz);
      const endDay = zonedTime(b.y, b.m, b.d, 0, tz);
      const [lo, hi] = start <= endDay ? [start, endDay] : [endDay, start];
      from = lo;
      to = new Date(Math.min(addDays(hi, 1, tz).getTime(), now.getTime()));
      label = `${input.from} → ${input.to}`;
      break;
    }
  }

  let clamped = false;
  const earliest = new Date(now.getTime() - maxDays * DAY);
  if (from < earliest) {
    from = earliest;
    clamped = true;
  }
  if (to < from) to = from;
  const bucket = to.getTime() - from.getTime() <= 2 * DAY + HOUR ? "hour" : "day";
  return { key, from, to, bucket, label, clamped };
}

export function previousPeriod(r: { from: Date; to: Date }) {
  const span = r.to.getTime() - r.from.getTime();
  return { from: new Date(r.from.getTime() - span), to: r.from };
}

/** Bucket key as Postgres returns it for date_trunc(bucket, ts AT TIME ZONE tz): "YYYY-MM-DDTHH" or "YYYY-MM-DD". */
export function bucketKey(date: Date, tz: string, bucket: "hour" | "day"): string {
  const p = zonedParts(date, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  return bucket === "hour" ? `${day}T${pad(p.h)}` : day;
}

/** Every bucket key from `from` (inclusive) to `to` (exclusive), in order. */
export function bucketKeys(from: Date, to: Date, tz: string, bucket: "hour" | "day"): string[] {
  const keys: string[] = [];
  let t = bucket === "hour" ? new Date(Math.floor(from.getTime() / HOUR) * HOUR) : startOfDay(from, tz);
  let guard = 0;
  while (t < to && guard++ < 2000) {
    const k = bucketKey(t, tz, bucket);
    if (keys[keys.length - 1] !== k) keys.push(k);
    t = bucket === "hour" ? new Date(t.getTime() + HOUR) : addDays(t, 1, tz);
  }
  return keys;
}
