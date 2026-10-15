import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { peekToken } from "@/lib/tokens";
import { VerifyEmailForm } from "../recovery-forms";

export const instant = false;
export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

// Verification needs a button press (not just opening the link), because email
// security scanners often open links automatically and would use up the token.
export default async function VerifyEmailPage(props: PageProps<"/verify-email">) {
  await connection();
  const { token } = await props.searchParams;
  const valid = typeof token === "string" && (await peekToken(token, "EMAIL_VERIFY"));

  if (!valid) {
    return (
      <>
        <h1 className="mb-2 text-2xl font-semibold">This link has expired</h1>
        <p className="mb-6 text-sm text-muted-foreground">Confirmation links work once, for 24 hours. Sign in to get a new one from your dashboard.</p>
        <Link href="/dashboard" className="font-medium text-primary underline-offset-4 hover:underline">
          Go to your dashboard
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Confirm your email</h1>
      <p className="mb-6 text-sm text-muted-foreground">One click and you&apos;re done.</p>
      <VerifyEmailForm token={token as string} />
    </>
  );
}
