import "server-only";
import { PAID_PLANS, type PaidPlan } from "@/lib/plan-rules";

// Card payments through Paddle, the merchant of record: Paddle sells the paid plans, handles tax and
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
  AGENCY: { month: "pri_01m79b8cnfjxxvckfem8n3nfkq", year: "pri_01m79ba6ds74hx0jqd5f3x5ham" },
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
    AGENCY: {
      month: env.PADDLE_PRICE_AGENCY_MONTHLY || (live ? LIVE_PRICES.AGENCY.month : ""),
      year: env.PADDLE_PRICE_AGENCY_YEARLY || (live ? LIVE_PRICES.AGENCY.year : ""),
    },
  };
}

/** Which plan a Paddle price buys (null = not one of ours). */
export function planForPaddlePrice(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  const prices = paddlePriceIds();
  return PAID_PLANS.find((p) => (prices[p].month && prices[p].month === priceId) || (prices[p].year && prices[p].year === priceId)) ?? null;
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

/** "Cancel subscription": the plan stays on until the end of the period already paid for, then stops. */
export async function cancelPaddleAtPeriodEnd(subscriptionId: string): Promise<void> {
  await paddleApi(`/subscriptions/${subscriptionId}/cancel`, { method: "POST", body: { effective_from: "next_billing_period" } });
}

/** "Keep my plan": takes back a cancellation that hasn't happened yet, so it renews again. */
export async function resumePaddleSubscription(subscriptionId: string): Promise<void> {
  await paddleApi(`/subscriptions/${subscriptionId}`, { method: "PATCH", body: { scheduled_change: null } });
}

/** What the customer pays with, in plain words for the billing page. */
export type PaymentMethod = { kind: "card"; brand: string; last4: string; expMonth: number | null; expYear: number | null } | { kind: "paypal"; email: string | null } | { kind: "other"; label: string };

type MethodDetails = { type?: string; card?: { type?: string; last4?: string; expiry_month?: number; expiry_year?: number } | null; paypal?: { email?: string } | null };

function describe(m: MethodDetails | null | undefined): PaymentMethod | null {
  if (!m?.type) return null;
  if (m.type === "card" && m.card?.last4) {
    return { kind: "card", brand: m.card.type ?? "card", last4: m.card.last4, expMonth: m.card.expiry_month ?? null, expYear: m.card.expiry_year ?? null };
  }
  if (m.type === "paypal") return { kind: "paypal", email: m.paypal?.email ?? null };
  return { kind: "other", label: m.type.replace(/_/g, " ") };
}

/**
 * The payment method a subscription is charged with: the one used for its latest paid
 * transaction, else the customer's saved one. Null when Paddle can't tell us.
 */
export async function paddlePaymentMethod(customerId: string, subscriptionId: string | null): Promise<PaymentMethod | null> {
  if (subscriptionId) {
    const txs = await paddleApi<{ payments?: { status?: string; method_details?: MethodDetails }[] }[]>(
      `/transactions?subscription_id=${subscriptionId}&status=completed,paid&order_by=billed_at[DESC]&per_page=1`,
    );
    const paid = txs[0]?.payments?.find((p) => p.status === "captured") ?? txs[0]?.payments?.[0];
    const found = describe(paid?.method_details);
    if (found) return found;
  }
  const saved = await paddleApi<MethodDetails[]>(`/customers/${customerId}/payment-methods?per_page=5`);
  return describe(saved[0]);
}

/** Paddle's own page for changing the card a subscription is charged with. */
export async function paddleUpdatePaymentUrl(customerId: string, subscriptionId: string): Promise<string> {
  const data = await paddleApi<{ urls: { general: { overview: string }; subscriptions?: { id: string; update_subscription_payment_method?: string }[] } }>(
    `/customers/${customerId}/portal-sessions`,
    { method: "POST", body: { subscription_ids: [subscriptionId] } },
  );
  return data.urls.subscriptions?.find((s) => s.id === subscriptionId)?.update_subscription_payment_method ?? data.urls.general.overview;
}
