import "server-only";
import { appUrl } from "@/config/brand";
import { creditReferral } from "@/lib/affiliate";
import { db } from "@/lib/db";
import { invalidatePageFromRoute } from "@/lib/pages";
import { extendPrepaid, PRICES_USD } from "@/lib/plan-rules";
import { invalidateUserSmartLinksFromRoute } from "@/lib/smart-links";

// Pro paid in crypto through NOWPayments (hosted invoice page; the buyer picks the coin there).
// Crypto can't renew by itself, so each payment adds a prepaid month or year of Pro.
//   NOWPAYMENTS_API_KEY      API key (Store settings → API keys)
//   NOWPAYMENTS_IPN_SECRET   IPN secret key (Store settings → Instant payment notifications)
//   NOWPAYMENTS_API_URL      optional, e.g. https://api-sandbox.nowpayments.io/v1 for the sandbox

export type CryptoInterval = "month" | "year";

const API = () => (process.env.NOWPAYMENTS_API_URL || "https://api.nowpayments.io/v1").replace(/\/$/, "");

export function cryptoConfigured(): boolean {
  return Boolean(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET);
}

export const cryptoPriceCents = (interval: CryptoInterval) => (interval === "year" ? PRICES_USD.yearly : PRICES_USD.monthly) * 100;

/** Creates an invoice for one month/year of Pro and returns the NOWPayments page to pay on. */
export async function createCryptoInvoice(userId: string, interval: CryptoInterval): Promise<string> {
  const amountCents = cryptoPriceCents(interval);
  const payment = await db.cryptoPayment.create({ data: { userId, interval, amountCents } });
  const res = await fetch(`${API()}/invoice`, {
    method: "POST",
    headers: { "x-api-key": process.env.NOWPAYMENTS_API_KEY!, "content-type": "application/json" },
    body: JSON.stringify({
      price_amount: amountCents / 100,
      price_currency: "usd",
      order_id: payment.id,
      order_description: `ViewLink Pro, 1 ${interval}`,
      ipn_callback_url: `${appUrl}/api/crypto/ipn`,
      success_url: `${appUrl}/dashboard/billing?checkout=crypto`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=canceled`,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string | number; invoice_url?: string; message?: string };
  if (!res.ok || !json.invoice_url) {
    await db.cryptoPayment.update({ where: { id: payment.id }, data: { status: "failed" } });
    console.error("[crypto] invoice failed", res.status, json.message);
    throw new Error("Couldn't start the crypto payment. Please try again.");
  }
  await db.cryptoPayment.update({ where: { id: payment.id }, data: { invoiceId: json.id != null ? String(json.id) : null } });
  return json.invoice_url;
}

export type IpnBody = {
  order_id?: string;
  invoice_id?: string | number;
  payment_id?: string | number;
  payment_status?: string;
  price_amount?: number | string;
  price_currency?: string;
  pay_currency?: string;
};

/**
 * Applies a (signature-checked) NOWPayments notification. A "finished" payment for the full price
 * adds one prepaid month/year of Pro, once; other statuses are only recorded.
 */
export async function applyCryptoIpn(body: IpnBody): Promise<"paid" | "updated" | "ignored"> {
  if (!body.order_id || !body.payment_status) return "ignored";
  const payment = await db.cryptoPayment.findUnique({ where: { id: body.order_id } });
  if (!payment) return "ignored";

  const status = String(body.payment_status);
  const paidInFull =
    status === "finished" &&
    String(body.price_currency ?? "").toLowerCase() === "usd" &&
    Math.round(Number(body.price_amount ?? 0) * 100) >= payment.amountCents;

  if (!paidInFull || payment.paidAt) {
    if (!payment.paidAt) await db.cryptoPayment.update({ where: { id: payment.id }, data: { status, payCurrency: body.pay_currency ?? payment.payCurrency } });
    return payment.paidAt ? "ignored" : "updated";
  }

  const now = new Date();
  const paid = await db.$transaction(async (tx) => {
    // Marks it paid only if nobody else did first (notifications can arrive more than once).
    const claimed = await tx.cryptoPayment.updateMany({ where: { id: payment.id, paidAt: null }, data: { status, paidAt: now, payCurrency: body.pay_currency ?? null } });
    if (!claimed.count) return false;
    const sub = await tx.subscription.findUnique({ where: { userId: payment.userId }, select: { status: true, currentPeriodEnd: true } });
    const end = extendPrepaid(sub?.status === "prepaid" ? sub.currentPeriodEnd : null, payment.interval === "year" ? "year" : "month", now);
    await tx.subscription.upsert({
      where: { userId: payment.userId },
      create: { userId: payment.userId, plan: "PRO", status: "prepaid", currentPeriodEnd: end, cancelAtPeriodEnd: true },
      update: { plan: "PRO", status: "prepaid", currentPeriodEnd: end, cancelAtPeriodEnd: true },
    });
    return true;
  });
  if (!paid) return "ignored";

  await creditReferral(payment.userId, payment.amountCents, `crypto_${payment.id}`, now);
  await invalidatePageFromRoute({ userId: payment.userId });
  await invalidateUserSmartLinksFromRoute(payment.userId);
  return "paid";
}
