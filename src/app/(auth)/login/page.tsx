import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserId, googleEnabled } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export const instant = false;

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await currentUserId()) redirect("/dashboard");
  const { reset } = await props.searchParams;
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Welcome back</h1>
      <p className="mb-6 text-sm text-muted-foreground">Sign in to edit your page and see your stats.</p>
      {reset ? (
        <p role="status" className="mb-4 rounded-lg border border-[var(--sage)]/50 bg-[var(--sage)]/10 px-3 py-2 text-sm">
          Your password was updated. Sign in with your new password.
        </p>
      ) : null}
      <AuthForm mode="login" googleEnabled={googleEnabled} />
    </>
  );
}
