"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PlanName } from "@/lib/plan-rules";

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
