import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserId, fanvueEnabled, googleEnabled } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export const instant = false;

export const metadata: Metadata = { title: "Sign in" };

// Messages for the errors Auth.js sends back here (?error=...) after a Google or Fanvue sign-in fails.
const AUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "This email already has a ViewLink account. Sign in the way you first signed up (email and password, or the other button).",
  AccessDenied: "Sign-in was cancelled or not allowed.",
  Configuration: "That sign-in option isn't available right now. Please use your email and password.",
  FanvueNoEmail: "Your Fanvue account didn't share an email address, so we can't create a ViewLink account from it. Please sign up with your email instead.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  if (await currentUserId()) redirect("/dashboard");
  const { reset, error } = await props.searchParams;
  const authError = typeof error === "string" ? (AUTH_ERRORS[error] ?? "Sign-in didn't work. Please try again.") : null;
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Welcome back</h1>
      <p className="mb-6 text-sm text-muted-foreground">Sign in to edit your page and see your stats.</p>
      {reset ? (
        <p role="status" className="mb-4 rounded-lg border border-[var(--sage)]/50 bg-[var(--sage)]/10 px-3 py-2 text-sm">
          Your password was updated. Sign in with your new password.
        </p>
      ) : null}
      {authError ? (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {authError}
        </p>
      ) : null}
      <AuthForm mode="login" googleEnabled={googleEnabled} fanvueEnabled={fanvueEnabled} />
    </>
  );
}
