"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountAction, type SettingsState } from "./actions";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, setState] = useState<SettingsState>(undefined);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        setState({ ok: true });
        formRef.current?.reset();
      } else {
        setState({ error: json.error ?? "Something went wrong. Please try again." });
      }
    } catch {
      setState({ error: "You seem to be offline. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="max-w-sm space-y-4">
      {hasPassword ? (
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-[var(--sage-text)]">
          Password updated. Other devices have been signed out.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(deleteAccountAction, undefined);
  const [value, setValue] = useState("");
  return (
    <form action={action} className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="confirm">
          Type your email <span className="font-mono font-semibold">{email}</span> to confirm
        </Label>
        <Input id="confirm" name="confirm" type="email" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="destructive" disabled={pending || value.trim().toLowerCase() !== email.toLowerCase()}>
        {pending ? "Deleting…" : "Delete my account"}
      </Button>
    </form>
  );
}
