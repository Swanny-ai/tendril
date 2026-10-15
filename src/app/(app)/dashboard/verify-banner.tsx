"use client";

import { useState, useTransition } from "react";
import { MailWarning, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendVerificationAction } from "../../(auth)/actions";

export function VerifyBanner({ email }: { email: string }) {
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  if (hidden) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 border-b bg-[var(--persimmon)]/10 px-4 py-2.5 text-sm md:px-8">
      <MailWarning className="size-4 shrink-0 text-[var(--persimmon-text)]" aria-hidden />
      <p className="flex-1">
        Please confirm your email (<span className="font-medium">{email}</span>) so you can always recover your account.
      </p>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await resendVerificationAction();
            if (res.ok) toast.success(res.message);
            else toast.error(res.message);
          })
        }
      >
        {pending ? "Sending…" : "Resend email"}
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Hide for now" onClick={() => setHidden(true)}>
        <X />
      </Button>
    </div>
  );
}
