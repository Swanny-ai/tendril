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
const STEP_MS = 650;

type Step = { label: string; outcome: (r: HealthResult) => Outcome };

const worst = (list: Outcome[]): Outcome => (list.includes("fail") ? "fail" : list.includes("warn") ? "warn" : "ok");

/** What the check does, in order. Each line shows the real result of that part once it's in. */
const STEPS: Step[] = [
  { label: "Finding the link", outcome: (r) => r.live.outcome },
  ...CLIENTS.map((c) => ({ label: `Opening it in ${c.label}`, outcome: (r: HealthResult) => r.clients.find((x) => x.key === c.key)?.outcome ?? "fail" })),
  { label: "Checking the hand-off to the real browser", outcome: (r) => r.inApp.outcome },
  { label: "Checking your country rules", outcome: (r) => (r.countries.every((c) => c.ok) ? "ok" : "warn") },
  { label: "Testing where it leads", outcome: (r) => (r.destinations.length ? worst(r.destinations.map((d) => d.outcome)) : "ok") },
  { label: "Measuring the speed", outcome: (r) => (r.speedMs == null ? "fail" : r.speedMs < 2500 ? "ok" : "warn") },
];

const MARK: Record<Outcome, { icon: typeof Check; tone: string }> = {
  ok: { icon: Check, tone: "text-primary" },
  warn: { icon: TriangleAlert, tone: "text-amber-400" },
  fail: { icon: X, tone: "text-red-400" },
};

/**
 * Runs (or re-runs) a Link Health check, showing each part of it as it's gone through.
 * The checks run together on our server; the list walks through their real results one by one.
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
    timer.current = setTimeout(() => setShown((n) => n + 1), STEP_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, shown, blocked]);

  useEffect(() => {
    if (!done || !res?.ok) return;
    const t = setTimeout(() => {
      setOpen(false);
      (res.status === "healthy" ? toast.success : toast.warning)(`${VERDICT[res.status]} · ${res.left} check${res.left === 1 ? "" : "s"} left today`);
      router.refresh();
    }, 1200);
    return () => clearTimeout(t);
  }, [done, res, router]);

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

  const progress = Math.round((Math.min(shown, STEPS.length) / STEPS.length) * 100);

  return (
    <>
      <Button size="sm" variant={checked ? "outline" : "default"} disabled={open || disabled} title={disabled ? "No checks left today" : undefined} onClick={start}>
        {open ? <Loader2 className="animate-spin" /> : checked ? <RefreshCw /> : <Stethoscope />}
        {open ? "Checking…" : checked ? "Re-check" : "Check"}
      </Button>
      <Dialog open={open} onOpenChange={(o) => (o || done ? setOpen(o) : null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogTitle>{done ? (res?.ok ? VERDICT[res.status] : "Done") : "Checking your link"}</DialogTitle>
          <DialogDescription className="truncate font-mono">{label}</DialogDescription>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <ol className="space-y-2 text-sm">
            {STEPS.map((s, i) => {
              const finished = i < shown && result;
              const current = result ? i === shown : i === Math.max(0, shown - 1);
              const outcome = finished ? s.outcome(result) : null;
              const Icon = outcome ? MARK[outcome].icon : current ? Loader2 : Circle;
              return (
                <li key={s.label} className={cn("flex items-center gap-2.5", !finished && !current && "text-muted-foreground/60")}>
                  <Icon
                    className={cn("size-4 shrink-0", outcome ? MARK[outcome].tone : current ? "animate-spin text-primary" : "size-3.5")}
                    strokeWidth={outcome ? 2.75 : 2}
                    aria-hidden
                  />
                  {s.label}
                </li>
              );
            })}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
