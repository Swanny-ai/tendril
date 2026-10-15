"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appHost } from "@/config/brand";
import { claimUsernameAction, type ClaimState } from "./actions";

type Check = { state: "idle" | "checking" | "ok" | "bad"; message?: string };
type Result = { value: string; available: boolean; message?: string };

export function ClaimForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial.toLowerCase());
  const [result, setResult] = useState<Result | null>(null);
  // Derived: the check is "checking" until a result for the current value arrives.
  const check: Check = !value
    ? { state: "idle" }
    : result?.value !== value
      ? { state: "checking" }
      : result.available
        ? { state: "ok", message: "Available" }
        : { state: "bad", message: result.message };
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimUsernameAction, undefined);

  useEffect(() => {
    if (!value) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username?u=${encodeURIComponent(value)}`, { signal: ctrl.signal });
        const json = (await res.json()) as { available: boolean; error?: string };
        setResult({ value, available: json.available, message: json.error });
      } catch {
        /* aborted */
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <div className="flex items-center overflow-hidden rounded-lg border bg-background focus-within:ring-3 focus-within:ring-ring/50">
          <span className="select-none border-r bg-muted px-3 py-2 text-sm text-muted-foreground">{appHost}/</span>
          <Input
            id="username"
            name="username"
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase().replace(/\s/g, ""))}
            className="border-0 shadow-none focus-visible:ring-0"
            autoComplete="off"
            autoFocus
            maxLength={30}
            required
          />
          <span className="px-3" aria-live="polite">
            {check.state === "checking" ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
            {check.state === "ok" ? <Check className="size-4 text-[var(--sage)]" aria-label="Available" /> : null}
            {check.state === "bad" ? <X className="size-4 text-destructive" aria-label="Not available" /> : null}
          </span>
        </div>
        <p className={`text-sm ${check.state === "bad" ? "text-destructive" : "text-muted-foreground"}`}>
          {check.message ?? "Letters, numbers, dots and underscores."}
        </p>
      </div>
      {state?.error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="h-10 w-full" disabled={pending || check.state !== "ok"}>
        {pending ? "Claiming…" : "Claim and continue"}
      </Button>
    </form>
  );
}
