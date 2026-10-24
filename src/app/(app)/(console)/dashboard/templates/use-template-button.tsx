"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkTargetPicker, type DomainOption } from "../link-target-picker";
import { celebrate } from "@/lib/celebrate";
import { createPageAction } from "../pages-actions";

type Check = { state: "idle" | "checking" | "ok" | "bad"; message?: string };

/**
 * "Use template": creates a new bio page from the template, with its own link: the ViewLink
 * domain or a connected custom domain, at a path or at the domain's root.
 */
export function UseTemplateButton({
  templateKey,
  name,
  appHost,
  suggestion,
  domains,
}: {
  templateKey: string;
  name: string;
  appHost: string;
  suggestion: string;
  domains: DomainOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(suggestion);
  const [target, setTarget] = useState<{ domainId: string | null; atRoot: boolean }>({ domainId: null, atRoot: false });
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [domainError, setDomainError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const domain = domains.find((d) => d.id === target.domainId);

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
      setDomainError(null);
      const res = await createPageAction({ username, template: templateKey, ...target });
      if (!res.ok) {
        if (res.field === "username") setCheck({ state: "bad", message: res.error });
        else if (res.field === "domain") setDomainError(res.error);
        else toast.error(res.error);
        return;
      }
      setOpen(false);
      toast.success(`Created your ${name} page. Make it yours in the editor.`);
      celebrate();
      router.push(res.editPath ?? "/dashboard/editor");
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="w-full" aria-label={`Use the ${name} template`} />}>Use template</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New page with {name}</DialogTitle>
          <DialogDescription>Every page gets its own link. Choose where this one lives.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`domain-${templateKey}`}>Domain &amp; Path</Label>
            <LinkTargetPicker id={`domain-${templateKey}`} appHost={appHost} domains={domains} {...target} onChange={setTarget} />
            {domainError ? <p className="text-xs text-destructive">{domainError}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`slug-${templateKey}`}>Page link</Label>
            <div className="flex items-center overflow-hidden rounded-lg border bg-background focus-within:ring-3 focus-within:ring-ring/50">
              <span className="shrink-0 pl-3 text-sm whitespace-nowrap text-muted-foreground">{domain ? `${domain.hostname}/` : `${appHost}/`}</span>
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
            {target.atRoot && domain ? (
              <p className="text-xs text-muted-foreground">
                Root: the page opens at <span className="font-medium text-foreground">https://{domain.hostname}/</span>. The name above is also its backup link on{" "}
                {appHost}.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending || check.state === "bad" || !username.trim()} className="w-full">
              {pending ? <Loader2 className="animate-spin" /> : null} Create page
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
