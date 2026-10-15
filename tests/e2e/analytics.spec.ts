import { expect, test } from "@playwright/test";
import { DEMO, login } from "./helpers";

test("free plan sees totals and links, with breakdowns locked", async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);
  await page.goto("/dashboard/analytics");
  for (const label of [/^Views$/, /^Visitors/, /^Clicks$/, /^Click-through rate$/]) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
  await expect(page.getByText("Views and clicks", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Spring glaze collection/ })).toBeVisible();
  await expect(page.getByText("See where your visitors come from")).toBeVisible();
  await expect(page.getByText("90d")).toBeVisible();
  await expect(page.getByRole("link", { name: "90d" })).toHaveCount(0);

  // A free user asking for a year gets clamped to 30 days
  await page.goto("/dashboard/analytics?range=365d");
  await expect(page.getByText("Last 30 days")).toBeVisible();
});

test("analytics API requires auth and returns data", async ({ page, request }) => {
  const anon = await request.get("/api/analytics");
  expect(anon.status()).toBe(401);
  await login(page, DEMO.email, DEMO.password);
  const res = await page.request.get("/api/analytics?range=7d");
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.totals.views).toBeGreaterThan(0);
  expect(json.series).toHaveLength(7);
  expect(json.breakdowns).toBeNull();
});
