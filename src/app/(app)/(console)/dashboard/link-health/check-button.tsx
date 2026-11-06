"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Circle, Loader2, RefreshCw, Stethoscope, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CLIENTS, type HealthResult, type Outcome } from "@/lib/link-health-rules";
import { cn } from "@/lib/utils";
import { runHealthCheckAction, type HealthActionResult } from "./actions";

const VERDICT = { healthy: "Healthy", warning: "Needs attention", down: "Down" } as const;

type Step = {
  label: string;
  outcome: (r: HealthResult) => Outcome;
  /** What we found, in a few words (status, time, host…). */
  detail: (r: HealthResult) => string;
  /** How long that part really took on our server. */
  ms?: (r: HealthResult) => number;
};

const worst = (list: Outcome[]): Outcome => (list.includes("fail") ? "fail" : list.includes("warn") ? "warn" : "ok");
const secs = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`);
const bare = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** What the check does, in order. Each line shows the real result of that part once it's in. */
const STEPS: Step[] = [
  { label: "Finding the link", outcome: (r) => r.live.outcome, detail: (r) => r.live.note },
  ...CLIENTS.map(
    (c): Step => ({
      label: `Opening it in ${c.label}`,
      outcome: (r) => r.clients.find((x) => x.key === c.key)?.outcome ?? "fail",
      detail: (r) => {
        const x = r.clients.find((y) => y.key === c.key);
        if (!x) return "Not checked";
        const extra = x.note ? ` · ${x.note}` : x.escapes ? " · hands off to the browser" : "";
        return `${x.status ? `${x.status} · ` : ""}${secs(x.ms)}${extra}`;
      },
      ms: (r) => r.clients.find((x) => x.key === c.key)?.ms ?? 0,
    }),
  ),
  { label: "Checking the hand-off to the real browser", outcome: (r) => r.inApp.outcome, detail: (r) => r.inApp.note },
  {
    label: "Checking your country rules",
    outcome: (r) => (r.countries.every((c) => c.ok) ? "ok" : "warn"),
    detail: (r) => `${r.countries.filter((c) => c.ok).length} of ${r.countries.length} countries open${r.otherBlocked ? ` · ${r.otherBlocked} more blocked` : ""}`,
  },
  {
    label: "Testing where it leads",
    outcome: (r) => (r.destinations.length ? worst(r.destinations.map((d) => d.outcome)) : "ok"),
    detail: (r) =>
      !r.destinations.length
        ? "No links to test"
        : r.destinations.length === 1
          ? `${bare(r.destinations[0].url)} · ${r.destinations[0].status || "no answer"} · ${r.destinations[0].note}`
          : `${r.destinations.filter((d) => d.outcome !== "fail").length} of ${r.destinations.length} links work`,
    ms: (r) => Math.max(0, ...r.destinations.map((d) => d.ms)),
  },
  {
    label: "Measuring the speed",
    outcome: (r) => (r.speedMs == null ? "fail" : r.speedMs < 2500 ? "ok" : "warn"),
    detail: (r) => (r.speedMs == null ? "Didn't load" : `Loads in ${secs(r.speedMs)}`),
  },
];

/** How long a line stays on "checking": its real time on our server, plus a moment to read the line before it. */
function stepDelay(step: Step | undefined, r: HealthResult | null) {
  const real = step?.ms && r ? Math.min(step.ms(r), 2500) : 0;
  return 1100 + real + Math.round(Math.random() * 700);
}

const MARK: Record<Outcome, { icon: typeof Check; tone: string }> = {
  ok: { icon: Check, tone: "text-primary" },
  warn: { icon: TriangleAlert, tone: "text-amber-400" },
  fail: { icon: X, tone: "text-red-400" },
};

/**
 * Runs (or re-runs) a Link Health check, going through each part of it with what we found.
 * The loads run together on our server; the list walks through their real results one by one.
 */
export function CheckButton({ kind, id, label, checked, disabled }: { kind: "link" | "page"; id: string; label: string; checked: boolean; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(0);
  const [res, setRes] = useState<HealthActionResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const result = res?.ok ? res.result : null;
  // The next line waits for the server's answer before it can show a result.
  const blocked = shown > 0 && !result;
  const done = !!result && shown >= STEPS.length;

  useEffect(() => {
    if (!open || blocked || shown >= STEPS.length) return;
    timer.current = setTimeout(() => setShown((n) => n + 1), stepDelay(STEPS[shown], result));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, shown, blocked, result]);

  // Once every line is through, update the report behind the window; the window stays until closed.
  useEffect(() => {
    if (done) router.refresh();
  }, [done, router]);

  const start = async () => {
    setRes(null);
    setShown(0);
    setOpen(true);
    const r = await runHealthCheckAction(kind, id);
    if (!r.ok) {
      setOpen(false);
      toast.error(r.error);
      return;
    }
    setRes(r);
  };

  const close = () => {
    setOpen(false);
    if (res?.ok) (res.status === "healthy" ? toast.success : toast.warning)(`${VERDICT[res.status]} · ${res.left} check${res.left === 1 ? "" : "s"} left today`);
  };

  const progress = Math.round((Math.min(shown, STEPS.length) / STEPS.length) * 100);

  return (
    <>
      <Button size="sm" variant={checked ? "outline" : "default"} disabled={open || disabled} title={disabled ? "No checks left today" : undefined} onClick={start}>
        {open ? <Loader2 className="animate-spin" /> : checked ? <RefreshCw /> : <Stethoscope />}
        {open ? "Checking…" : checked ? "Re-check" : "Check"}
      </Button>
      <Dialog open={open} onOpenChange={(o) => (!o && done ? close() : null)}>
        <DialogContent showCloseButton={false} className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>{done && res?.ok ? VERDICT[res.status] : "Checking your link"}</DialogTitle>
          <DialogDescription className="truncate font-mono">{label}</DialogDescription>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} />
            </div>
            <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">
              {Math.min(shown, STEPS.length)} / {STEPS.length}
            </span>
          </div>
          <ol className="space-y-2.5 text-sm">
            {STEPS.map((s, i) => {
              const finished = i < shown && result;
              const current = result ? i === shown : i === Math.max(0, shown - 1);
              const outcome = finished ? s.outcome(result) : null;
              const Icon = outcome ? MARK[outcome].icon : current ? Loader2 : Circle;
              return (
                <li key={s.label} className={cn("flex gap-2.5", !finished && !current && "text-muted-foreground/50")}>
                  <Icon
                    className={cn("mt-0.5 size-4 shrink-0", outcome ? MARK[outcome].tone : current ? "animate-spin text-primary" : "size-3.5")}
                    strokeWidth={outcome ? 2.75 : 2}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className={cn(current && "font-medium")}>{s.label}</div>
                    {finished ? <div className="truncate text-xs text-muted-foreground">{s.detail(result)}</div> : current ? <div className="text-xs text-muted-foreground">Checking…</div> : null}
                  </div>
                </li>
              );
            })}
          </ol>
          {done ? (
            <Button className="w-full" onClick={close}>
              See the report
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
