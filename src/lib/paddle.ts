import "server-only";

// Card payments through Paddle, the merchant of record: Paddle sells the Pro plan, handles tax and
// pays out. Checkout opens with Paddle.js on the billing page; the webhook (/api/paddle/webhook)
// keeps our Subscription row in sync. Sandbox or live follows the client token ("test_..." = sandbox).

export type PaddleInterval = "month" | "year";

export function paddleConfigured(): boolean {
  return Boolean(
    process.env.PADDLE_API_KEY && process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN && process.env.PADDLE_PRICE_PRO_MONTHLY && process.env.PADDLE_PRICE_PRO_YEARLY,
  );
}

export function paddleSandbox(): boolean {
  if (process.env.PADDLE_ENV) return process.env.PADDLE_ENV !== "production";
  return (process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "").startsWith("test_");
}

export function paddlePriceIds() {
  return { month: process.env.PADDLE_PRICE_PRO_MONTHLY ?? "", year: process.env.PADDLE_PRICE_PRO_YEARLY ?? "" };
}

export function isPaddleProPrice(priceId: string | null | undefined): boolean {
  const { month, year } = paddlePriceIds();
  return !!priceId && (priceId === month || priceId === year);
}

/** What the billing page needs to open the checkout in the browser (no secrets). */
export function paddleClientConfig() {
  if (!paddleConfigured()) return null;
  return { token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!, sandbox: paddleSandbox(), prices: paddlePriceIds() };
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
