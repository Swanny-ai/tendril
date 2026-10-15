import { expect, test, type Page } from "@playwright/test";
import { login, TEST_PASSWORD, uniqueName } from "./helpers";
import { latestLink, mailCount } from "./outbox";

async function signUp(page: Page) {
  const name = uniqueName("rec");
  const email = `${name}@tendril.test`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Username").fill(name);
  await expect(page.getByText("Available")).toBeVisible();
  await page.getByRole("button", { name: "Claim and continue" }).click();
  await expect(page).toHaveURL(/\/dashboard\/editor/);
  return { name, email };
}

test("new accounts confirm their email from the emailed link", async ({ page }) => {
  const { email } = await signUp(page);
  await expect(page.getByText("Please confirm your email")).toBeVisible();

  const link = await latestLink(email, /Confirm your email/);
  await page.goto(link);
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await expect(page.getByText("Your email is confirmed")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Please confirm your email")).toHaveCount(0);
  await page.goto("/dashboard/settings");
  await expect(page.getByText("(confirmed)")).toBeVisible();

  // Links are single-use
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
});

test("resend verification from the banner", async ({ page }) => {
  const { email } = await signUp(page);
  const before = mailCount(email);
  await page.getByRole("button", { name: "Resend email" }).click();
  await expect(page.getByText(`We sent a new link to ${email}.`)).toBeVisible();
  expect(mailCount(email)).toBe(before + 1);
});

test("password reset works once, signs out other sessions, and keeps unknown emails private", async ({ page, browser }) => {
  const { email } = await signUp(page);

  // A second device is signed in before the reset
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await login(otherPage, email, TEST_PASSWORD);

  // Request a reset (signed out)
  const fresh = await browser.newContext();
  const p = await fresh.newPage();
  await p.goto("/login");
  await p.getByRole("link", { name: "Forgot password?" }).click();
  await expect(p.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await p.getByLabel("Email").fill(email);
  await p.getByRole("button", { name: "Send reset link" }).click();
  await expect(p.getByText(/If an account exists for/)).toBeVisible();

  const link = await latestLink(email, /Reset your/);
  await p.goto(link);
  await p.getByLabel("New password").fill("short");
  await p.getByRole("button", { name: "Set new password" }).click();
  await expect(p.getByText("Use at least 8 characters")).toBeVisible();
  await p.getByLabel("New password").fill("tendril-reset-pass-2026");
  await p.getByRole("button", { name: "Set new password" }).click();
  await expect(p).toHaveURL(/\/login\?reset=1/);
  await expect(p.getByText("Your password was updated")).toBeVisible();

  // Old password fails, new one works
  await p.getByLabel("Email").fill(email);
  await p.getByLabel("Password").fill(TEST_PASSWORD);
  await p.getByRole("button", { name: "Sign in" }).click();
  await expect(p.getByText("Wrong email or password")).toBeVisible();
  await login(p, email, "tendril-reset-pass-2026");

  // The link can't be reused, and the other device was signed out
  await p.goto(link);
  await expect(p.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await otherPage.goto("/dashboard");
  await expect(otherPage).toHaveURL(/\/login/);

  // Unknown emails get the same answer and no email
  const nobody = `${uniqueName("nobody")}@tendril.test`;
  await p.goto("/forgot-password");
  await p.getByLabel("Email").fill(nobody);
  await p.getByRole("button", { name: "Send reset link" }).click();
  await expect(p.getByText(/If an account exists for/)).toBeVisible();
  expect(mailCount(nobody)).toBe(0);

  await other.close();
  await fresh.close();
});

test("tampered or missing reset tokens are rejected", async ({ page }) => {
  await page.goto("/reset-password?token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
});

test("changing the password keeps this session and signs out others", async ({ page, browser }) => {
  const { email } = await signUp(page);
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await login(otherPage, email, TEST_PASSWORD);

  await page.goto("/dashboard/settings");
  await page.getByLabel("Current password").fill(TEST_PASSWORD);
  await page.getByLabel("New password").fill("tendril-changed-2026");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Other devices have been signed out")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard(\?|$)/);
  await otherPage.goto("/dashboard");
  await expect(otherPage).toHaveURL(/\/login/);

  // A signed-out device can't revive its old session through the session update endpoint
  const csrf = await (await otherPage.request.get("/api/auth/csrf")).json();
  await otherPage.request.post("/api/auth/session", { data: { csrfToken: csrf.csrfToken, data: {} } });
  await otherPage.goto("/dashboard");
  await expect(otherPage).toHaveURL(/\/login/);
  await other.close();
});
