import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { peekToken } from "@/lib/tokens";
import { ResetPasswordForm } from "../recovery-forms";

export const instant = false;
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  await connection();
  const { token } = await props.searchParams;
  const valid = typeof token === "string" && (await peekToken(token, "PASSWORD_RESET"));

  if (!valid) {
    return (
      <>
        <h1 className="mb-2 text-2xl font-semibold">This link has expired</h1>
        <p className="mb-6 text-sm text-muted-foreground">Reset links work once, for 1 hour. You can ask for a new one.</p>
        <Link href="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
          Send me a new link
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Choose a new password</h1>
      <p className="mb-6 text-sm text-muted-foreground">Pick something you don&apos;t use anywhere else.</p>
      <ResetPasswordForm token={token as string} />
    </>
  );
}
