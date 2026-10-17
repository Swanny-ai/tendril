import { expect, test } from "@playwright/test";
import { DEMO, login, TEST_PASSWORD, uniqueName } from "./helpers";

test("sign up, claim a username, land in the editor", async ({ page }) => {
  const name = uniqueName("new");
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${name}@tendril.test`);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Username").fill("admin");
  await expect(page.getByText("That name is reserved")).toBeVisible();
  await page.getByLabel("Username").fill(name);
  await expect(page.getByText("Available")).toBeVisible();
  await page.getByRole("button", { name: "Claim and continue" }).click();

  await expect(page).toHaveURL(/\/edit\/template\//);
  await expect(page.getByText("2 / 12 blocks")).toBeVisible();
  // Public page exists right away.
  const res = await page.request.get(`/${name}`);
  expect(res.status()).toBe(200);
});

test("signup validation and duplicate email", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();

  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("An account with this email already exists")).toBeVisible();
});

test("login errors keep the email, then succeed; logout protects the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password").fill("wrong-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Wrong email or password" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(DEMO.email);

  await page.getByLabel("Password").fill(DEMO.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard(\?|$)/);

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("signed-in users skip login and onboarding", async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard/);
});
