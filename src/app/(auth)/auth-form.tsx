"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fanvueSignInAction, googleSignInAction, loginAction, signupAction, type AuthFormState } from "./actions";

export function AuthForm({
  mode,
  googleEnabled,
  fanvueEnabled = false,
  username,
}: {
  mode: "login" | "signup";
  googleEnabled: boolean;
  fanvueEnabled?: boolean;
  username?: string;
}) {
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

      {googleEnabled || fanvueEnabled ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          {googleEnabled ? (
            <form action={googleSignInAction}>
              <Button type="submit" variant="outline" className="h-10 w-full gap-2">
                <GoogleIcon /> {mode === "login" ? "Continue with Google" : "Sign up with Google"}
              </Button>
            </form>
          ) : null}
          {fanvueEnabled ? (
            <form action={fanvueSignInAction}>
              <Button type="submit" variant="outline" className="h-10 w-full gap-2">
                <FanvueIcon /> {mode === "login" ? "Continue with Fanvue" : "Sign up with Fanvue"}
              </Button>
            </form>
          ) : null}
        </div>
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

/** Google's "G" mark, as Google's sign-in guidelines ask for on the button. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.27a12 12 0 0 0 0 10.8l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.6l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

/** Fanvue's app icon (their green tile), for the "Continue with Fanvue" button. */
function FanvueIcon() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brands/fanvue-icon.png" alt="" aria-hidden width={18} height={18} className="size-[18px] rounded-[5px]" />;
}
