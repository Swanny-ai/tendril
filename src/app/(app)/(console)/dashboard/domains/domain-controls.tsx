"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DnsOption } from "@/lib/domains";
import { cn } from "@/lib/utils";
import { addDomainAction, removeDomainAction, verifyDomainAction } from "./actions";

/** The DNS records to add, with a choice between an A record and a CNAME for root domains. */
export function DnsRecords({ hostname, options }: { hostname: string; options: DnsOption[] }) {
  const [key, setKey] = useState(options[0].key);
  const [copied, setCopied] = useState<string | null>(null);
  const option = options.find((o) => o.key === key) ?? options[0];
  return (
    <div className="space-y-2">
      {options.length > 1 ? (
        <div className="inline-flex rounded-lg border bg-muted p-0.5" role="radiogroup" aria-label={`Record type for ${hostname}`}>
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={o.key === option.key}
              onClick={() => setKey(o.key)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium",
                o.key === option.key ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left">
          <thead className="bg-muted/60 text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Name / Host</th>
              <th className="px-3 py-2">Value / Points to</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {option.records.map((r) => (
              <tr key={`${r.type}-${r.name}`} className="border-t first:border-t-0">
                <td className="px-3 py-2">{r.type}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 break-all">
                  <span className="inline-flex items-center gap-1.5">
                    {r.value}
                    <button
                      type="button"
                      aria-label={`Copy ${r.value}`}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => {
                        void navigator.clipboard?.writeText(r.value);
                        setCopied(`${r.type}-${r.name}`);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                    >
                      {copied === `${r.type}-${r.name}` ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {option.note ? <p className="text-xs text-muted-foreground">{option.note}</p> : null}
    </div>
  );
}

/** Re-renders the page (which re-checks pending domains) every few seconds while it's open. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

export function AddDomainForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addDomainAction(value);
          if (!res.ok) return void toast.error(res.error);
          setValue("");
          toast.success("Domain added. Now add the DNS record shown below.");
          router.refresh();
        });
      }}
    >
      <div className="min-w-64 flex-1 space-y-1.5">
        <Label htmlFor="domain">Domain</Label>
        <Input id="domain" placeholder="links.yourname.com" value={value} onChange={(e) => setValue(e.target.value)} disabled={disabled} autoComplete="off" />
      </div>
      <Button type="submit" disabled={disabled || pending || !value.trim()}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add domain
      </Button>
    </form>
  );
}

export function DomainActions({ id, hostname, verified }: { id: string; hostname: string; verified: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={verified ? "outline" : "default"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await verifyDomainAction(id);
            if (!res.ok) return void toast.info(res.error, { duration: 8000 });
            toast.success(res.message ?? "Connected.", { duration: 8000 });
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} {verified ? "Check again" : "Check now"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        aria-label={`Remove ${hostname}`}
        onClick={() =>
          toast(`Remove ${hostname}? Links using it switch back to the ViewLink domain.`, {
            action: {
              label: "Remove",
              onClick: () =>
                start(async () => {
                  const res = await removeDomainAction(id);
                  if (!res.ok) return void toast.error(res.error);
                  if (res.message) toast.success(res.message, { duration: 8000 });
                  router.refresh();
                }),
            },
          })
        }
      >
        <Trash2 /> Remove
      </Button>
    </div>
  );
}
