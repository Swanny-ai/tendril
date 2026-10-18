import { expect, test, type APIRequestContext } from "@playwright/test";
import pg from "pg";
import "dotenv/config";
import { nowpaymentsSignature } from "../../src/lib/crypto-sig";
import { TEST_PASSWORD, uniqueName } from "./helpers";

// Needs NOWPAYMENTS_IPN_SECRET (any test value) and NOWPAYMENTS_API_KEY in .env for the dev server.
const SECRET = process.env.NOWPAYMENTS_IPN_SECRET ?? "";
test.skip(!SECRET, "NOWPAYMENTS_IPN_SECRET not set");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
test.afterAll(() => pool.end());

function ipn(request: APIRequestContext, body: object, secret = SECRET) {
  return request.post("/api/crypto/ipn", { data: JSON.stringify(body), headers: { "content-type": "application/json", "x-nowpayments-sig": nowpaymentsSignature(body, secret) } });
}

test("a finished crypto payment gives prepaid Pro once; bad signatures are rejected", async ({ page, request }) => {
  const name = uniqueName("cry");
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${name}@tendril.test`);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Username").fill(name);
  await expect(page.getByText("Available")).toBeVisible();
  await page.getByRole("button", { name: "Claim and continue" }).click();
  await expect(page).toHaveURL(/\/edit\/template\//);

  await page.goto("/dashboard/billing");
  await expect(page.getByText(/pay with crypto/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /1 month/ })).toBeVisible();

  // A payment record as the invoice endpoint creates it (the real call goes to NOWPayments).
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO "CryptoPayment" (id, "userId", interval, "amountCents") SELECT 'cp_' || md5(random()::text), id, 'month', 600 FROM "User" WHERE email = $1 RETURNING id`,
    [`${name}@tendril.test`],
  );
  const orderId = rows[0].id;
  const finished = { payment_id: 1, invoice_id: 2, order_id: orderId, payment_status: "finished", price_amount: 6, price_currency: "usd", pay_currency: "usdttrc20" };

  expect((await ipn(request, finished, "wrong-secret")).status()).toBe(401);
  expect((await ipn(request, { ...finished, payment_status: "confirming" })).ok()).toBe(true);
  await page.reload();
  await expect(page.getByText("You're on the free plan.")).toBeVisible();

  const paid = await ipn(request, finished);
  expect((await paid.json()).result).toBe("paid");
  expect((await (await ipn(request, finished)).json()).result).toBe("ignored"); // sent twice: counted once

  await page.goto("/dashboard/billing?checkout=crypto");
  await expect(page.getByText(/Pro until .*paid with crypto/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add more Pro time" }).or(page.getByText("Add more Pro time"))).toBeVisible();

  const end = await pool.query<{ end: Date }>(`SELECT "currentPeriodEnd" AS end FROM "Subscription" s JOIN "User" u ON u.id = s."userId" WHERE u.email = $1`, [`${name}@tendril.test`]);
  const days = (end.rows[0].end.getTime() - Date.now()) / 86_400_000;
  expect(days).toBeGreaterThan(27);
  expect(days).toBeLessThan(32);
});
