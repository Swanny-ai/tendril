import { expect, test } from "@playwright/test";
import { addPageView, addSmartLinkHit, closeDb, setPlanByUsername } from "./db";
import { DEMO, login, TEST_PASSWORD, uniqueName } from "./helpers";

test.afterAll(() => closeDb());

test("free plan sees combined totals for all pages and deep links, with breakdowns locked", async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);
  await page.goto("/dashboard/analytics");
  await expect(page.getByText("All bio pages and deep links · Bots")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Source" }).getByRole("link", { name: "All" })).toHaveAttribute("aria-current", "page");
  for (const label of [/^Views$/, /^Visitors/, /^Clicks$/, /^Click-through rate$/]) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
  await expect(page.getByText("Views and clicks", { exact: true })).toBeVisible();
  // Every bio page and deep link is listed in the "All" view
  const all = page.getByTestId("all-sources");
  await expect(all.getByRole("link", { name: "VIP page (Instagram bio)" })).toBeVisible();
  await expect(all.getByRole("link", { name: "Shop, no warning" })).toBeVisible();
  await expect(all.getByText("Bio page", { exact: true })).toBeVisible();
  await expect(page.getByText("See where your visitors come from")).toBeVisible();
  await expect(page.getByText("Visitors by platform")).toHaveCount(0);
  await expect(page.getByText("90d")).toBeVisible();
  await expect(page.getByRole("link", { name: "90d" })).toHaveCount(0);

  // A free user asking for a year gets clamped to 30 days
  await page.goto("/dashboard/analytics?range=365d");
  await expect(page.getByText(/^Last 30 days/)).toBeVisible();
});

test("the source filter narrows to one bio page or one deep link and keeps the range", async ({ page }) => {
  await login(page, DEMO.email, DEMO.password);
  await page.goto("/dashboard/analytics?range=7d");
  const sources = page.getByRole("navigation", { name: "Source" });

  await sources.getByRole("link", { name: "VIP page (Instagram bio)" }).click();
  await expect(page).toHaveURL(/source=.+&range=7d/);
  await expect(page.getByText(/\/l\/demo-vip · Bots/)).toBeVisible();
  await expect(page.getByText("Sent to destination").first()).toBeVisible();
  await expect(page.getByText("Confirmed 18+")).toBeVisible();
  await expect(page.getByText("Last 7 days")).toBeVisible();

  await sources.getByRole("link", { name: /\(bio page\)$/ }).click();
  await expect(page.getByRole("cell", { name: /Spring glaze collection/ })).toBeVisible();
  await expect(page.getByText("Warning pass-through")).toBeVisible();

  // Changing the range keeps the selected source
  await page.getByRole("navigation", { name: "Date range" }).getByRole("link", { name: "30d" }).click();
  await expect(page).toHaveURL(/source=.+&range=30d/);
  await expect(page.getByRole("cell", { name: /Spring glaze collection/ })).toBeVisible();

  await sources.getByRole("link", { name: "All" }).click();
  await expect(page).not.toHaveURL(/source=/);
  await expect(page.getByTestId("all-sources")).toBeVisible();
});

test("Pro sees visitors by platform across pages and deep links", async ({ page }) => {
  test.setTimeout(90_000);
  const name = uniqueName("plat");
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${name}@tendril.test`);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Username").fill(name);
  await expect(page.getByText("Available")).toBeVisible();
  await page.getByRole("button", { name: "Claim and continue" }).click();
  await expect(page).toHaveURL(/\/edit\/template\//);
  await setPlanByUsername(name, "PRO");
  await addPageView(name, "MA", "instagram-webview");
  await addPageView(name, "MA", "instagram-webview");
  await addPageView(name, "US", "safari");
  await addSmartLinkHit(name, `${name}-tt`, "TikTok promo", "tiktok-webview");

  const platforms = (p = page) => p.getByText("Visitors by platform").locator("..");
  await page.goto("/dashboard/analytics");
  await expect(platforms().locator("li", { hasText: "Instagram" })).toContainText("2");
  await expect(platforms().locator("li", { hasText: "Safari" })).toContainText("1");
  await expect(platforms().locator("li", { hasText: "TikTok" })).toContainText("1");
  await expect(page.getByTestId("all-sources").getByRole("link", { name: "TikTok promo" })).toBeVisible();

  // One deep link only counts its own visits
  await page.getByRole("navigation", { name: "Source" }).getByRole("link", { name: "TikTok promo" }).click();
  await expect(platforms().locator("li")).toHaveCount(1);
  await expect(platforms().locator("li", { hasText: "TikTok" })).toContainText("1");

  // One bio page only counts its own views
  await page.getByRole("navigation", { name: "Source" }).getByRole("link", { name: /\(bio page\)$/ }).click();
  await expect(platforms().locator("li")).toHaveCount(2);
  await expect(platforms().locator("li", { hasText: "Instagram" })).toContainText("2");
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
