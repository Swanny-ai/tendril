import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireAccount } from "@/lib/session";
import { DeleteAccountForm, PasswordForm } from "./forms";

export const instant = false;
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { userId } = await requireAccount();
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, emailVerified: true, passwordHash: true, createdAt: true, accounts: { select: { provider: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Your account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">
            {user.email}{" "}
            <span className={user.emailVerified ? "text-[var(--sage-text)]" : "text-[var(--persimmon-text)]"}>
              ({user.emailVerified ? "confirmed" : "not confirmed"})
            </span>
          </span>
          <span className="text-muted-foreground">Sign-in methods</span>
          <span className="font-medium">
            {[user.passwordHash ? "Email and password" : null, ...user.accounts.map((a) => (a.provider === "google" ? "Google" : a.provider))].filter(Boolean).join(", ")}
          </span>
          <span className="text-muted-foreground">Member since</span>
          <span className="font-medium">{user.createdAt.toLocaleDateString("en-US", { dateStyle: "long" })}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{user.passwordHash ? "Change password" : "Set a password"}</CardTitle>
          <CardDescription>Use at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm hasPassword={!!user.passwordHash} />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Delete account</CardTitle>
          <CardDescription>
            Permanently deletes your page, links and analytics, and cancels any subscription. This can&apos;t be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm email={user.email} />
        </CardContent>
      </Card>
    </div>
  );
}
