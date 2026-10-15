import { expect, type Page } from "@playwright/test";

// Local-only test credentials (see prisma/seed.mts).
export const DEMO = { email: "demo@tendril.test", password: "tendril-demo-2026", username: "demo" };
export const TEST_PASSWORD = "tendril-e2e-pass-2026";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export function uniqueName(prefix = "e2e") {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
