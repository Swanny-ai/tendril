"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction, resetPasswordAction, verifyEmailAction, type AuthFormState } from "./actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordResetAction, undefined);
  if (state?.sent) {
    return (
      <div className="space-y-4 text-center" role="status">
        <MailCheck className="mx-auto size-10 text-[var(--plum)]" aria-hidden />
        <p>
          If an account exists for <span className="font-medium">{state.email}</span>, we&apos;ve sent a link to reset your password. It works for 1 hour.
        </p>
        <Link href="/login" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} key={state?.email ?? ""} />
        {state?.fieldErrors?.email ? <p className="text-sm text-destructive">{state.fieldErrors.email}</p> : null}
      </div>
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        {state?.fieldErrors?.password ? (
          <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
        ) : (
          <p className="text-xs text-muted-foreground">At least 8 characters. You&apos;ll be signed out on other devices.</p>
        )}
      </div>
      {state?.error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}{" "}
          <Link href="/forgot-password" className="font-medium underline underline-offset-4">
            Request a new link
          </Link>
        </p>
      ) : null}
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(verifyEmailAction, undefined);
  if (state?.sent) {
    return (
      <div className="space-y-4 text-center" role="status">
        <MailCheck className="mx-auto size-10 text-[var(--sage-text)]" aria-hidden />
        <p className="font-medium">Your email is confirmed. Thanks!</p>
        <Link href="/dashboard" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Go to your dashboard
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? "Confirming…" : "Confirm my email"}
      </Button>
    </form>
  );
}
