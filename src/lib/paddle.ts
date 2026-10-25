import "server-only";
import { PAID_PLANS, type PaidPlan } from "@/lib/plan-rules";

// Card payments through Paddle, the merchant of record: Paddle sells the Pro and Business plans, handles tax and
// pays out. Checkout opens with Paddle.js on the billing page; the webhook (/api/paddle/webhook)
// keeps our Subscription row in sync. Sandbox or live follows the client token ("test_..." = sandbox).

export type PaddleInterval = "month" | "year";
export type PaddlePrices = Record<PaidPlan, Record<PaddleInterval, string>>;

export function paddleConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY && process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN && paddlePriceIds().PRO.month);
}

export function paddleSandbox(): boolean {
  if (process.env.PADDLE_ENV) return process.env.PADDLE_ENV !== "production";
  return (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "").startsWith("test_");
}

// Live price IDs (Catalog → Products in Paddle). They aren't secret; the env variables override
// them, e.g. with sandbox prices for testing.
const LIVE_PRICES: PaddlePrices = {
  PRO: { month: "pri_01m5rdbr99wemrnq6eczct1c27", year: "pri_01m5rdcjes0edkk3m3yhtn7g0a" },
  BUSINESS: { month: "pri_01m5rg86ryhad396r3hj7t5tcb", year: "pri_01m5rg90nedane1cjmgevk5mtd" },
};

export function paddlePriceIds(): PaddlePrices {
  const env = process.env;
  const live = !paddleSandbox();
  return {
    PRO: {
      month: env.PADDLE_PRICE_PRO_MONTHLY || (live ? LIVE_PRICES.PRO.month : ""),
      year: env.PADDLE_PRICE_PRO_YEARLY || (live ? LIVE_PRICES.PRO.year : ""),
    },
    BUSINESS: {
      month: env.PADDLE_PRICE_BUSINESS_MONTHLY || (live ? LIVE_PRICES.BUSINESS.month : ""),
      year: env.PADDLE_PRICE_BUSINESS_YEARLY || (live ? LIVE_PRICES.BUSINESS.year : ""),
    },
  };
}

/** Which plan a Paddle price buys (null = not one of ours). */
export function planForPaddlePrice(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  const prices = paddlePriceIds();
  return PAID_PLANS.find((p) => prices[p].month === priceId || prices[p].year === priceId) ?? null;
}

/** What the billing page needs to open the checkout in the browser (no secrets). */
export function paddleClientConfig() {
  if (!paddleConfigured()) return null;
  return { token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!, sandbox: paddleSandbox(), prices: paddlePriceIds() };
}

/**
 * Moves a card subscription to another plan or billing period right away. Paddle charges or credits
 * the difference for the rest of the period; the webhook then updates our Subscription row.
 */
export async function changePaddlePlan(subscriptionId: string, priceId: string): Promise<void> {
  await paddleApi(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    body: { items: [{ price_id: priceId, quantity: 1 }], proration_billing_mode: "prorated_immediately" },
  });
}

/** Calls the Paddle API; throws with Paddle's error message on failure. */
export async function paddleApi<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("PADDLE_API_KEY is not set");
  const base = paddleSandbox() ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
  const res = await fetch(base + path, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: { detail?: string; code?: string } };
  if (!res.ok) throw new Error(`Paddle ${res.status}: ${json.error?.detail ?? json.error?.code ?? "request failed"}`);
  return json.data as T;
}

/** A link to Paddle's customer portal (change card, cancel, invoices). */
export async function paddlePortalUrl(customerId: string, subscriptionId?: string | null): Promise<string> {
  const data = await paddleApi<{ urls: { general: { overview: string } } }>(`/customers/${customerId}/portal-sessions`, {
    method: "POST",
    body: subscriptionId ? { subscription_ids: [subscriptionId] } : {},
  });
  return data.urls.general.overview;
}

/** Stops a Paddle subscription right away (account deletion). */
export async function cancelPaddleSubscription(subscriptionId: string): Promise<void> {
  await paddleApi(`/subscriptions/${subscriptionId}/cancel`, { method: "POST", body: { effective_from: "immediately" } });
}
