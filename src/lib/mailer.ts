import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { appUrl, brand } from "@/config/brand";
import { parseMailFrom } from "@/lib/mail-address";

export type Email = { to: string; subject: string; text: string; html: string };

// Transport selection:
//  - "brevo":  BREVO_API_KEY is set. Free plan (300 emails/day) and works without owning a domain:
//              verify the MAIL_FROM address once in Brevo and it can send to anyone.
//  - "resend": RESEND_API_KEY is set (needs your own verified domain to email other people)
//  - "file":   development default; appends to .mail-outbox.jsonl so you (and e2e tests) can open links
//  - "disabled": production without a provider; nothing is sent and links are never logged
type Transport = "brevo" | "resend" | "file" | "disabled";

function transport(): Transport {
  const forced = process.env.MAIL_TRANSPORT;
  if (forced === "brevo" || forced === "resend" || forced === "file" || forced === "disabled") return forced;
  if (process.env.BREVO_API_KEY) return "brevo";
  if (process.env.RESEND_API_KEY) return "resend";
  return process.env.NODE_ENV === "production" ? "disabled" : "file";
}

/** True when emails actually go out (used to explain things in the UI). */
export function canSendEmail() {
  const t = transport();
  return t === "brevo" || t === "resend" || t === "file";
}

async function sendWithBrevo(email: Email): Promise<boolean> {
  const sender = parseMailFrom(process.env.MAIL_FROM, brand.name);
  if (!sender) {
    console.error("[mail] MAIL_FROM must be an address you verified in Brevo, e.g. Tendril <you@gmail.com>");
    return false;
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY ?? "", "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ sender, to: [{ email: email.to }], subject: email.subject, htmlContent: email.html, textContent: email.text }),
  });
  if (!res.ok) console.error(`[mail] Brevo error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.ok;
}

export function outboxPath() {
  return path.join(process.cwd(), ".mail-outbox.jsonl");
}

export async function sendEmail(email: Email): Promise<boolean> {
  const t = transport();
  if (t === "file") {
    await fs.appendFile(outboxPath(), JSON.stringify({ ...email, sentAt: new Date().toISOString() }) + "\n");
    console.log(`[mail] (dev outbox) to=${email.to} subject="${email.subject}" → ${outboxPath()}`);
    return true;
  }
  if (t === "disabled") {
    console.warn(`[mail] not sent (no BREVO_API_KEY or RESEND_API_KEY): subject="${email.subject}"`);
    return false;
  }
  if (t === "brevo") return sendWithBrevo(email);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM ?? `${brand.name} <no-reply@${brand.domain}>`, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
  });
  if (!res.ok) console.error(`[mail] Resend error ${res.status}`);
  return res.ok;
}

// ---- Templates (plain, original copy) ----

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, cta: { label: string; url: string }, footnote: string) {
  const url = escape(cta.url);
  return `<!doctype html><html><body style="margin:0;background:#fbf8f2;font-family:Inter,Arial,sans-serif;color:#1c1a24">
<div style="max-width:480px;margin:0 auto;padding:32px 20px">
<p style="font-weight:700;font-size:18px;margin:0 0 24px">${escape(brand.name)}</p>
<div style="background:#fff;border:1px solid #e7e2d8;border-radius:14px;padding:28px">
<h1 style="font-size:20px;margin:0 0 12px">${escape(title)}</h1>
<p style="font-size:15px;line-height:1.55;margin:0 0 22px">${body}</p>
<a href="${url}" style="display:inline-block;background:#5b3fd1;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px">${escape(cta.label)}</a>
<p style="font-size:13px;color:#5c5866;margin:22px 0 0;word-break:break-all">Or paste this link into your browser:<br>${url}</p>
</div>
<p style="font-size:12px;color:#5c5866;margin:18px 4px 0">${escape(footnote)}</p>
</div></body></html>`;
}

export function passwordResetEmail(to: string, token: string): Email {
  const url = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: `Reset your ${brand.name} password`,
    text: `Someone asked to reset the password for your ${brand.name} account.\n\nReset it here (the link works for 1 hour, once):\n${url}\n\nIf this wasn't you, you can ignore this email. Your password won't change.`,
    html: layout(
      "Reset your password",
      `Someone asked to reset the password for your ${escape(brand.name)} account. The link works once, for 1 hour.`,
      { label: "Choose a new password", url },
      "If this wasn't you, ignore this email. Your password won't change.",
    ),
  };
}

export function verifyEmail(to: string, token: string): Email {
  const url = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: `Confirm your email for ${brand.name}`,
    text: `Welcome to ${brand.name}! Confirm your email address here (the link works for 24 hours):\n${url}\n\nIf you didn't create an account, you can ignore this email.`,
    html: layout(
      "Confirm your email",
      `Welcome to ${escape(brand.name)}! Confirm this is your email so you can always get back into your account.`,
      { label: "Confirm email", url },
      "If you didn't create an account, you can ignore this email.",
    ),
  };
}
