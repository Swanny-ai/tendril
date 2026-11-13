"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { siAmericanexpress, siDinersclub, siDiscover, siJcb, siMastercard, siPaypal, siVisa } from "simple-icons";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/paddle";

const BRANDS: Record<string, { name: string; icon?: { path: string; hex: string } }> = {
  visa: { name: "Visa", icon: siVisa },
  mastercard: { name: "Mastercard", icon: siMastercard },
  american_express: { name: "Amex", icon: siAmericanexpress },
  discover: { name: "Discover", icon: siDiscover },
  jcb: { name: "JCB", icon: siJcb },
  diners_club: { name: "Diners", icon: siDinersclub },
};

/** "Visa •••• 4242", "PayPal" or "Card on file", with its logo. */
function Method({ method }: { method: PaymentMethod | null }) {
  const icon = method?.kind === "card" ? BRANDS[method.brand]?.icon : method?.kind === "paypal" ? siPaypal : undefined;
  const text =
    method?.kind === "card" ? `${BRANDS[method.brand]?.name ?? "Card"} •••• ${method.last4}` : method?.kind === "paypal" ? "PayPal" : "Card on file";
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="grid h-6 w-9 place-items-center rounded border bg-white" aria-hidden>
        {icon ? (
          <svg viewBox="0 0 24 24" className="size-4" fill={`#${icon.hex}`}>
            <path d={icon.path} />
          </svg>
        ) : (
          <CreditCard className="size-3.5 text-neutral-500" />
        )}
      </span>
      {text}
    </span>
  );
}

async function post(body: object): Promise<{ url?: string }> {
  const res = await fetch("/api/billing/subscription", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
  return json;
}

/** A card plan in one short row: plan and date, the card, and Update card / Invoices / Cancel. */
export function SubscriptionPanel({
  planLabel,
  price,
  periodEnd,
  cancelAtPeriodEnd,
  pastDue,
  method,
}: {
  planLabel: string;
  /** e.g. "$25/mo" */
  price: string;
  /** e.g. "Dec 13, 2026" */
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pastDue: boolean;
  method: PaymentMethod | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(null);
  };
  const open = (key: string, path: string, body: object) =>
    run(key, async () => {
      const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Something went wrong. Please try again.");
      window.location.assign(json.url);
    });
  const spin = (key: string) => (busy === key ? <Loader2 className="animate-spin" /> : null);

  return (
    <section aria-label="Your subscription" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {planLabel} <span className="font-normal text-muted-foreground">· {price}</span>
        </p>
        <p className={cn("text-xs", pastDue ? "text-destructive" : cancelAtPeriodEnd ? "text-amber-400" : "text-muted-foreground")}>
          {pastDue ? "Payment failed · update your card" : periodEnd ? (cancelAtPeriodEnd ? `Ends ${periodEnd}` : `Renews ${periodEnd}`) : "Active"}
        </p>
      </div>

      <Method method={method} />

      <div className="ml-auto flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => open("card", "/api/billing/subscription", { action: "update-payment" })} disabled={!!busy}>
          {spin("card")} Update card
        </Button>
        <Button variant="ghost" size="sm" onClick={() => open("portal", "/api/billing/portal", {})} disabled={!!busy}>
          {spin("portal")} Invoices
        </Button>
        {cancelAtPeriodEnd ? (
          <Button
            size="sm"
            disabled={!!busy}
            onClick={() =>
              run("resume", async () => {
                await post({ action: "resume" });
                toast.success(`${planLabel} will renew as usual.`);
                router.refresh();
              })
            }
          >
            {spin("resume")} Keep plan
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirming(true)} disabled={!!busy}>
            Cancel
          </Button>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogTitle>Cancel {planLabel}?</DialogTitle>
          <DialogDescription>
            You won&apos;t be charged again. {planLabel} stays on{periodEnd ? ` until ${periodEnd}` : " until the end of this period"}, then your account moves to Free.
          </DialogDescription>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Keep {planLabel}
            </Button>
            <Button
              variant="destructive"
              disabled={!!busy}
              onClick={() =>
                run("cancel", async () => {
                  await post({ action: "cancel" });
                  setConfirming(false);
                  toast.success(`Cancelled. ${planLabel} stays on${periodEnd ? ` until ${periodEnd}` : " until the end of this period"}.`);
                  router.refresh();
                })
              }
            >
              {spin("cancel")} Cancel subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
