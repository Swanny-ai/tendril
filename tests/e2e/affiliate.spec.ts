import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import "dotenv/config";
import { TEST_PASSWORD, uniqueName } from "./helpers";

async function signUp(page: Page, name: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${name}@tendril.test`);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Username").fill(name);
  await expect(page.getByText("Available")).toBeVisible();
  await page.getByRole("button", { name: "Claim and continue" }).click();
  await expect(page).toHaveURL(/\/edit\/template\//);
}

test("invite link credits the sign-up; available earnings can be paid out", async ({ page, browser }) => {
  const host = uniqueName("aff");
  await signUp(page, host);
  await page.goto("/dashboard/affiliate");
  await expect(page.getByTestId("affiliate-level")).toHaveText(/Seed · 25%/);
  const link = (await page.getByTestId("affiliate-link").textContent())!;
  const code = link.split("/join/")[1];
  expect(code).toBeTruthy();

  // A new visitor opens the invite link and signs up.
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(`/join/${code}`);
  await expect(guestPage).toHaveURL(/\/signup/);
  const friend = uniqueName("ref");
  await signUp(guestPage, friend);
  await guest.close();

  await page.reload();
  const referrals = page.getByRole("table", { name: "Your referrals" });
  await expect(referrals).toContainText(`${friend.slice(0, 3)}***@tendril.test`);
  await expect(referrals).toContainText("Free");

  // Simulate a paid invoice past the 30-day hold, as the Stripe webhook would record it.
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  await pool.query(
    `INSERT INTO "AffiliateCommission" (id, "affiliateId", "referredUserId", "invoiceId", "paidCents", rate, "amountCents", "availableAt")
     SELECT md5(random()::text), a.id, f.id, 'in_' || md5(random()::text), 12000, 25, 3000, now() - interval '1 day'
     FROM "User" a, "User" f WHERE a.email = $1 AND f.email = $2`,
    [`${host}@tendril.test`, `${friend}@tendril.test`],
  );
  await pool.end();

  await page.reload();
  await expect(page.getByTestId("affiliate-available")).toHaveText("$30.00");
  await expect(page.getByRole("button", { name: "Request payout" })).toBeDisabled();
  await page.getByLabel("PayPal or Wise email").fill(`${host}@paypal.test`);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Payout email saved.")).toBeVisible();
  await page.getByRole("button", { name: "Request payout" }).click();
  await expect(page.getByText(/Payout of \$30\.00 requested/)).toBeVisible();
  await expect(page.getByTestId("affiliate-available")).toHaveText("$0.00");
  await expect(page.getByText("Payout history")).toBeVisible();
});
