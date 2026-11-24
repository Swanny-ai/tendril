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
    console.error("[mail] MAIL_FROM must be an address you verified in Brevo, e.g. ViewLink <you@gmail.com>");
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

// Email-safe layout: tables and inline styles (Gmail, Outlook, Apple Mail). Images must be PNG on
// the live site (email apps don't show SVG), so the logo is always loaded from https://<brand.domain>.
const SITE = `https://${brand.domain}`;
const LOGO = `${SITE}/icon-192.png`;

function layout(title: string, body: string, cta: { label: string; url: string }, footnote: string, preheader: string) {
  const url = escape(cta.url);
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#101510;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#131e15;background-image:linear-gradient(180deg,#131e15 0%,#152418 45%,#101110 100%)" bgcolor="#131e15">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;font-family:Inter,'Segoe UI',Helvetica,Arial,sans-serif;color:#ffffff">

<tr><td align="center" style="padding:0 0 22px">
<a href="${SITE}" style="text-decoration:none;color:#ffffff">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle"><img src="${LOGO}" width="40" height="40" alt="${escape(brand.name)}" style="display:block;border:0;border-radius:10px"></td>
<td style="vertical-align:middle;padding-left:10px;font-size:22px;font-weight:800;letter-spacing:-0.3px;color:#ffffff">View<span style="color:#49f264">Link</span></td>
</tr></table></a>
</td></tr>

<tr><td style="background:#0e1610;border:1px solid #23392a;border-radius:18px;overflow:hidden" bgcolor="#0e1610">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="height:6px;background:#49f264;font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:34px 34px 30px">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.3px;color:#ffffff">${escape(title)}</h1>
<p style="margin:0 0 26px;font-size:15px;line-height:1.6;color:#c9cdca">${body}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" style="border-radius:999px;background:#49f264;box-shadow:0 10px 24px -8px rgba(73,242,100,.55)" bgcolor="#49f264">
<a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#0a0a0a;text-decoration:none;border-radius:999px">${escape(cta.label)} &rarr;</a>
</td></tr></table>
<p style="margin:28px 0 6px;font-size:12px;color:#8a8f8b">Button not working? Paste this link into your browser:</p>
<p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all"><a href="${url}" style="color:#49f264;text-decoration:underline">${url}</a></p>
</td></tr>
<tr><td style="padding:16px 34px;background:#0b120d;border-top:1px solid #1d2f22;font-size:12px;line-height:1.5;color:#8a8f8b" bgcolor="#0b120d">${escape(footnote)}</td></tr>
</table>
</td></tr>

<tr><td align="center" style="padding:24px 12px 0;font-size:12px;line-height:1.6;color:#6f7470">
<a href="${SITE}" style="color:#49f264;text-decoration:none;font-weight:600">${escape(brand.domain)}</a>
&nbsp;&middot;&nbsp;
<a href="mailto:${escape(brand.supportEmail)}" style="color:#a3a3a3;text-decoration:none">${escape(brand.supportEmail)}</a><br>
${escape(brand.tagline)}<br>
&copy; ${year} ${escape(brand.name)}. You got this email because of activity on your ${escape(brand.name)} account.
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

export function passwordResetEmail(to: string, token: string): Email {
  const url = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    to,
    subject: `Reset your ${brand.name} password`,
    text: `Someone asked to reset the password for your ${brand.name} account.\n\nReset it here (the link works for 1 hour, once):\n${url}\n\nIf this wasn't you, you can ignore this email. Your password won't change.`,
    html: layout(
      "Reset your password",
      `We got a request to reset the password for your ${escape(brand.name)} account. Tap the button below to choose a new one. For your security, the link works <b style="color:#ffffff">once</b> and expires in <b style="color:#ffffff">1 hour</b>.`,
      { label: "Choose a new password", url },
      "If you didn't ask for this, you can ignore this email. Your password won't change.",
      "Choose a new password for your ViewLink account. The link works once, for 1 hour.",
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
      `Welcome to ${escape(brand.name)}! Confirm this is your email address so you can always get back into your account. The link works for <b style="color:#ffffff">24 hours</b>.`,
      { label: "Confirm email", url },
      "If you didn't create an account, you can ignore this email.",
      "One click to confirm your email and secure your ViewLink account.",
    ),
  };
}
