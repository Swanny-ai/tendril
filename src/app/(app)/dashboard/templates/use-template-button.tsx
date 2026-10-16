"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPageAction } from "../pages-actions";
import { applyTemplateAction } from "./actions";

type Check = { state: "idle" | "checking" | "ok" | "bad"; message?: string };

/**
 * "Use template": creates a NEW page with its own link from the template (the default),
 * or restyles the page currently being edited.
 */
export function UseTemplateButton({ templateKey, name, active, appHost, suggestion }: { templateKey: string; name: string; active: boolean; appHost: string; suggestion: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(suggestion);
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [pending, start] = useTransition();

  // Live availability check, debounced. setState only happens in the timer/fetch callbacks.
  useEffect(() => {
    if (!open) return;
    const value = username.trim().toLowerCase();
    const t = setTimeout(async () => {
      if (!value) return setCheck({ state: "idle" });
      setCheck({ state: "checking" });
      try {
        const res = await fetch(`/api/username?u=${encodeURIComponent(value)}`, { cache: "no-store" });
        const data = (await res.json()) as { available: boolean; error?: string };
        setCheck(data.available ? { state: "ok", message: "Available" } : { state: "bad", message: data.error ?? "Not available" });
      } catch {
        setCheck({ state: "idle" });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [username, open]);

  const create = () =>
    start(async () => {
      const res = await createPageAction({ username, template: templateKey });
      if (!res.ok) {
        if (res.field === "username") setCheck({ state: "bad", message: res.error });
        else toast.error(res.error);
        return;
      }
      setOpen(false);
      toast.success(`Created /${res.username} with ${name}. Make it yours in the editor.`);
      router.push("/dashboard/editor");
    });

  const applyHere = () =>
    start(async () => {
      const res = await applyTemplateAction(templateKey);
      if (!res.ok) return void toast.error(res.error);
      setOpen(false);
      toast.success(`${name} applied to the page you're editing.`);
      router.push("/dashboard/editor");
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="w-full" aria-label={`Use the ${name} template`} />}>
        {active ? <Check /> : null} {active ? "Use again" : "Use template"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New page with {name}</DialogTitle>
          <DialogDescription>Every template gets its own page and link. Choose the link for this one.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <Label htmlFor={`slug-${templateKey}`}>Page link</Label>
          <div className="flex items-center overflow-hidden rounded-lg border bg-background focus-within:ring-3 focus-within:ring-ring/50">
            <span className="pl-3 text-sm text-muted-foreground">{appHost}/</span>
            <Input
              id={`slug-${templateKey}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
              autoComplete="off"
              className="border-0 pl-0.5 shadow-none focus-visible:ring-0"
            />
          </div>
          <p className={`flex items-center gap-1 text-xs ${check.state === "bad" ? "text-destructive" : check.state === "ok" ? "text-[var(--sage-text)]" : "text-muted-foreground"}`} aria-live="polite">
            {check.state === "checking" ? <Loader2 className="size-3 animate-spin" /> : check.state === "ok" ? <Check className="size-3" /> : check.state === "bad" ? <X className="size-3" /> : null}
            {check.state === "checking" ? "Checking…" : (check.message ?? "Letters, numbers, dots and underscores.")}
          </p>
          <DialogFooter className="mt-4 flex-col gap-2 sm:flex-col">
            <Button type="submit" disabled={pending || check.state === "bad" || !username.trim()} className="w-full">
              {pending ? <Loader2 className="animate-spin" /> : null} Create page
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={applyHere} className="w-full">
              Apply to the page I&apos;m editing instead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
