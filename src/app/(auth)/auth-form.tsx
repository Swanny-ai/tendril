"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { googleSignInAction, loginAction, signupAction, type AuthFormState } from "./actions";

export function AuthForm({ mode, googleEnabled, username }: { mode: "login" | "signup"; googleEnabled: boolean; username?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(mode === "login" ? loginAction : signupAction, undefined);

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4" noValidate>
        {username ? <input type="hidden" name="username" value={username} /> : null}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} key={state?.email ?? ""} aria-invalid={!!state?.fieldErrors?.email} />
          {state?.fieldErrors?.email ? <p className="text-sm text-destructive">{state.fieldErrors.email}</p> : null}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {mode === "login" ? (
              <Link href="/forgot-password" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            ) : null}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            aria-invalid={!!state?.fieldErrors?.password}
          />
          {state?.fieldErrors?.password ? (
            <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
          ) : mode === "signup" ? (
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          ) : null}
        </div>
        {state?.error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" className="h-10 w-full" disabled={pending}>
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      {googleEnabled ? (
        <form action={googleSignInAction}>
          <Button type="submit" variant="outline" className="h-10 w-full">
            Continue with Google
          </Button>
        </form>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/signup">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/login">
              Sign in
            </Link>
          </>
        )}
      </p>
      {mode === "signup" ? (
        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link className="underline underline-offset-4 hover:text-foreground" href="/terms">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link className="underline underline-offset-4 hover:text-foreground" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
