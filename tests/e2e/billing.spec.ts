import "dotenv/config";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import Stripe from "stripe";
import { closeDb, userIdByEmail } from "./db";
import { TEST_PASSWORD, uniqueName } from "./helpers";

const stripe = new Stripe("sk_test_signature_only");
const secret = process.env.STRIPE_WEBHOOK_SECRET!;

function subscriptionEvent(type: string, userId: string, status: string, eventId = `evt_${uniqueName("t")}`) {
  const sub = {
    id: `sub_${userId}`,
    object: "subscription",
    customer: `cus_${userId}`,
    status,
    cancel_at_period_end: false,
    metadata: { userId, plan: "pro" },
    items: { object: "list", data: [{ id: "si_1", price: { id: "price_test_pro_monthly" }, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] },
  };
  return JSON.stringify({ id: eventId, object: "event", type, data: { object: sub } });
}

async function sendWebhook(request: APIRequestContext, payload: string, sign = true) {
  const header = sign ? stripe.webhooks.generateTestHeaderString({ payload, secret }) : "t=1,v1=bad";
  return request.post("/api/stripe/webhook", { data: payload, headers: { "stripe-signature": header, "content-type": "application/json" } });
}

async function newCreator(page: Page) {
  const name = uniqueName("bill");
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${name}@tendril.test`);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Username").fill(name);
  await expect(page.getByText("Available")).toBeVisible();
  await page.getByRole("button", { name: "Claim and continue" }).click();
  await expect(page).toHaveURL(/\/edit\/template\//);
  return { name, userId: await userIdByEmail(`${name}@tendril.test`) };
}

test.afterAll(() => closeDb());

test("webhook rejects bad signatures and ignores duplicates", async ({ request }) => {
  const bad = await sendWebhook(request, subscriptionEvent("customer.subscription.created", "nobody", "active"), false);
  expect(bad.status()).toBe(400);
  const ignored = await sendWebhook(request, JSON.stringify({ id: `evt_${uniqueName()}`, object: "event", type: "charge.refunded", data: { object: {} } }));
  expect((await ignored.json()).ignored).toBe(true);
});

test("upgrade via webhook unlocks Pro, downgrade restores Free limits", async ({ page, request }) => {
  const { name, userId } = await newCreator(page);

  await page.goto("/dashboard/billing");
  await expect(page.getByText("Current plan")).toBeVisible();
  await expect(page.getByText("You're on the free plan.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Yearly/ })).toBeVisible();

  // Upgrade (as Stripe would after Checkout)
  const eventId = `evt_${uniqueName("up")}`;
  const up = await sendWebhook(request, subscriptionEvent("customer.subscription.created", userId, "active", eventId));
  expect(up.status()).toBe(200);
  const dup = await sendWebhook(request, subscriptionEvent("customer.subscription.created", userId, "active", eventId));
  expect((await dup.json()).duplicate).toBe(true);

  await page.goto("/dashboard/billing?checkout=success");
  await expect(page.getByText("You're on Pro. Enjoy!")).toBeVisible();
  await expect(page.getByText(/Renews on/)).toBeVisible();

  // Pro features: theme + badge removal
  await page.goto("/dashboard/editor");
  await page.getByRole("tab", { name: "Theme" }).click();
  await page.getByRole("button", { name: /Forest/ }).click();
  await page.getByRole("switch", { name: "Show Made with badge" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  await page.goto(`/${name}`);
  await expect(page.getByText("Made with ViewLink")).toHaveCount(0);

  // Analytics breakdowns unlocked
  await page.goto("/dashboard/analytics");
  await expect(page.getByText("Traffic sources")).toBeVisible();
  await expect(page.getByRole("link", { name: "365d" })).toBeVisible();

  // Downgrade: subscription canceled
  const down = await sendWebhook(request, subscriptionEvent("customer.subscription.deleted", userId, "canceled"));
  expect(down.status()).toBe(200);
  await page.goto(`/${name}`);
  await expect(page.getByText("Made with ViewLink")).toBeVisible();
  await page.goto("/dashboard/billing");
  await expect(page.getByText("You're on the free plan.")).toBeVisible();
});

test("checkout explains when Stripe is not configured", async ({ page }) => {
  test.skip(!!process.env.STRIPE_SECRET_KEY, "Stripe keys are configured");
  await newCreator(page);
  const res = await page.request.post("/api/billing/checkout", { data: { interval: "month" } });
  expect(res.status()).toBe(503);
  await page.goto("/dashboard/billing");
  await expect(page.getByRole("note")).toContainText("Payments aren't configured");
  await expect(page.getByRole("button", { name: /Yearly/ })).toBeDisabled();
});
