import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The sidebar's link usage: every deep link (Deeplinks and Two-Steps) against the plan's
 * allowance, as a bar. Turns amber when nearly full; "Upgrade for more" unless on the top plan.
 */
export function UsageMeter({ used, limit, active, canUpgrade }: { used: number; limit: number; active: number; canUpgrade: boolean }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="mt-auto rounded-xl border bg-card p-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Usage</span>
        <span className="text-muted-foreground tabular-nums">
          {used}/{limit}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Links used"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full transition-[width]", pct >= 90 ? "bg-[var(--persimmon)]" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="whitespace-nowrap tabular-nums">
          Active: {active}/{used}
        </span>
        {canUpgrade ? (
          <Link href="/dashboard/billing" className="font-medium whitespace-nowrap text-primary hover:underline">
            Upgrade for more
          </Link>
        ) : null}
      </div>
    </div>
  );
}
