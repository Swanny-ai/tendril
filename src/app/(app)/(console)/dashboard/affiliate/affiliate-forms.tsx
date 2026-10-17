"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { QrCodeButton } from "@/components/qr-code-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPayoutAction, savePayoutEmailAction, updateAffiliateCodeAction, type AffiliateResult } from "./actions";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<AffiliateResult>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      if (res.message) toast.success(res.message);
      router.refresh();
    });
  return { pending, run };
}

/** Your referral link with copy and QR, and the code it uses. */
export function ShareLink({ link, code }: { link: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [value, setValue] = useState(code);
  const { pending, run } = useAction();
  return (
    <div className="space-y-4">
      <div className="flex min-w-0 items-center gap-1 rounded-xl border bg-background py-1.5 pr-1.5 pl-3">
        <span className="min-w-0 flex-1 truncate font-mono text-sm" data-testid="affiliate-link">
          {link.replace(/^https?:\/\//, "")}
        </span>
        <Button
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy link"}
        </Button>
        <QrCodeButton url={link} filename={`tendril-invite-${code}`} />
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateAffiliateCodeAction(value));
        }}
      >
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="affiliate-code">Your code</Label>
          <Input id="affiliate-code" value={value} maxLength={20} autoComplete="off" onChange={(e) => setValue(e.target.value.toLowerCase())} />
        </div>
        <Button type="submit" variant="outline" disabled={pending || value === code}>
          {pending ? <Loader2 className="animate-spin" /> : null} Save code
        </Button>
      </form>
    </div>
  );
}

/** Payout email and the request button. */
export function PayoutForm({ email, canRequest }: { email: string | null; canRequest: boolean }) {
  const [value, setValue] = useState(email ?? "");
  const { pending, run } = useAction();
  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => savePayoutEmailAction(value));
        }}
      >
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="payout-email">PayPal or Wise email</Label>
          <Input id="payout-email" type="email" value={value} placeholder="you@example.com" onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={pending || !value.trim() || value === email}>
          Save
        </Button>
      </form>
      <Button className="w-full" disabled={pending || !canRequest} onClick={() => run(requestPayoutAction)}>
        {pending ? <Loader2 className="animate-spin" /> : null} Request payout
      </Button>
    </div>
  );
}
