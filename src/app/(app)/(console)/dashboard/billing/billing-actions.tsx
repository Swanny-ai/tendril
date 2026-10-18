"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bitcoin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PRICES_USD, type PlanName } from "@/lib/plan-rules";

async function postForUrl(path: string, body?: object) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !json.url)
    throw new Error(json.error ?? "Something went wrong. Please try again.");
  window.location.assign(json.url);
}

export function UpgradeButtons({ disabled }: { disabled: boolean }) {
  const [busy, setBusy] = useState<"month" | "year" | null>(null);
  async function go(interval: "month" | "year") {
    setBusy(interval);
    try {
      await postForUrl("/api/billing/checkout", { interval });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  }
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        size="lg"
        disabled={disabled || !!busy}
        onClick={() => go("year")}
      >
        {busy === "year" ? <Loader2 className="animate-spin" /> : null} Yearly ·
        ${PRICES_USD.yearly}
      </Button>
      <Button
        size="lg"
        variant="outline"
        disabled={disabled || !!busy}
        onClick={() => go("month")}
      >
        {busy === "month" ? <Loader2 className="animate-spin" /> : null} Monthly
        · ${PRICES_USD.monthly}
      </Button>
    </div>
  );
}

/** Pay for Pro in crypto (prepaid; the NOWPayments page lets the buyer pick the coin). */
export function CryptoButtons({
  disabled,
  label = "Pay with crypto",
}: {
  disabled: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState<"month" | "year" | null>(null);
  async function go(interval: "month" | "year") {
    setBusy(interval);
    try {
      await postForUrl("/api/billing/crypto", { interval });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  }
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Bitcoin className="size-4 text-[var(--plum)]" aria-hidden /> {label}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={disabled || !!busy}
          onClick={() => go("year")}
        >
          {busy === "year" ? <Loader2 className="animate-spin" /> : null} 1 year
          · ${PRICES_USD.yearly}
        </Button>
        <Button
          variant="outline"
          disabled={disabled || !!busy}
          onClick={() => go("month")}
        >
          {busy === "month" ? <Loader2 className="animate-spin" /> : null} 1
          month · ${PRICES_USD.monthly}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        USDT, USDC, BTC, ETH, SOL and more. Prepaid: nothing renews
        automatically.
      </p>
    </div>
  );
}

export function ManageButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await postForUrl("/api/billing/portal");
        } catch (e) {
          toast.error((e as Error).message);
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : null} Manage subscription
    </Button>
  );
}

/** After Checkout, waits (up to ~10s) for the webhook to mark the account as Pro. */
export function CheckoutStatus({
  state,
  plan,
}: {
  state: string | null;
  plan: PlanName;
}) {
  const router = useRouter();
  const crypto = state === "crypto";
  const [waiting, setWaiting] = useState(
    (state === "success" || crypto) && plan !== "PRO",
  );

  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const timer = setInterval(
      async () => {
        tries++;
        const res = await fetch("/api/billing/status")
          .then((r) => r.json())
          .catch(() => null);
        if (res?.plan === "PRO" || tries >= (crypto ? 180 : 10)) {
          clearInterval(timer);
          setWaiting(false);
          router.replace("/dashboard/billing");
          router.refresh();
        }
      },
      crypto ? 3000 : 1000,
    );
    return () => clearInterval(timer);
  }, [waiting, router, crypto]);

  if (state === "canceled")
    return (
      <p className="rounded-lg border px-4 py-3 text-sm">
        Checkout canceled. You haven&apos;t been charged.
      </p>
    );
  if (waiting)
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
      >
        <Loader2 className="size-4 animate-spin" />{" "}
        {crypto
          ? "Waiting for your crypto payment to confirm. This can take a few minutes; this page updates by itself."
          : "Confirming your upgrade…"}
      </p>
    );
  if ((state === "success" || crypto) && plan === "PRO")
    return (
      <p className="rounded-lg border border-[var(--sage)]/50 bg-[var(--sage)]/10 px-4 py-3 text-sm">
        You&apos;re on Pro. Enjoy!
      </p>
    );
  return null;
}
