import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO_MONTHLY && process.env.STRIPE_PRICE_PRO_YEARLY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (key.startsWith("sk_live_") && process.env.ALLOW_LIVE_STRIPE !== "true") {
    throw new Error("Refusing to use a live Stripe key. Set ALLOW_LIVE_STRIPE=true when you go live.");
  }
  client ??= new Stripe(key, { appInfo: { name: "Tendril" } });
  return client;
}

export type Interval = "month" | "year";

export function priceIdFor(interval: Interval): string {
  const id = interval === "year" ? process.env.STRIPE_PRICE_PRO_YEARLY : process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!id) throw new Error(`Stripe price for ${interval} is not set`);
  return id;
}

export function isProPrice(priceId: string | null | undefined): boolean {
  return !!priceId && [process.env.STRIPE_PRICE_PRO_MONTHLY, process.env.STRIPE_PRICE_PRO_YEARLY].includes(priceId);
}
