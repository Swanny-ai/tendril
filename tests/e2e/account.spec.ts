import { expect, test, type Page } from "@playwright/test";
import { DEMO, login, TEST_PASSWORD, uniqueName } from "./helpers";

async function newCreator(page: Page) {
  const name = uniqueName("acct");
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${name}@tendril.test`);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Username").fill(name);
  await expect(page.getByText("Available")).toBeVisible();
  await page.getByRole("button", { name: "Claim and continue" }).click();
  await expect(page).toHaveURL(/\/edit\/template\//);
  return name;
}

test("landing page and claim form prefill signup", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("One link for");
  await expect(page.getByRole("heading", { name: "Simple pricing" })).toBeVisible();
  await page.getByLabel("Choose your username").fill("juno.paints");
  await page.getByRole("button", { name: "Claim your page" }).click();
  await expect(page).toHaveURL(/\/signup\?u=juno\.paints/);
  await expect(page.getByText("/juno.paints")).toBeVisible();
});

test("overview opens on the global dashboard", async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);
  await expect(page.getByRole("heading", { name: "Global dashboard" })).toBeVisible();
  await expect(page.getByText("Top performers")).toBeVisible();
});

test("change password, then sign in with the new one", async ({ page }) => {
  const name = await newCreator(page);
  await page.goto("/dashboard/settings");
  await page.getByLabel("Current password").fill("wrong-current-1");
  await page.getByLabel("New password").fill("tendril-new-pass-2026");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "current password is incorrect" })).toBeVisible();

  await page.getByLabel("Current password").fill(TEST_PASSWORD);
  await page.getByLabel("New password").fill("tendril-new-pass-2026");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Other devices have been signed out")).toBeVisible();

  await page.context().clearCookies();
  await login(page, `${name}@tendril.test`, "tendril-new-pass-2026");
});

test("deleting an account removes the public page", async ({ page }) => {
  const name = await newCreator(page);
  expect((await page.request.get(`/${name}`)).status()).toBe(200);

  await page.goto("/dashboard/settings");
  const button = page.getByRole("button", { name: "Delete my account" });
  await expect(button).toBeDisabled();
  await page.getByLabel(/Type .* to confirm/).fill(name);
  await button.click();
  await expect(page).toHaveURL(/\/\?deleted=1$/);

  expect((await page.request.get(`/${name}`)).status()).toBe(404);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
