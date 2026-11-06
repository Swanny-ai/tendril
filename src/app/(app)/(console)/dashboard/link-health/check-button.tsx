"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, RefreshCw, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runHealthCheckAction } from "./actions";

const VERDICT = { healthy: "Healthy", warning: "Needs attention", down: "Down" } as const;

/** Runs (or re-runs) a Link Health check on one link or page, then shows the new report. */
export function CheckButton({ kind, id, checked, disabled }: { kind: "link" | "page"; id: string; checked: boolean; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={checked ? "outline" : "default"}
      disabled={pending || disabled}
      title={disabled ? "No checks left today" : undefined}
      onClick={() =>
        start(async () => {
          const res = await runHealthCheckAction(kind, id);
          if (!res.ok) toast.error(res.error);
          else (res.status === "healthy" ? toast.success : toast.warning)(`${VERDICT[res.status]} · ${res.left} check${res.left === 1 ? "" : "s"} left today`);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : checked ? <RefreshCw /> : <Stethoscope />}
      {pending ? "Checking…" : checked ? "Re-check" : "Check"}
    </Button>
  );
}
