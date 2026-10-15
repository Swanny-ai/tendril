import type { Metadata } from "next";
import { ForgotPasswordForm } from "../recovery-forms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Forgot your password?</h1>
      <p className="mb-6 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm />
    </>
  );
}
