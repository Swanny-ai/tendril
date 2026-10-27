"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIp } from "@/lib/analytics/visitor";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordResetEmail, sendEmail, verifyEmail } from "@/lib/mailer";
import { isRateLimited, rateLimit, recordAttempt } from "@/lib/rate-limit";
import { requireUserId } from "@/lib/session";
import { consumeToken, issueToken } from "@/lib/tokens";
import { attributeReferral } from "@/lib/affiliate";
import { startTrial } from "@/lib/trial";
import { emailSchema, passwordSchema } from "@/lib/validation";

export type AuthFormState = { error?: string; fieldErrors?: Record<string, string>; email?: string; sent?: boolean } | undefined;

const FIFTEEN_MIN = 15 * 60 * 1000;

async function ip() {
  return clientIp(new Headers(await headers()));
}

/** Sends a verification email. Failures are logged, never shown, so sign-up isn't blocked. */
async function sendVerification(userId: string, email: string) {
  try {
    const token = await issueToken(userId, "EMAIL_VERIFY");
    await sendEmail(verifyEmail(email, token));
  } catch (e) {
    console.error("[auth] verification email failed", e);
  }
}

export async function signupAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = emailSchema.safeParse(form.get("email"));
  const password = passwordSchema.safeParse(form.get("password"));
  const fieldErrors: Record<string, string> = {};
  if (!email.success) fieldErrors.email = email.error.issues[0].message;
  if (!password.success) fieldErrors.password = password.error.issues[0].message;
  if (!email.success || !password.success) return { fieldErrors, email: String(form.get("email") ?? "") };

  if (!rateLimit(`signup:${await ip()}`, 10, FIFTEEN_MIN)) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const existing = await db.user.findUnique({ where: { email: email.data } });
  if (existing) return { fieldErrors: { email: "An account with this email already exists" }, email: email.data };

  const passwordHash = await bcrypt.hash(password.data, 12);
  const user = await db.user.create({ data: { email: email.data, passwordHash } });
  await attributeReferral(user.id); // arrived through someone's /join/<code> link
  await startTrial(user.id); // every new account gets a 5-day Pro trial
  await sendVerification(user.id, user.email);

  await signIn("credentials", { email: email.data, password: password.data, redirectTo: "/dashboard?welcome=1" });
  return undefined;
}

export async function loginAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "");
  // Only failed attempts count, so a user who signs in often is never locked out.
  const key = `login-fail:${await ip()}:${email.toLowerCase()}`;
  if (isRateLimited(key, 10, FIFTEEN_MIN)) {
    return { error: "Too many failed attempts. Please wait a few minutes or reset your password.", email };
  }
  try {
    await signIn("credentials", { email, password: form.get("password"), redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      recordAttempt(key, FIFTEEN_MIN);
      return { error: "Wrong email or password", email };
    }
    throw error; // NEXT_REDIRECT on success
  }
  return undefined;
}

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** Always answers the same way, so it can't be used to find out which emails have accounts. */
export async function requestPasswordResetAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { fieldErrors: { email: email.error.issues[0].message }, email: String(form.get("email") ?? "") };
  const allowed = rateLimit(`reset-ip:${await ip()}`, 5, FIFTEEN_MIN) && rateLimit(`reset-email:${email.data}`, 3, FIFTEEN_MIN);
  if (allowed) {
    const user = await db.user.findUnique({ where: { email: email.data }, select: { id: true, email: true } });
    if (user) {
      try {
        const token = await issueToken(user.id, "PASSWORD_RESET");
        await sendEmail(passwordResetEmail(user.email, token));
      } catch (e) {
        console.error("[auth] reset email failed", e);
      }
    }
  }
  return { sent: true, email: email.data };
}

export async function resetPasswordAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success) return { fieldErrors: { password: password.error.issues[0].message } };
  if (!rateLimit(`reset-submit:${await ip()}`, 10, FIFTEEN_MIN)) return { error: "Too many attempts. Please wait a few minutes." };

  const userId = await consumeToken(form.get("token"), "PASSWORD_RESET");
  if (!userId) return { error: "This reset link has expired or was already used. Request a new one." };

  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { emailVerified: true } });
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(password.data, 12),
      sessionVersion: { increment: 1 }, // sign out every existing session
      // Opening the link proves the user controls the address.
      ...(user.emailVerified ? {} : { emailVerified: new Date() }),
    },
  });
  redirect("/login?reset=1");
}

export async function verifyEmailAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const userId = await consumeToken(form.get("token"), "EMAIL_VERIFY");
  if (!userId) return { error: "This link has expired or was already used. Sign in and request a new one from your dashboard." };
  await db.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  return { sent: true };
}

export async function resendVerificationAction(): Promise<{ ok: boolean; message: string }> {
  const userId = await requireUserId();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, emailVerified: true } });
  if (user.emailVerified) return { ok: true, message: "Your email is already confirmed." };
  if (!rateLimit(`verify-resend:${userId}`, 3, FIFTEEN_MIN)) return { ok: false, message: "We just sent one. Please check your inbox, or try again in a few minutes." };
  await sendVerification(userId, user.email);
  return { ok: true, message: `We sent a new link to ${user.email}.` };
}
