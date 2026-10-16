"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDomainAction, removeDomainAction, verifyDomainAction } from "./actions";

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
          toast(`Remove ${hostname}? Links using it switch back to the Tendril domain.`, {
            action: {
              label: "Remove",
              onClick: () =>
                start(async () => {
                  const res = await removeDomainAction(id);
                  if (!res.ok) return void toast.error(res.error);
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
